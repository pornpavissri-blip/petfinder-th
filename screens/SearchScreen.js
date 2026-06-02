import { useState, useCallback } from 'react';
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

const byDistance = (a, b) => {
  if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
  if (a.distanceKm != null) return -1;
  if (b.distanceKm != null) return 1;
  return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
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

  const loadFeed = useCallback(async () => {
    try {
      const phone = await AsyncStorage.getItem('userPhone');
      setFinderPhone(phone || '');
      const userCoords = await getCurrentCoords();

      // lost cats
      const lostSnap = await getDocs(query(collection(db, 'cats'), where('status', '==', 'lost')));
      let lost = lostSnap.docs.map((d) => ({ id: d.id, ...d.data() })).map((c) => ({
        ...c,
        distanceKm: (userCoords && typeof c.lostLat === 'number')
          ? haversineKm(userCoords.lat, userCoords.lng, c.lostLat, c.lostLng) : null,
      }));
      lost.sort(byDistance);
      setLostPosts(lost);

      // sightings (found-cat posts)
      const sightSnap = await getDocs(collection(db, 'sightings'));
      let sight = sightSnap.docs.map((d) => ({ id: d.id, ...d.data() })).map((s) => ({
        ...s,
        distanceKm: (userCoords && typeof s.foundLat === 'number')
          ? haversineKm(userCoords.lat, userCoords.lng, s.foundLat, s.foundLng) : null,
      }));
      sight.sort(byDistance);
      setSightings(sight);
    } catch (e) { console.log('Feed error:', e); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { if (mode === 'feed') loadFeed(); }, [loadFeed, mode]));

  // กล้องในแอป (กรอบเล็งหน้าแมว)
  const onCameraCapture = (uri) => {
    setShowCamera(false);
    setFoundImageUri(uri);
    setMode('found');
  };

  // เลือกรูปจากคลังภาพ
  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') { Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึงคลังรูปภาพ'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) { setFoundImageUri(result.assets[0].uri); setMode('found'); }
  };

  const back = () => { setMode('feed'); setSelLost(null); setSelSight(null); setFoundImageUri(null); };

  // ===== DETAIL: lost post =====
  if (mode === 'lostDetail' && selLost) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }}><PostDetail cat={selLost} distanceKm={selLost.distanceKm} onBack={back} /></View>;
  }
  // ===== DETAIL: sighting =====
  if (mode === 'sightDetail' && selSight) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }}><SightingDetail sighting={selSight} distanceKm={selSight.distanceKm} onBack={back} /></View>;
  }
  // ===== FOUND flow =====
  if (mode === 'found' && foundImageUri) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <GradientHeader title="ตามหาเจ้าของ" subtitle="เทียบกับโพสต์แมวหาย" emoji="🔍" onClose={back} />
        <FoundCatFlow foundImageUri={foundImageUri} lostCats={lostPosts} finderPhone={finderPhone} onBack={back} onPinnedDone={() => {}} />
      </View>
    );
  }

  // ===== FEED =====
  const data = tab === 'found' ? sightings : lostPosts;

  const renderSighting = ({ item }) => {
    const isLost = item.confidence === 'lost';
    const dist = formatDistance(item.distanceKm);
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
              {isLost ? '🔴 มั่นใจว่าแมวหาย' : '🟡 อาจเป็นจร/หาย'}
            </Text>
          </View>
          <Text style={styles.cardMeta}>เจอเมื่อ {daysAgo(item.createdAt)}</Text>
          {item.matchedCatName ? <Text style={styles.matchHint}>🎯 คล้ายโพสต์ "{item.matchedCatName}"</Text> : null}
          <View style={styles.viewMore}><Text style={styles.viewMoreText}>ดูรายละเอียด</Text><Ionicons name="chevron-forward" size={15} color={colors.primary} /></View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLost = ({ item }) => {
    const dist = formatDistance(item.distanceKm);
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => { setSelLost(item); setMode('lostDetail'); }}>
        <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.cardImg} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.cardName}>{item.name}</Text>
            {dist && <View style={styles.distChip}><Ionicons name="navigate" size={12} color={colors.primary} /><Text style={styles.distText}>{dist}</Text></View>}
          </View>
          <Text style={styles.cardMeta}>สี{item.color}{item.breed ? ` • ${item.breed}` : ''} • หาย {daysAgo(item.lostAt)}</Text>
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
          data={data}
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
                  <Text style={[styles.tabText, tab === 'found' && styles.tabTextActive]}>🔵 แมวที่คนเจอ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, tab === 'lost' && styles.tabActive]} onPress={() => setTab('lost')}>
                  <Text style={[styles.tabText, tab === 'lost' && styles.tabTextActive]}>🔴 แมวหาย</Text>
                </TouchableOpacity>
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

  card: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, marginTop: 14, overflow: 'hidden', ...shadow },
  cardImg: { width: 116, minHeight: 150, backgroundColor: '#eee' },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 },
  distChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full },
  distText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  confBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, marginTop: 7 },
  confText: { fontWeight: '700', fontSize: 12.5 },
  cardMeta: { fontSize: 12.5, color: colors.sub, marginTop: 7 },
  matchHint: { fontSize: 12.5, fontWeight: '700', color: colors.home, marginTop: 6 },
  rewardBadge: { alignSelf: 'flex-start', backgroundColor: colors.rewardSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, marginTop: 8 },
  rewardText: { color: colors.reward, fontWeight: '700', fontSize: 12.5 },
  noteText: { fontSize: 12.5, color: colors.faint, marginTop: 8, lineHeight: 18 },
  viewMore: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 10 },
  viewMoreText: { color: colors.primary, fontWeight: '700', fontSize: 13 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 10 },
  emptyText: { fontSize: 14, color: colors.sub, marginTop: 6, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 },
});