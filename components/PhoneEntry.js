import { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { colors, radius, shadow } from '../theme';

export default function PhoneEntry({ onLogin }) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const valid = cleanPhone.length === 10 && cleanPhone.startsWith('0');

  const handleSubmit = async () => {
    if (!valid) { setError('กรุณากรอกเบอร์มือถือ 10 หลัก (ขึ้นต้นด้วย 0)'); return; }
    setError('');
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', cleanPhone), { phone: cleanPhone, name: name.trim(), createdAt: serverTimestamp() }, { merge: true });
      await AsyncStorage.setItem('userPhone', cleanPhone);
      if (name.trim()) await AsyncStorage.setItem('userName', name.trim());
      onLogin(cleanPhone);
    } catch (e) {
      console.log('Login error:', e);
      setError('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* logo chip */}
        <View style={styles.logoChip}><Text style={{ fontSize: 30 }}>🐾</Text></View>

        {/* hero — แทนรูปการ์ตูนแมวของคุณทีหลังได้:
            เปลี่ยน <Text style={styles.heroEmoji}>🐱</Text>
            เป็น <Image source={require('../assets/cat-hero.png')} style={styles.heroImg} /> */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🐱</Text>
        </View>

        <Text style={styles.title}>PetFinder Thailand</Text>
        <Text style={styles.subtitle}>ตามหาน้องแมวที่พลัดหลง{'\n'}ด้วยพลังของชุมชน</Text>

        {/* card */}
        <View style={styles.card}>
          <Text style={styles.label}>เบอร์มือถือ</Text>
          <View style={[styles.inputWrap, error && styles.inputErr]}>
            <Ionicons name="call-outline" size={20} color={colors.faint} />
            <TextInput
              style={styles.input}
              placeholder="08X-XXX-XXXX"
              placeholderTextColor={colors.faint}
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={(t) => { setPhone(t); setError(''); }}
            />
            {valid && <Ionicons name="checkmark-circle" size={20} color={colors.home} />}
          </View>

          <Text style={styles.label}>ชื่อเล่น (ไม่บังคับ)</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={20} color={colors.faint} />
            <TextInput style={styles.input} placeholder="เช่น มิว" placeholderTextColor={colors.faint} value={name} onChangeText={setName} />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.button, (!valid || loading) && styles.buttonOff]} onPress={handleSubmit} disabled={!valid || loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.buttonText}>เริ่มใช้งาน</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.privacyRow}>
            <Ionicons name="lock-closed" size={13} color={colors.faint} />
            <Text style={styles.privacy}>เบอร์ของคุณจะแสดงเฉพาะตอนมีคนเจอแมวของคุณ</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  logoChip: { alignSelf: 'center', width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },

  hero: { alignSelf: 'center', width: 168, height: 168, borderRadius: 84, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  heroEmoji: { fontSize: 92 },
  heroImg: { width: 168, height: 168, borderRadius: 84 },

  title: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 22, letterSpacing: 0.3 },
  subtitle: { fontSize: 14.5, color: colors.sub, textAlign: 'center', marginTop: 8, lineHeight: 21 },

  card: { backgroundColor: colors.card, marginHorizontal: 24, marginTop: 26, borderRadius: radius.xl, padding: 22, ...shadow },
  label: { fontSize: 13.5, fontWeight: '700', color: colors.text, marginTop: 14, marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 16, height: 56, borderWidth: 1.5, borderColor: 'transparent' },
  inputErr: { borderColor: colors.lost },
  input: { flex: 1, fontSize: 16, color: colors.text },
  error: { color: colors.lost, fontSize: 13, marginTop: 12, fontWeight: '500' },

  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, height: 56, borderRadius: radius.md, marginTop: 22 },
  buttonOff: { backgroundColor: '#F6D2BB' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
  privacy: { fontSize: 12, color: colors.faint, textAlign: 'center' },
});
