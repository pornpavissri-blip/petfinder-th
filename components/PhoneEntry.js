import { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { colors, radius, shadow } from '../theme';

export default function PhoneEntry({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const valid = cleanPhone.length === 10 && cleanPhone.startsWith('0');

  const handleSubmit = async () => {
    if (!valid) {
      setError('กรุณากรอกเบอร์มือถือ 10 หลัก (ขึ้นต้นด้วย 0)');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await setDoc(
        doc(db, 'users', cleanPhone),
        { phone: cleanPhone, name: name.trim(), createdAt: serverTimestamp() },
        { merge: true }
      );
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Hero */}
        <LinearGradient
          colors={[colors.gradientFrom, colors.gradientTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEmoji}>🐱</Text>
          <Text style={styles.heroTitle}>PetFinder Thailand</Text>
          <Text style={styles.heroSub}>ตามหาน้องแมวที่พลัดหลง ด้วยพลังของชุมชน</Text>
        </LinearGradient>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>เข้าใช้งาน</Text>
          <Text style={styles.cardHint}>ใช้เบอร์มือถือเป็นรหัสประจำตัว เพื่อให้คนที่เจอแมวติดต่อกลับได้</Text>

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
            <TextInput
              style={styles.input}
              placeholder="เช่น มิว"
              placeholderTextColor={colors.faint}
              value={name}
              onChangeText={setName}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, (!valid || loading) && styles.buttonOff]}
            onPress={handleSubmit}
            disabled={!valid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>เริ่มใช้งาน</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.privacy}>เบอร์ของคุณจะแสดงเฉพาะตอนมีคนเจอแมวของคุณเท่านั้น</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 90, paddingBottom: 70, alignItems: 'center',
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
  },
  heroEmoji: { fontSize: 76 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 10, letterSpacing: 0.5 },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },

  card: {
    backgroundColor: colors.card, marginHorizontal: 20, marginTop: -34,
    borderRadius: radius.lg, padding: 24, ...shadow,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  cardHint: { fontSize: 13, color: colors.sub, marginTop: 6, lineHeight: 19, marginBottom: 8 },

  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 14, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 14, height: 54,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  inputErr: { borderColor: colors.lost },
  input: { flex: 1, fontSize: 16, color: colors.text },

  error: { color: colors.lost, fontSize: 13, marginTop: 12, fontWeight: '500' },

  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, height: 56, borderRadius: radius.md, marginTop: 22,
  },
  buttonOff: { backgroundColor: '#FFC4AC' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  privacy: { fontSize: 12, color: colors.faint, textAlign: 'center', marginTop: 16, lineHeight: 17 },
});
