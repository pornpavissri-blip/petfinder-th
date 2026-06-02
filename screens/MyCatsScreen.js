import { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, Image, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import GradientHeader from '../components/GradientHeader';
import AddCatForm from '../components/AddCatForm';
import ReportLostForm from '../components/ReportLostForm';
import { colors, radius, shadow, statusInfo } from '../theme';

export default function MyCatsScreen() {
  const [showForm, setShowForm] = useState(false);
  const [reportLostCat, setReportLostCat] = useState(null);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCats = useCallback(async () => {
    try {
      const phone = await AsyncStorage.getItem('userPhone');
      if (!phone) { setLoading(false); return; }
      const q = query(collection(db, 'cats'), where('ownerPhone', '==', phone));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setCats(data);
    } catch (e) { console.log('Fetch error:', e); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchCats(); }, [fetchCats]));

  const markHome = (cat) => {
    Alert.alert('ยืนยัน', `น้อง "${cat.name}" กลับบ้านแล้ว?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'กลับบ้านแล้ว',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'cats', cat.id), {
              status: 'home', lostAt: null, lostLat: null, lostLng: null, reward: 0, lostNote: '',
            });
            fetchCats();
          } catch (e) { Alert.alert('ผิดพลาด', 'ลองใหม่อีกครั้ง'); }
        },
      },
    ]);
  };

  // ---- Add form ----
  if (showForm) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <GradientHeader title="เพิ่มน้องแมว" subtitle="ลงทะเบียนเพื่อให้ตามหาได้ง่าย" emoji="🐾" onClose={() => setShowForm(false)} />
        <AddCatForm onAdded={() => { setShowForm(false); fetchCats(); }} />
      </View>
    );
  }

  // ---- Report lost form ----
  if (reportLostCat) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <GradientHeader title="แจ้งแมวหาย" subtitle="ลงประกาศตามหาน้อง" emoji="🔴" onClose={() => setReportLostCat(null)} />
        <ReportLostForm cat={reportLostCat} onDone={() => { setReportLostCat(null); fetchCats(); }} />
      </View>
    );
  }

  const lostCount = cats.filter((c) => c.status === 'lost').length;

  const renderCat = ({ item }) => {
    const s = statusInfo(item.status);
    const isLost = item.status === 'lost';
    return (
      <View style={styles.card}>
        <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.catImage} />
        <View style={styles.catBody}>
          <View style={styles.catTop}>
            <Text style={styles.catName}>{item.name}</Text>
            <View style={[styles.badge, { backgroundColor: s.soft }]}>
              <Ionicons name={s.icon} size={13} color={s.color} />
              <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
            </View>
          </View>
          <Text style={styles.catMeta}>สี{item.color}{item.breed ? ` • ${item.breed}` : ''}{item.age ? ` • ${item.age}` : ''}{item.sex === 'ผู้' ? ' • ♂ ผู้' : item.sex === 'เมีย' ? ' • ♀ เมีย' : ''}</Text>
          {isLost && item.reward > 0 && (
            <Text style={styles.rewardLine}>💰 รางวัล {Number(item.reward).toLocaleString()} บาท</Text>
          )}
          {item.notes ? <Text style={styles.catNotes} numberOfLines={2}>{item.notes}</Text> : null}

          <TouchableOpacity
            style={[styles.toggle, isLost ? styles.toggleHome : styles.toggleLost]}
            onPress={() => (isLost ? markHome(item) : setReportLostCat(item))}
            activeOpacity={0.85}
          >
            <Ionicons name={isLost ? 'home' : 'megaphone'} size={16} color={isLost ? colors.home : colors.lost} />
            <Text style={[styles.toggleText, { color: isLost ? colors.home : colors.lost }]}>
              {isLost ? 'น้องกลับบ้านแล้ว' : 'แจ้งว่าน้องหาย'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientHeader title="แมวของฉัน" emoji="🐱"
        subtitle={cats.length ? `${cats.length} ตัว${lostCount ? ` • หายอยู่ ${lostCount}` : ''}` : 'ยังไม่มีน้องแมว'} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : cats.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🐈</Text>
          <Text style={styles.emptyTitle}>ยังไม่มีน้องแมว</Text>
          <Text style={styles.emptyText}>เพิ่มน้องแมวของคุณ เพื่อให้ตามหาได้เมื่อพลัดหลง</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowForm(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color="#fff" /><Text style={styles.emptyBtnText}>เพิ่มน้องแมว</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cats} keyExtractor={(i) => i.id} renderItem={renderCat}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCats(); }} tintColor={colors.primary} />}
        />
      )}

      {cats.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.9}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: 14, overflow: 'hidden', ...shadow },
  catImage: { width: 120, minHeight: 150, backgroundColor: '#eee' },
  catBody: { flex: 1, padding: 14 },
  catTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catName: { fontSize: 19, fontWeight: '800', color: colors.text, flex: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.full },
  badgeText: { fontSize: 12, fontWeight: '700' },
  catMeta: { fontSize: 13, color: colors.sub, marginTop: 5 },
  rewardLine: { fontSize: 13, fontWeight: '700', color: colors.reward, marginTop: 6 },
  catNotes: { fontSize: 12.5, color: colors.faint, marginTop: 6, lineHeight: 18 },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, height: 42, borderRadius: radius.md },
  toggleLost: { backgroundColor: colors.lostSoft },
  toggleHome: { backgroundColor: colors.homeSoft },
  toggleText: { fontWeight: '700', fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 72, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  emptyText: { fontSize: 14, color: colors.sub, textAlign: 'center', marginTop: 8, lineHeight: 21, marginBottom: 24 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 24, height: 52, borderRadius: radius.full },
  emptyBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow },
});