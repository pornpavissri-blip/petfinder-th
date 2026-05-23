import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PhoneEntry({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const cleanPhone = phone.trim().replace(/[-\s]/g, '');
    
    if (cleanPhone.length !== 10 || !cleanPhone.startsWith('0')) {
      Alert.alert('เบอร์ไม่ถูกต้อง', 'กรุณาใส่เบอร์ 10 หลัก เริ่มต้นด้วย 0');
      return;
    }

    setLoading(true);
    try {
      await setDoc(doc(db, 'users', cleanPhone), {
        phone: cleanPhone,
        createdAt: new Date()
      });
      await AsyncStorage.setItem('userPhone', cleanPhone);
      onLogin(cleanPhone);
    } catch (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐱 PetFinder Thailand</Text>
      <Text style={styles.subtitle}>ใส่เบอร์โทรเพื่อเริ่มใช้งาน</Text>

      <TextInput
        style={styles.input}
        placeholder="08x-xxx-xxxx"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={10}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'กำลังดำเนินการ...' : 'เริ่มใช้งาน'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 40 },
  input: { width: '100%', height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, fontSize: 18, marginBottom: 16 },
  button: { width: '100%', height: 50, backgroundColor: '#FF6B35', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});