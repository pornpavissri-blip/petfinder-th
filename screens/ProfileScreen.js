import { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import GradientHeader from '../components/GradientHeader';
import { seedDemoCats, clearDemoCats } from '../services/demoSeed';
import { colors, radius, shadow, shadowSoft } from '../theme';

export default function ProfileScreen({ onLogout }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [stats, setStats] = useState({ total: 0, lost: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const runSeed = async () => {
    setSeeding(true);
    try {
      const n = await seedDemoCats(phone, 6);
      await load();
      Alert.alert(
        n > 0 ? 'สร้างแล้ว 🐱' : 'ไม่สำเร็จ',
        n > 0
          ? `เพิ่มแมวหายจำลอง ${n} ตัว กระจายรอบตำแหน่งคุณ\nไปดูที่หน้าแผนที่ได้เลย (อนุญาต GPS ด้วยนะ)`
          : 'โหลดรูปแมวไม่ได้ ลองเช็กเน็ตแล้วลองใหม่'
      );
    } catch (e) {
      console.log('Seed error:', e);
      Alert.alert('ผิดพลาด', 'ลองใหม่อีกครั้ง (ต้องต่อเน็ต)');
    }
    setSeeding(false);
  };

  const runClear = () => {
    Alert.alert('ล้างข้อมูลจำลอง', 'ลบแมวหายจำลองทั้งหมด?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive',
        onPress: async () => {
          setSeeding(true);
          try {
            const n = await clearDemoCats();
            await load();
            Alert.alert('ล้างแล้ว', `ลบข้อมูลจำลอง ${n} ตัว`);
          } catch (e) { Alert.alert('ผิดพลาด', 'ลองใหม่'); }
          setSeeding(false);
        },
      },
    ]);
  };

  const load = useCallback(async () => {
    try {
      const p = await AsyncStorage.getItem('userPhone');
      const n = await AsyncStorage.getItem('userName');
      setPhone(p || '');
      setName(n || '');
      if (p) {
        const snap = await getDocs(query(collection(db, 'cats'), where('ownerPhone', '==', p)));
        const all = snap.docs.map((d) => d.data());
        setStats({ total: all.length, lost: all.filter((c) => c.status === 'lost').length });
      }
    } catch (e) { console.log('Profile load error:', e); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveName = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', phone), { name: draftName.trim() }, { merge: true });
      await AsyncStorage.setItem('userName', draftName.trim());
      setName(draftName.trim());
      setEditing(false);
    } catch (e) { Alert.alert('ผิดพลาด', 'บันทึกไม่สำเร็จ'); }
    setSaving(false);
  };

  const confirmLogout = () => {
    Alert.alert('ออกจากระบบ', 'ต้องการออกจากระบบใช่ไหม?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ออกจากระบบ', style: 'destructive', onPress: onLogout },
    ]);
  };

  const initial = (name || 'M').trim().charAt(0).toUpperCase();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <GradientHeader title="โปรไฟล์" emoji="👤" />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientHeader title="โปรไฟล์" emoji="👤" />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* identity card */}
        <View style={styles.idCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>

          {editing ? (
            <View style={{ width: '100%', marginTop: 14 }}>
              <TextInput
                style={styles.nameInput}
                value={draftName}
                onChangeText={setDraftName}
                placeholder="ชื่อเล่นของคุณ"
                placeholderTextColor={colors.faint}
                autoFocus
              />
              <View style={styles.editRow}>
                <TouchableOpacity style={[styles.editBtn, styles.editCancel]} onPress={() => setEditing(false)}>
                  <Text style={styles.editCancelText}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.editBtn, styles.editSave]} onPress={saveName} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.editSaveText}>บันทึก</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.name}>{name || 'ผู้ใช้ PetFinder'}</Text>
              <View style={styles.phoneRow}>
                <Ionicons name="call" size={14} color={colors.sub} />
                <Text style={styles.phone}>{phone}</Text>
              </View>
              <TouchableOpacity style={styles.editName} onPress={() => { setDraftName(name); setEditing(true); }}>
                <Ionicons name="create-outline" size={15} color={colors.primary} />
                <Text style={styles.editNameText}>แก้ไขชื่อ</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLabel}>น้องแมวทั้งหมด</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: colors.lost }]}>{stats.lost}</Text>
            <Text style={styles.statLabel}>กำลังตามหา</Text>
          </View>
        </View>

        {/* about */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>เกี่ยวกับ PetFinder</Text>
          <View style={styles.aboutRow}>
            <Ionicons name="paw" size={18} color={colors.primary} />
            <Text style={styles.aboutText}>ระบบช่วยตามหาแมวที่พลัดหลง ด้วยการรู้จำใบหน้าแมว</Text>
          </View>
          <View style={styles.aboutRow}>
            <Ionicons name="school" size={18} color={colors.primary} />
            <Text style={styles.aboutText}>ต้นแบบจากงานวิจัย ม.เทคโนโลยีสุรนารี</Text>
          </View>
          <View style={styles.aboutRow}>
            <Ionicons name="flask" size={18} color={colors.primary} />
            <Text style={styles.aboutText}>เวอร์ชันต้นแบบ (Prototype) v1.0</Text>
          </View>
        </View>

        {/* demo tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 เครื่องมือเดโม่</Text>
          <Text style={styles.demoHint}>สร้างแมวหายจำลองกระจายบนแผนที่ สำหรับนำเสนอ</Text>
          <TouchableOpacity style={styles.seedBtn} onPress={runSeed} disabled={seeding} activeOpacity={0.85}>
            {seeding ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={styles.seedText}>สร้างแมวหายจำลอง (6 ตัว)</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearBtn} onPress={runClear} disabled={seeding}>
            <Ionicons name="trash-outline" size={16} color={colors.sub} />
            <Text style={styles.clearText}>ล้างข้อมูลจำลอง</Text>
          </TouchableOpacity>
        </View>

        {/* logout */}
        <TouchableOpacity style={styles.logout} onPress={confirmLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={colors.lost} />
          <Text style={styles.logoutText}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  idCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 24, alignItems: 'center', ...shadow },
  avatar: { width: 86, height: 86, borderRadius: 43, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 38, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 14 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  phone: { fontSize: 15, color: colors.sub, fontWeight: '500' },
  editName: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14, backgroundColor: colors.primarySoft, paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.full },
  editNameText: { color: colors.primary, fontWeight: '700', fontSize: 14 },

  nameInput: { backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 16, height: 52, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border },
  editRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  editBtn: { flex: 1, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  editCancel: { backgroundColor: colors.bg },
  editCancelText: { color: colors.sub, fontWeight: '700' },
  editSave: { backgroundColor: colors.primary },
  editSaveText: { color: '#fff', fontWeight: '800' },

  statsRow: { flexDirection: 'row', gap: 14, marginTop: 16 },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: 20, alignItems: 'center', ...shadowSoft },
  statNum: { fontSize: 32, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 13, color: colors.sub, marginTop: 4, fontWeight: '500' },

  section: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 20, marginTop: 16, ...shadowSoft },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 14 },
  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  aboutText: { flex: 1, fontSize: 14, color: colors.sub, lineHeight: 20 },

  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.lostSoft, height: 54, borderRadius: radius.md, marginTop: 24 },
  logoutText: { color: colors.lost, fontWeight: '800', fontSize: 16 },

  demoHint: { fontSize: 12.5, color: colors.sub, marginTop: -6, marginBottom: 12, lineHeight: 18 },
  seedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, height: 50, borderRadius: radius.md },
  seedText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, marginTop: 8 },
  clearText: { color: colors.sub, fontWeight: '600', fontSize: 13.5 },
});
