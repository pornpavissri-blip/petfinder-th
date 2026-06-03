import { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, Image, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import GradientHeader from '../components/GradientHeader';
import AddCatForm from '../components/AddCatForm';
import ReportLostForm from '../components/ReportLostForm';
import CatProfileCard from '../components/CatProfileCard';
import { colors, radius, shadow, statusInfo, displayAge } from '../theme';

// 🔹 ดึงรูปภาพ Assets โลโก้เข้ามาใช้งานแทน Emoji
const catAvatar = require('../assets/Logo.png');

export default function MyCatsScreen() {
  const insets = useSafeAreaInsets();
  const [showForm, setShowForm] = useState(false);
  const [reportLostCat, setReportLostCat] = useState(null);
  const [editCat, setEditCat] = useState(null);
  const [selectedCat, setSelectedCat] = useState(null);
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
            setSelectedCat((p) => (p ? { ...p, status: 'home', reward: 0, lostNote: '' } : p));
            fetchCats();
          } catch (e) { Alert.alert('ผิดพลาด', 'ลองใหม่อีกครั้ง'); }
        },
      },
    ]);
  };

  const deleteCat = (cat) => {
    Alert.alert('ลบน้องแมว?', `จะลบน้อง "${cat.name}" ออกถาวร กู้คืนไม่ได้`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive',
        onPress: async () => {
          try { await deleteDoc(doc(db, 'cats', cat.id)); setSelectedCat(null); fetchCats(); }
          catch (e) { console.log('Delete error:', e); Alert.alert('ผิดพลาด', 'ลบไม่สำเร็จ ลองใหม่'); }
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

  // ---- Edit form ----
  if (editCat) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <GradientHeader title="แก้ไขข้อมูลน้อง" subtitle={editCat.name} emoji="✏️" onClose={() => setEditCat(null)} />
        <AddCatForm editCat={editCat} onAdded={() => { setEditCat(null); setSelectedCat(null); fetchCats(); }} />
      </View>
    );
  }

  // ---- Report lost form ----
  if (reportLostCat) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <GradientHeader title="แจ้งแมวหาย" subtitle="ลงประกาศตามหาน้อง" emoji="🔴" onClose={() => setReportLostCat(null)} />
        <ReportLostForm cat={reportLostCat} onDone={() => { setReportLostCat(null); setSelectedCat(null); fetchCats(); }} />
      </View>
    );
  }

  // ---- โปรไฟล์น้องแมว (กดที่การ์ด) ----
  if (selectedCat) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        
        {/* 🛠️ ปรับโครงสร้างส่วนหัวหน้าโปรไฟล์ให้แสดงรูปโลโก้แทนการใช้ Emoji และไม่ซ้อนทับกัน */}
        <View style={styles.inlineHeaderOuterContainer}>
          <View style={styles.inlineHeaderInnerWrapper}>
            {/* โลโก้ Assets วางตำแหน่งขอบซ้ายอย่างสวยงาม */}
            <Image source={catAvatar} style={styles.inlineHeaderLogoLeft} resizeMode="contain" />
            
            {/* กล่องข้อความหัวเรื่อง ขยับหลบโลโก้ไปทางขวาโดยใช้สไตล์ชุดเดิม */}
            <View style={styles.gradientHeaderWrapper}>
              <GradientHeader 
                title={selectedCat.name} 
                subtitle="โปรไฟล์น้องแมว" 
                onClose={() => setSelectedCat(null)} 
              />
            </View>
          </View>
        </View>

        <CatProfileCard
          cat={selectedCat}
          onEdit={(c) => setEditCat(c)}
          onReportLost={(c) => setReportLostCat(c)}
          onMarkHome={markHome}
          onDelete={deleteCat}
        />
      </View>
    );
  }

  const lostCount = cats.filter((c) => c.status === 'lost').length;

  const renderCat = ({ item }) => {
    const s = statusInfo(item.status);
    const isLost = item.status === 'lost';
    const age = displayAge(item);
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={() => setSelectedCat(item)}>
        <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.catImage} />
        <View style={styles.catBody}>
          <View style={styles.catTop}>
            <Text style={styles.catName} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.badge, { backgroundColor: s.soft }]}>
              <Ionicons name={s.icon} size={13} color={s.color} />
              <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
            </View>
          </View>
          <Text style={styles.catMeta}>สี{item.color}{item.breed ? ` • ${item.breed}` : ''}{age ? ` • ${age}` : ''}{item.sex === 'ผู้' ? ' • ♂ ผู้' : item.sex === 'เมีย' ? ' • ♀ เมีย' : ''}</Text>
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
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      
      {/* 🛠️ ส่วนหัวโครงสร้างใหม่ แทรกรูปจาก Assets วางข้างหน้าตัวหนังสือแทน Emoji */}
      <View style={styles.inlineHeaderOuterContainer}>
        <View style={styles.inlineHeaderInnerWrapper}>
          {/* รูปภาพโลโก้จาก Assets จัดวางตำแหน่งที่ขอบซ้ายอย่างถูกต้อง */}
          <Image source={catAvatar} style={styles.inlineHeaderLogoLeft} resizeMode="contain" />
          
          {/* ขยับเนื้อหาของกล่องข้อความ GradientHeader หลบทางขวาเพื่อไม่ให้ทับกับโลโก้ */}
          <View style={styles.gradientHeaderWrapper}>
            <GradientHeader 
              title="แมวของฉัน" 
              subtitle={cats.length ? `${cats.length} ตัว${lostCount ? ` • หายอยู่ ${lostCount}` : ''}` : 'ยังไม่มีน้องแมว'} 
            />
          </View>
        </View>
      </View>

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
  card: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: 14, overflow: 'hidden', ...shadow },
  catImage: { width: 120, minHeight: 150, backgroundColor: '#eee' },
  catBody: { flex: 1, padding: 14 },
  catTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catName: { fontSize: 19, fontWeight: '800', color: colors.text, flex: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.full },
  badgeText: { fontSize: 12, fontWeight: '700' },
  kebab: { padding: 2, marginRight: -4 },
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

  // 💡 โครงสร้างชุดสไตล์สำหรับเปิดพื้นที่ Layout ส่วนหัวไม่ให้ทับซ้อนกัน
   // 💡 โครงสร้างชุดสไตล์สำหรับจัดระยะ Layout ส่วนหัวแบบกระจายเนื้อหา ไม่ซ้อนทับกัน
  inlineHeaderOuterContainer: {
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  inlineHeaderInnerWrapper: {
    position: 'relative',
    justifyContent: 'flex-end',
  },
  gradientHeaderWrapper: {
    width: '100%',
    // ดันข้อความด้านในของ GradientHeader ให้ขยับไปทางขวา 62px เพื่อให้พ้นจากกรอบของภาพโลโก้
    paddingLeft: 62, 
  },
  inlineHeaderLogoLeft: {
    width: 100,                  // แก้ไข: ใช้ตัวเลขล้วน ห้ามใส่ "px"
    height: 100,                 // แก้ไข: พิมพ์คำว่า height ให้ถูกต้อง และใช้ตัวเลขล้วน
    position: 'absolute',
    left: -5,                   // ระยะห่างจากขอบซ้ายจอ
    bottom: -15,                 // ปรับให้อยู่กึ่งกลางระนาบเดียวกับ Title/Subtitle พอดีอย่างสมมาตร
    borderRadius: 25,           // แก้ไข: ปรับเป็น 25 (ครึ่งหนึ่งของ 50) เพื่อให้เป็นวงกลมที่สมบูรณ์
    zIndex: 99,                 // ป้องกันไม่ให้โดนพื้นหลังของคอมโพเนนต์อื่น ๆ วาดทับ
    
    ...shadow,                  // ใส่เงาเพิ่มมิติความลอยเด่นของโลโก้
  },

  // bottom sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: 20, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 14 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetThumb: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: '#eee' },
  sheetName: { fontSize: 17, fontWeight: '800', color: colors.text },
  sheetSub: { fontSize: 13, color: colors.sub, marginTop: 2 },
  sheetOpt: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 60 },
  sheetIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sheetOptText: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  sheetCancel: { height: 52, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  sheetCancelText: { fontSize: 16, fontWeight: '800', color: colors.sub },
});
