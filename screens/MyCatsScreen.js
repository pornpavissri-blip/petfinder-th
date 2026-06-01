import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, Image, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import GradientHeader from '../components/GradientHeader';
import AddCatForm from '../components/AddCatForm';
import { colors, radius, shadow, statusInfo } from '../theme';

export default function MyCatsScreen() {
  const [showForm, setShowForm] = useState(false);
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
    } catch (e) {
      console.log('Fetch error:', e);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchCats(); }, [fetchCats]));

  const onRefresh = () => { setRefreshing(true); fetchCats(); };

  const toggleLost = (cat) => {
    const newStatus = cat.status === 'lost' ? 'home' : 'lost';
    const action = newStatus === 'lost' ? 'แจ้งว่าหาย' : 'แจ้งว่ากลับบ้านแล้ว';
    Alert.alert(`ยืนยัน`, `${action} น้อง "${cat.name}" ?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ยืนยัน',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'cats', cat.id), {
              status: newStatus,
              lostAt: newStatus === 'lost' ? serverTimestamp() : null,
            });
            fetchCats();
          } catch (e) {
            Alert.alert('ผิดพลาด', 'ลองใหม่อีกครั้ง');
          }
        },
      },
    ]);
  };

  // ---- Add form mode ----
  if (showForm) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <GradientHeader
          title="เพิ่มน้องแมว"
          subtitle="ลงทะเบียนเพื่อให้ตามหาได้ง่ายเมื่อพลัดหลง"
          emoji="🐾"
          right={
            <TouchableOpacity onPress={() => setShowForm(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          }
        />
        <AddCatForm onClose={() => setShowForm(false)} onAdded={() => { setShowForm(false); fetchCats(); }} />
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
          <Text style={styles.catMeta}>
            สี{item.color}{item.breed ? ` • ${item.breed}` : ''}{item.age ? ` • ${item.age}` : ''}
          </Text>
          {item.notes ? <Text style={styles.catNotes} numberOfLines={2}>{item.notes}</Text> : null}

          <TouchableOpacity
            style={[styles.toggle, isLost ? styles.toggleHome : styles.toggleLost]}
            onPress={() => toggleLost(item)}
            activeOpacity={0.85}
          >
            <Ionicons name={isLost ? 'home' : 'alert-circle'} size={16} color={isLost ? colors.home : colors.lost} />
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
      <GradientHeader
        title="แมวของฉัน"
        subtitle={cats.length ? `${cats.length} ตัว${lostCount ? ` • หายอยู่ ${lostCount}` : ''}` : 'ยังไม่มีน้องแมว'}
        emoji="🐱"
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : cats.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🐈</Text>
          <Text style={styles.emptyTitle}>ยังไม่มีน้องแมว</Text>
          <Text style={styles.emptyText}>เพิ่มน้องแมวของคุณ เพื่อให้ตามหาได้เมื่อพลัดหลง</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowForm(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.emptyBtnText}>เพิ่มน้องแมว</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cats}
          keyExtractor={(i) => i.id}
          renderItem={renderCat}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      )}

      {/* FAB */}
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
  catImage: { width: 120, height: '100%', minHeight: 150, backgroundColor: '#eee' },
  catBody: { flex: 1, padding: 14 },
  catTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catName: { fontSize: 19, fontWeight: '800', color: colors.text, flex: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.full },
  badgeText: { fontSize: 12, fontWeight: '700' },
  catMeta: { fontSize: 13, color: colors.sub, marginTop: 5 },
  catNotes: { fontSize: 12.5, color: colors.faint, marginTop: 6, lineHeight: 18 },

  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, height: 42, borderRadius: radius.md, borderWidth: 1.5 },
  toggleLost: { backgroundColor: colors.lostSoft, borderColor: 'transparent' },
  toggleHome: { backgroundColor: colors.homeSoft, borderColor: 'transparent' },
  toggleText: { fontWeight: '700', fontSize: 14 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 72, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  emptyText: { fontSize: 14, color: colors.sub, textAlign: 'center', marginTop: 8, lineHeight: 21, marginBottom: 24 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 24, height: 52, borderRadius: radius.full },
  emptyBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow,
  },
});
