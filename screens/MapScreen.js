import { useState, useCallback } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator, Modal, Linking, Alert, Platform } from 'react-native'; // เพิ่ม Platform เข้ามาช่วยเช็กระบบปฏิบัติการ
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import GradientHeader from '../components/GradientHeader';
import { colors, radius, shadow } from '../theme';

const DEFAULT_REGION = { latitude: 14.9799, longitude: 102.0978, latitudeDelta: 0.12, longitudeDelta: 0.12 };

function formatTimestamp(timestamp) {
  if (!timestamp) return 'ไม่ระบุเวลา';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }) + ' น.';
}

export default function MapScreen() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [myPhone, setMyPhone] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const phone = await AsyncStorage.getItem('userPhone');
      setMyPhone(phone || '');

      const list = [];
      const lostSnap = await getDocs(query(collection(db, 'cats'), where('status', '==', 'lost')));
      lostSnap.docs.forEach((d) => {
        const c = d.data();
        if (typeof c.lostLat === 'number') {
          list.push({ 
            key: `lost-${d.id}`, 
            docId: d.id, 
            lat: c.lostLat, 
            lng: c.lostLng, 
            color: colors.lost, 
            image: c.imageBase64, 
            kind: 'lost', 
            title: c.name, 
            sub: `แมวหาย • สี${c.color}${c.sex === 'ผู้' ? ' • ♂' : c.sex === 'เมีย' ? ' • ♀' : ''}`, 
            reward: c.reward, 
            note: c.lostNote || c.notes, 
            phone: c.ownerPhone, 
            role: 'เจ้าของ',
            createdAt: c.createdAt
          });
        }
      });
      
      const sightSnap = await getDocs(collection(db, 'sightings'));
      sightSnap.docs.forEach((d) => {
        const s = d.data();
        if (typeof s.foundLat === 'number') {
          const sure = s.confidence === 'lost';
          list.push({ 
            key: `sight-${d.id}`, 
            docId: d.id, 
            lat: s.foundLat, 
            lng: s.foundLng, 
            color: sure ? colors.lost : colors.warn, 
            image: s.imageBase64, 
            kind: 'sight', 
            title: 'มีคนเจอแมว', 
            sub: `สี${s.color} • ${sure ? 'มั่นใจว่าแมวหาย' : 'อาจเป็นจร/หาย'}`, 
            matchedCatName: s.matchedCatName, 
            phone: s.finderPhone, 
            role: 'คนที่เจอ',
            createdAt: s.createdAt
          });
        }
      });

      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      setItems(list);
      applyFilter(list, activeFilter);
    } catch (e) { console.log('Map fetch error:', e); }
    setLoading(false);
  }, [activeFilter]);

  const applyFilter = (allValues, filterType) => {
    if (filterType === 'all') {
      setFilteredItems(allValues);
    } else {
      setFilteredItems(allValues.filter(item => item.kind === filterType));
    }
  };

  const handleFilterChange = (type) => {
    setActiveFilter(type);
    applyFilter(items, type);
  };

  useFocusEffect(useCallback(() => { fetchData(); setSelected(null); }, [fetchData]));

  const call = (phone) => {
    if (!phone) return;
    Alert.alert('โทรออก', `โทรหา ${phone} ?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'โทร', onPress: () => Linking.openURL(`tel:${phone}`) },
    ]);
  };

  // 🔥 ฟังก์ชันสำหรับเปิดแอปแผนที่ภายนอกเพื่อนำทางไปยังจุดที่เลือก
  const navigateToLocation = (lat, lng, label) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      Alert.alert('ผิดพลาด', 'ไม่พบพิกัดของหมุดนี้');
      return;
    }
    
    // แยก URL Scheme ตามระบบปฏิบัติการ (iOS ใช้ Apple Maps, Android ใช้ Google Maps)
    const scheme = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}(${label})`,
      android: `geo:0,0?q=${lat},${lng}(${label})`
    });

    const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    Linking.canOpenURL(scheme)
      .then((supported) => {
        if (supported) {
          Linking.openURL(scheme);
        } else {
          // หากเปิดแบบแอปบนเครื่องไม่ได้ ให้เปิดเว็บเบราว์เซอร์แทนเป็น Fallback
          Linking.openURL(webUrl);
        }
      })
      .catch((err) => console.error('An error occurred', err));
  };

  const deleteSighting = (item) => {
    Alert.alert('ลบหมุดนี้?', 'หมุดแมวที่คุณปักไว้จะถูกลบออกจากแผนที่ถาวร', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'sightings', item.docId));
            setSelected(null);
            fetchData();
          } catch (e) {
            console.log('Delete sighting error:', e);
            Alert.alert('ผิดพลาด', 'ลบไม่สำเร็จ ลองใหม่อีกครั้ง');
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientHeader title="แผนที่" emoji="🗺️"
        subtitle={filteredItems.length ? `${filteredItems.length} จุด • แตะหมุดเพื่อดูรายละเอียด` : 'ตำแหน่งแมวหาย & คนเจอ'} />

      <View style={styles.filterBar}>
        <TouchableOpacity 
          style={[styles.filterButton, activeFilter === 'all' && styles.filterActive]} 
          onPress={() => handleFilterChange('all')}
        >
          <Text style={[styles.filterButtonText, activeFilter === 'all' && styles.filterActiveText]}>ทั้งหมด</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, activeFilter === 'lost' && { backgroundColor: activeFilter === 'lost' ? colors.lost : '#fff' }]} 
          onPress={() => handleFilterChange('lost')}
        >
          <Text style={[styles.filterButtonText, activeFilter === 'lost' && styles.filterActiveText]}>ตามหาเจ้าของ</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, activeFilter === 'sight' && { backgroundColor: activeFilter === 'sight' ? colors.warn : '#fff' }]} 
          onPress={() => handleFilterChange('sight')}
        >
          <Text style={[styles.filterButtonText, activeFilter === 'sight' && styles.filterActiveText]}>แจ้งพบเบาะแส</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapWrap}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <>
            <MapView style={StyleSheet.absoluteFill} initialRegion={DEFAULT_REGION}>
              {filteredItems.map((m) => (
                <Marker 
                  key={m.key} 
                  coordinate={{ latitude: m.lat, longitude: m.lng }} 
                  onPress={() => setSelected(m)}
                >
                  <View style={[styles.customMarker, { borderColor: m.kind === 'lost' ? colors.lost : colors.warn }]}>
                    {m.image ? (
                      <Image source={{ uri: `data:image/jpeg;base64,${m.image}` }} style={styles.markerImage} />
                    ) : (
                      <Ionicons name="paw" size={16} color="#fff" />
                    )}
                    <View style={[styles.markerArrow, { borderTopColor: m.kind === 'lost' ? colors.lost : colors.warn }]} />
                  </View>
                </Marker>
              ))}
            </MapView>

            <View style={styles.legend}>
              <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.lost }]} /><Text style={styles.legendText}>แมวหาย</Text></View>
              <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.warn }]} /><Text style={styles.legendText}>อาจเป็นจร/หาย</Text></View>
            </View>

            {filteredItems.length === 0 && (
              <View style={styles.emptyOverlay}>
                <View style={styles.emptyCard}>
                  <Ionicons name="location-outline" size={40} color={colors.primary} />
                  <Text style={styles.emptyTitle}>ไม่พบหมุดที่ค้นหา</Text>
                  <Text style={styles.emptyText}>ลองเปลี่ยนประเภทการคัดกรอง{'\n'}หรือสร้างข้อมูลจำลองในระบบ</Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setSelected(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalCard} onPress={() => {}}>
            {selected && (
              <>
                <View style={styles.modalImgWrap}>
                  <Image source={{ uri: `data:image/jpeg;base64,${selected.image}` }} style={styles.modalImg} resizeMode="cover" />
                  <TouchableOpacity style={styles.modalClose} onPress={() => setSelected(null)}>
                    <Ionicons name="close" size={22} color="#fff" />
                  </TouchableOpacity>
                  <View style={[styles.modalTag, { backgroundColor: selected.color === colors.warn ? colors.warn : colors.lost }]}>
                    <Ionicons name={selected.kind === 'sight' ? 'camera' : 'alert-circle'} size={13} color="#fff" />
                    <Text style={styles.modalTagText}>{selected.kind === 'sight' ? 'มีคนเจอ' : 'แมวหาย'}</Text>
                  </View>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.modalTitle}>{selected.title}</Text>
                  <Text style={styles.modalSub}>{selected.sub}</Text>
                  
                  <View style={styles.timeWrap}>
                    <Ionicons name="time-outline" size={14} color={colors.sub} />
                    <Text style={styles.modalTimeText}>อัปโหลดเมื่อ: {formatTimestamp(selected.createdAt)}</Text>
                  </View>

                  {selected.reward > 0 && <Text style={styles.modalReward}>💰 รางวัล {Number(selected.reward).toLocaleString()} บาท</Text>}
                  {selected.matchedCatName && <Text style={styles.modalMatch}>🎯 คล้ายโพสต์: {selected.matchedCatName}</Text>}
                  {selected.note ? <Text style={styles.modalNote}>{selected.note}</Text> : null}

                  {/* แผงปุ่มแอ็กชัน (โทรออก & นำทาง) */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.modalCall, { flex: 1.2 }]} onPress={() => call(selected.phone)}>
                      <Ionicons name="call" size={18} color="#fff" />
                      <Text style={styles.modalCallText} numberOfLines={1}>โทรหา{selected.role}</Text>
                    </TouchableOpacity>

                    {/* 🔥 เพิ่มปุ่ม "นำทางไปจุดนี้" เคียงข้างปุ่มโทร */}
                    <TouchableOpacity 
                      style={[styles.modalNavigate, { flex: 1, backgroundColor: selected.kind === 'lost' ? colors.lostSoft : colors.warnSoft }]} 
                      onPress={() => navigateToLocation(selected.lat, selected.lng, selected.title)}
                    >
                      <Ionicons name="navigate-circle-outline" size={20} color={selected.kind === 'lost' ? colors.lost : colors.warn} />
                      <Text style={[styles.modalNavigateText, { color: selected.kind === 'lost' ? colors.lost : colors.warn }]}>นำทางไปจุดนี้</Text>
                    </TouchableOpacity>
                  </View>

                  {selected.kind === 'sight' && selected.phone === myPhone && (
                    <TouchableOpacity style={styles.modalDelete} onPress={() => deleteSighting(selected)}>
                      <Ionicons name="trash-outline" size={17} color={colors.lost} />
                      <Text style={styles.modalDeleteText}>ลบหมุดนี้</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  filterBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterButton: { flex: 1, height: 38, borderRadius: radius.md, backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e4e6eb' },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterButtonText: { fontSize: 13, fontWeight: '700', color: colors.text },
  filterActiveText: { color: '#fff' },

  customMarker: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', position: 'relative', ...shadow },
  markerImage: { width: '100%', height: '100%', borderRadius: 19 },
  markerArrow: { position: 'absolute', bottom: -8, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent' },

  mapWrap: { flex: 1, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  legend: { position: 'absolute', top: 14, right: 14, backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14, gap: 8, ...shadow },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12.5, fontWeight: '600', color: colors.text },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: radius.xl, overflow: 'hidden', ...shadow },
  modalImgWrap: { position: 'relative' },
  modalImg: { width: '100%', height: 230, backgroundColor: '#eee' },
  modalClose: { position: 'absolute', top: 12, right: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalTag: { position: 'absolute', bottom: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  modalTagText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  modalBody: { padding: 20 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  modalSub: { fontSize: 15, color: colors.sub, marginTop: 5 },
  
  timeWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  modalTimeText: { fontSize: 12.5, color: colors.sub },

  modalReward: { fontSize: 15, fontWeight: '700', color: colors.reward, marginTop: 10 },
  modalMatch: { fontSize: 14, fontWeight: '700', color: colors.home, marginTop: 8 },
  modalNote: { fontSize: 14, color: colors.sub, marginTop: 10, lineHeight: 21 },
  
  // ปรับการจัดวางปุ่มให้อยู่บรรทัดเดียวกัน
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, height: 52, borderRadius: radius.md },
  modalCallText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  
  // สไตล์ปุ่มนำทางภายนอก
  modalNavigate: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  modalNavigateText: { fontWeight: '800', fontSize: 14 },

  modalDelete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46, borderRadius: radius.md, marginTop: 10, backgroundColor: colors.lostSoft },
  modalDeleteText: { color: colors.lost, fontWeight: '800', fontSize: 14.5 },

  emptyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(246,247,251,0.6)' },
  emptyCard: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 28, alignItems: 'center', marginHorizontal: 40, ...shadow },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 10 },
  emptyText: { fontSize: 13.5, color: colors.sub, marginTop: 6, textAlign: 'center', lineHeight: 20 },
});