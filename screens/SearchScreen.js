import { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet, Text, View, FlatList, Image, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentCoords, haversineKm, formatDistance } from '../services/location';
import GradientHeader from '../components/GradientHeader';
import PostDetail from '../components/PostDetail';
import SightingDetail from '../components/SightingDetail';
import FoundCatFlow from '../components/FoundCatFlow';
import CatCamera from '../components/CatCamera';
import { colors, radius, shadow, daysAgo } from '../theme';

// 🛠️ ฟังก์ชันช่วยแปลง Firestore Timestamp หรือ Date ให้เป็นวันที่อ่านง่าย (เช่น "02 มิ.ย. 2026")
const formatUploadDate = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = timestamp.toMillis ? new Date(timestamp.toMillis()) : new Date(timestamp);
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return '';
  }
};

export default function SearchScreen() {
  const [tab, setTab] = useState('found'); // found (คนเจอแมว) | lost (แมวหาย)
  const [mode, setMode] = useState('feed'); // feed | lostDetail | sightDetail | found
  const [lostPosts, setLostPosts] = useState([]);
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selLost, setSelLost] = useState(null);
  const [selSight, setSelSight] = useState(null);
  const [foundImageUri, setFoundImageUri] = useState(null);
  const [finderPhone, setFinderPhone] = useState('');
  const [showCamera, setShowCamera] = useState(false);

  // สถานะการเลือกรูปแบบจัดเรียงข้อมูล (Sorting State)
  const [sortByFound, setSortByFound] = useState('distance'); // distance (ใกล้ที่สุด) | newest (พบล่าสุด)
  const [sortByLost, setSortByLost] = useState('reward');    // reward (รางวัลสูงสุด) | distance (ใกล้ที่สุด) | newest (หายล่าสุด)

  const loadFeed = useCallback(async () => {
    try {
      const phone = await AsyncStorage.getItem('userPhone');
      setFinderPhone(phone || '');
      const userCoords = await getCurrentCoords();

      // 1. ดึงข้อมูล lost cats จาก Firestore
      const lostSnap = await getDocs(query(collection(db, 'cats'), where('status', '==', 'lost')));
      let lost = lostSnap.docs.map((d) => ({ id: d.id, ...d.data() })).map((c) => ({
        ...c,
        distanceKm: (userCoords && typeof c.lostLat === 'number')
          ? haversineKm(userCoords.lat, userCoords.lng, c.lostLat, c.lostLng) : null,
      }));
      setLostPosts(lost);

      // 2. ดึงข้อมูล sightings จาก Firestore
      const sightSnap = await getDocs(collection(db, 'sightings'));
      let sight = sightSnap.docs.map((d) => ({ id: d.id, ...d.data() })).map((s) => ({
        ...s,
        distanceKm: (userCoords && typeof s.foundLat === 'number')
          ? haversineKm(userCoords.lat, userCoords.lng, s.foundLat, s.foundLng) : null,
      }));
      setSightings(sight);
    } catch (e) { console.log('Feed error:', e); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { if (mode === 'feed') loadFeed(); }, [loadFeed, mode]));

  // คำนวณการเรียงลำดับแบบ Real-time ตามปุ่มที่กดเลือก
  const processedData = useMemo(() => {
    if (tab === 'found') {
      return [...sightings].sort((a, b) => {
        if (sortByFound === 'distance') {
          if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
          if (a.distanceKm != null) return -1;
          if (b.distanceKm != null) return 1;
        }
        return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
      });
    } else {
      return [...lostPosts].sort((a, b) => {
        if (sortByLost === 'reward') {
          const rA = Number(a.reward) || 0;
          const rB = Number(b.reward) || 0;
          if (rB !== rA) return rB - rA;
        }
        if (sortByLost === 'distance' || sortByLost === 'reward') {
          if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
          if (a.distanceKm != null) return -1;
          if (b.distanceKm != null) return 1;
        }
        return (b.lostAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0) - (a.lostAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0);
      });
    }
  }, [tab, sightings, lostPosts, sortByFound, sortByLost]);

  const onCameraCapture = (uri) => {
    setShowCamera(false);
    setFoundImageUri(uri);
    setMode('found');
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') { Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึงคลังรูปภาพ'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) { setFoundImageUri(result.assets[0].uri); setMode('found'); }
  };

  const back = () => { setMode('feed'); setSelLost(null); setSelSight(null); setFoundImageUri(null); };

  if (mode === 'lostDetail' && selLost) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }}><PostDetail cat={selLost} distanceKm={selLost.distanceKm} onBack={back} /></View>;
  }
  if (mode === 'sightDetail' && selSight) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }}><SightingDetail sighting={selSight} distanceKm={selSight.distanceKm} onBack={back} /></View>;
  }
  if (mode === 'found' && foundImageUri) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <GradientHeader title="ตามหาเจ้าของ" subtitle="เทียบกับโพสต์แมวหาย" emoji="🔍" onClose={back} />
        <FoundCatFlow foundImageUri={foundImageUri} lostCats={lostPosts} finderPhone={finderPhone} onBack={back} onPinnedDone={() => {}} />
      </View>
    );
  }

  // ===== RENDER: แมวที่คนเจอ =====
  const renderSighting = ({ item }) => {
    const isLost = item.confidence === 'lost';
    const dist = formatDistance(item.distanceKm);
    const dateString = formatUploadDate(item.createdAt); // แปลงวันที่อัปโหลด

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => { setSelSight(item); setMode('sightDetail'); }}>
        <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.cardImg} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.cardName}>เจอแมวสี{item.color}</Text>
            {dist && <View style={styles.distChip}><Ionicons name="navigate" size={12} color={colors.primary} /><Text style={styles.distText}>{dist}</Text></View>}
          </View>
          <View style={[styles.confBadge, { backgroundColor: isLost ? colors.lostSoft : colors.rewardSoft }]}>
            <Text style={[styles.confText, { color: isLost ? colors.lost : '#B8780A' }]}>
              {isLost ? 'มั่นใจว่าแมวหาย' : 'อาจเป็นจร/หาย'}
            </Text>
          </View>
          
          {/* 🗓️ บรรทัดแสดง ระยะเวลา และ วันที่อัปโหลดอัปเดตข้อมูล */}
          <View style={styles.timeInfoContainer}>
            <Ionicons name="calendar-outline" size={13} color={colors.faint || '#777'} />
            <Text style={styles.cardMeta}>
              เจอเมื่อ {daysAgo(item.createdAt)} {dateString ? `(${dateString})` : ''}
            </Text>
          </View>

          {item.matchedCatName ? <Text style={styles.matchHint}>🎯 คล้ายโพสต์ "{item.matchedCatName}"</Text> : null}
          <View style={styles.viewMore}><Text style={styles.viewMoreText}>ดูรายละเอียด</Text><Ionicons name="chevron-forward" size={15} color={colors.primary} /></View>
        </View>
      </TouchableOpacity>
    );
  };

  // ===== RENDER: แมวหาย =====
  const renderLost = ({ item }) => {
    const dist = formatDistance(item.distanceKm);
    const dateString = formatUploadDate(item.lostAt || item.createdAt); // แปลงวันที่หาย/อัปโหลด

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => { setSelLost(item); setMode('lostDetail'); }}>
        <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.cardImg} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.cardName}>{item.name}</Text>
            {dist && <View style={styles.distChip}><Ionicons name="navigate" size={12} color={colors.primary} /><Text style={styles.distText}>{dist}</Text></View>}
          </View>
          <Text style={styles.cardMetaSub}>สี{item.color}{item.breed ? ` • ${item.breed}` : ''}</Text>
          
          {/* 🗓️ บรรทัดแสดง ระยะเวลา และ วันที่อัปโหลดอัปเดตข้อมูล */}
          <View style={styles.timeInfoContainer}>
            <Ionicons name="time-outline" size={13} color={colors.lost || '#d9534f'} />
            <Text style={[styles.cardMeta, { color: colors.lost || '#d9534f', fontWeight: '600' }]}>
              หาย {daysAgo(item.lostAt)} {dateString ? `(${dateString})` : ''}
            </Text>
          </View>

          {item.reward > 0 && <View style={styles.rewardBadge}><Text style={styles.rewardText}>💰 รางวัล {Number(item.reward).toLocaleString()} บาท</Text></View>}
          {(item.lostNote || item.notes) ? <Text style={styles.noteText} numberOfLines={2}>{item.lostNote || item.notes}</Text> : null}
          <View style={styles.viewMore}><Text style={styles.viewMoreText}>ดูรายละเอียด</Text><Ionicons name="chevron-forward" size={15} color={colors.primary} /></View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientHeader title="ตามหาน้องแมว" emoji="🐾"
        subtitle={tab === 'found' ? `แมวที่คนเจอ ${sightings.length} ตัว` : `แมวหาย ${lostPosts.length} ตัว`} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={processedData}
          keyExtractor={(i) => i.id}
          renderItem={tab === 'found' ? renderSighting : renderLost}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFeed(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View>
              {/* camera CTA */}
              <TouchableOpacity style={styles.cta} activeOpacity={0.9} onPress={() => setShowCamera(true)}>
                <View style={styles.ctaIcon}><Ionicons name="camera" size={24} color="#fff" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ctaTitle}>เจอแมวจร? ถ่ายรูปเลย</Text>
                  <Text style={styles.ctaText}>ระบบช่วยเทียบหาเจ้าของ + ปักหมุดบนแผนที่</Text>
                </View>
                <TouchableOpacity style={styles.ctaGallery} onPress={pickFromGallery}>
                  <Ionicons name="images" size={20} color={colors.primary} />
                </TouchableOpacity>
              </TouchableOpacity>

              {/* tab switcher */}
              <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tabBtn, tab === 'found' && styles.tabActive]} onPress={() => setTab('found')}>
                  <Text style={[styles.tabText, tab === 'found' && styles.tabTextActive]}>เจอแมว</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, tab === 'lost' && styles.tabActive]} onPress={() => setTab('lost')}>
                  <Text style={[styles.tabText, tab === 'lost' && styles.tabTextActive]}> แมวหาย</Text>
                </TouchableOpacity>
              </View>

              {/* 💡 ส่วนแนะนำป้ายความต่าง (แสดงผลเฉพาะบนแท็บ "คนเจอแมว") */}
              {tab === 'found' && (
                <View style={styles.guideContainer}>
                  <View style={styles.guideTitleRow}>
                    <Ionicons name="information-circle-outline" size={16} color="#B8780A" />
                    <Text style={styles.guideTitle}>คำแนะนำความหมายของป้ายสถานะ</Text>
                  </View>
                  
                  <View style={styles.guideRow}>
                    <Text style={[styles.guideLabel, { color: colors.lost || '#d9534f' }]}>มั่นใจว่าแมวหาย :</Text>
                    <Text style={styles.guideDesc}>แมวมีปลอกคอ ตัวสะอาด เชื่องเข้าหาคน หรือมีท่าทางตื่นกลัวผิดปกติ คาดว่าเพิ่งหลุดออกจากบ้าน</Text>
                  </View>

                  <View style={styles.guideRow}>
                    <Text style={[styles.guideLabel, { color: '#B8780A' }]}>อาจเป็นจร/หาย :</Text>
                    <Text style={styles.guideDesc}>แมวไม่มีปลอกคอ ไม่คุ้นคน หรือเป็นแมวที่เห็นประจำในละแวกนั้น อาจเป็นแมวจรเจ้าถิ่นหรือแมวบ้านที่หลุดมานานจนมอมแมม</Text>
                  </View>
                </View>
              )}

              {/* ส่วนปุ่มควบคุมการจัดเรียงข้อมูล (Sorting Bar) */}
              <View style={styles.sortContainer}>
                <Text style={styles.sortTitle}>จัดเรียงตาม:</Text>
                <View style={styles.sortOptions}>
                  {tab === 'found' ? (
                    <>
                      <TouchableOpacity 
                        style={[styles.sortChip, sortByFound === 'distance' && styles.sortChipActive]} 
                        onPress={() => setSortByFound('distance')}
                      >
                        <Ionicons name="location-outline" size={13} color={sortByFound === 'distance' ? '#fff' : colors.sub} />
                        <Text style={[styles.sortChipText, sortByFound === 'distance' && styles.sortChipTextActive]}>ใกล้ที่สุด</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.sortChip, sortByFound === 'newest' && styles.sortChipActive]} 
                        onPress={() => setSortByFound('newest')}
                      >
                        <Ionicons name="time-outline" size={13} color={sortByFound === 'newest' ? '#fff' : colors.sub} />
                        <Text style={[styles.sortChipText, sortByFound === 'newest' && styles.sortChipTextActive]}>พบล่าสุด</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity 
                        style={[styles.sortChip, sortByLost === 'reward' && styles.sortChipActive]} 
                        onPress={() => setSortByLost('reward')}
                      >
                        <Ionicons name="cash-outline" size={13} color={sortByLost === 'reward' ? '#fff' : colors.sub} />
                        <Text style={[styles.sortChipText, sortByLost === 'reward' && styles.sortChipTextActive]}>รางวัลสูงสุด</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.sortChip, sortByLost === 'distance' && styles.sortChipActive]} 
                        onPress={() => setSortByLost('distance')}
                      >
                        <Ionicons name="location-outline" size={13} color={sortByLost === 'distance' ? '#fff' : colors.sub} />
                        <Text style={[styles.sortChipText, sortByLost === 'distance' && styles.sortChipTextActive]}>ใกล้ที่สุด</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.sortChip, sortByLost === 'newest' && styles.sortChipActive]} 
                        onPress={() => setSortByLost('newest')}
                      >
                        <Ionicons name="time-outline" size={13} color={sortByLost === 'newest' ? '#fff' : colors.sub} />
                        <Text style={[styles.sortChipText, sortByLost === 'newest' && styles.sortChipTextActive]}>หายล่าสุด</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 52 }}>{tab === 'found' ? '🔍' : '🎉'}</Text>
              <Text style={styles.emptyTitle}>{tab === 'found' ? 'ยังไม่มีคนเจอแมว' : 'ตอนนี้ไม่มีแมวหาย'}</Text>
              <Text style={styles.emptyText}>{tab === 'found' ? 'ถ้าคุณเจอแมวจร ถ่ายรูปด้านบนได้เลย' : 'ทุกตัวอยู่บ้านปลอดภัยดี'}</Text>
            </View>
          }
        />
      )}

      {/* กล้องในแอป + กรอบเล็งหน้าแมว */}
      <CatCamera visible={showCamera} onClose={() => setShowCamera(false)} onCapture={onCameraCapture} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  cta: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, ...shadow },
  ctaIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  ctaText: { fontSize: 12.5, color: colors.sub, marginTop: 3, lineHeight: 17 },
  ctaGallery: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },

  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.full, padding: 5, marginTop: 16, marginBottom: 4, ...shadow },
  tabBtn: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: colors.sub },
  tabTextActive: { color: '#fff' },

  sortContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 2, paddingHorizontal: 4 },
  sortTitle: { fontSize: 13, fontWeight: '700', color: colors.faint || '#777', marginRight: 8 },
  sortOptions: { flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' },
  sortChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border || '#e0e0e0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  sortChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortChipText: { fontSize: 12, fontWeight: '600', color: colors.sub },
  sortChipTextActive: { color: '#fff', fontWeight: '700' },

  card: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, marginTop: 14, overflow: 'hidden', ...shadow },
  cardImg: { width: 116, minHeight: 160, backgroundColor: '#eee' },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 },
  distChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full },
  distText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  confBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, marginTop: 7 },
  confText: { fontWeight: '700', fontSize: 12.5 },
  
  // 🛠️ สไตล์สำหรับกลุ่มข้อมูลเวลารูปแบบใหม่
  timeInfoContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  cardMeta: { fontSize: 12.5, color: colors.sub || '#666' },
  cardMetaSub: { fontSize: 13, color: colors.faint || '#555', marginTop: 6 },
  
  matchHint: { fontSize: 12.5, fontWeight: '700', color: colors.home, marginTop: 6 },
  rewardBadge: { alignSelf: 'flex-start', backgroundColor: colors.rewardSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, marginTop: 8 },
  rewardText: { color: colors.reward, fontWeight: '700', fontSize: 12.5 },
  noteText: { fontSize: 12.5, color: colors.faint, marginTop: 8, lineHeight: 18 },
  viewMore: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 10 },
  viewMoreText: { color: colors.primary, fontWeight: '700', fontSize: 13 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 10 },
  emptyText: { fontSize: 14, color: colors.sub, marginTop: 6, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 },

  // 💡 สไตล์ที่เพิ่มมาใหม่สำหรับกล่องแนะนำความหมายของป้ายสถานะ
  guideContainer: {
    backgroundColor: '#FFF9F0', 
    borderWidth: 1,
    borderColor: '#FFE0B2',
    borderRadius: radius.md || 12,
    padding: 12,
    marginTop: 14,
    marginBottom: 2,
  },
  guideTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  guideTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#B8780A',
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 5,
  },
  guideLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    minWidth: 95,
  },
  guideDesc: {
    flex: 1,
    fontSize: 12.5,
    color: '#555',
    lineHeight: 17,
  },
});
