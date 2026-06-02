import { useState, useCallback } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator, Modal, Linking, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import GradientHeader from '../components/GradientHeader';
import { colors, radius, shadow } from '../theme';

const DEFAULT_REGION = { latitude: 14.9799, longitude: 102.0978, latitudeDelta: 0.12, longitudeDelta: 0.12 };

function pinColor(color) {
  return color === colors.warn ? 'orange' : 'red';
}

export default function MapScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [myPhone, setMyPhone] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const phone = await AsyncStorage.getItem('userPhone');
      setMyPhone(phone || '');

      const list = [];
      const lostSnap = await getDocs(query(collection(db, 'cats'), where('status', '==', 'lost')));
      lostSnap.docs.forEach((d) => {
        const c = d.data();
        if (typeof c.lostLat === 'number') {
          list.push({ key: `lost-${d.id}`, docId: d.id, lat: c.lostLat, lng: c.lostLng, color: colors.lost, image: c.imageBase64, kind: 'lost', title: c.name, sub: `แมวหาย • สี${c.color}${c.sex === 'ผู้' ? ' • ♂' : c.sex === 'เมีย' ? ' • ♀' : ''}`, reward: c.reward, note: c.lostNote || c.notes, phone: c.ownerPhone, role: 'เจ้าของ' });
        }
      });
      const sightSnap = await getDocs(collection(db, 'sightings'));
      sightSnap.docs.forEach((d) => {
        const s = d.data();
        if (typeof s.foundLat === 'number') {
          const sure = s.confidence === 'lost';
          list.push({ key: `sight-${d.id}`, docId: d.id, lat: s.foundLat, lng: s.foundLng, color: sure ? colors.lost : colors.warn, image: s.imageBase64, kind: 'sight', title: 'มีคนเจอแมว', sub: `สี${s.color} • ${sure ? 'มั่นใจว่าแมวหาย' : 'อาจเป็นจร/หาย'}`, matchedCatName: s.matchedCatName, phone: s.finderPhone, role: 'คนที่เจอ' });
        }
      });
      setItems(list);
    } catch (e) { console.log('Map fetch error:', e); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); setSelected(null); }, [fetchData]));

  const call = (phone) => {
    if (!phone) return;
    Alert.alert('โทรออก', `โทรหา ${phone} ?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'โทร', onPress: () => Linking.openURL(`tel:${phone}`) },
    ]);
  };

  // ลบหมุดที่ผู้ใช้ปักเอง (เฉพาะหมุด "คนเจอแมว" ของตัวเอง)
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
        subtitle={items.length ? `${items.length} จุด • แตะหมุดเพื่อดูรายละเอียด` : 'ตำแหน่งแมวหาย & คนเจอ'} />

      <View style={styles.mapWrap}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <>
            <MapView style={StyleSheet.absoluteFill} initialRegion={DEFAULT_REGION}>
              {items.map((m) => (
                <Marker key={m.key} coordinate={{ latitude: m.lat, longitude: m.lng }} pinColor={pinColor(m.color)} onPress={() => setSelected(m)} />
              ))}
            </MapView>

            <View style={styles.legend}>
              <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.lost }]} /><Text style={styles.legendText}>แมวหาย</Text></View>
              <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.warn }]} /><Text style={styles.legendText}>อาจเป็นจร/หาย</Text></View>
            </View>

            {items.length === 0 && (
              <View style={styles.emptyOverlay}>
                <View style={styles.emptyCard}>
                  <Ionicons name="location-outline" size={40} color={colors.primary} />
                  <Text style={styles.emptyTitle}>ยังไม่มีหมุด</Text>
                  <Text style={styles.emptyText}>แจ้งแมวหาย ถ่ายรูปแมวที่เจอ{'\n'}หรือกด "สร้างแมวหายจำลอง" ในหน้าโปรไฟล์</Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>

      {/* popup กลางจอ + พื้นหลังมืด */}
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
                  {selected.reward > 0 && <Text style={styles.modalReward}>💰 รางวัล {Number(selected.reward).toLocaleString()} บาท</Text>}
                  {selected.matchedCatName && <Text style={styles.modalMatch}>🎯 คล้ายโพสต์: {selected.matchedCatName}</Text>}
                  {selected.note ? <Text style={styles.modalNote}>{selected.note}</Text> : null}

                  <TouchableOpacity style={styles.modalCall} onPress={() => call(selected.phone)}>
                    <Ionicons name="call" size={18} color="#fff" />
                    <Text style={styles.modalCallText}>โทรหา{selected.role} {selected.phone}</Text>
                  </TouchableOpacity>

                  {/* ลบได้เฉพาะหมุดคนเจอที่เราปักเอง */}
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
  modalReward: { fontSize: 15, fontWeight: '700', color: colors.reward, marginTop: 10 },
  modalMatch: { fontSize: 14, fontWeight: '700', color: colors.home, marginTop: 8 },
  modalNote: { fontSize: 14, color: colors.sub, marginTop: 10, lineHeight: 21 },
  modalCall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, height: 52, borderRadius: radius.md, marginTop: 18 },
  modalCallText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  modalDelete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46, borderRadius: radius.md, marginTop: 10, backgroundColor: colors.lostSoft },
  modalDeleteText: { color: colors.lost, fontWeight: '800', fontSize: 14.5 },

  emptyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(246,247,251,0.6)' },
  emptyCard: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 28, alignItems: 'center', marginHorizontal: 40, ...shadow },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 10 },
  emptyText: { fontSize: 13.5, color: colors.sub, marginTop: 6, textAlign: 'center', lineHeight: 20 },
});