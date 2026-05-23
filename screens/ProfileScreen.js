import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
  const [phone, setPhone] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('userPhone').then(p => setPhone(p || ''));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👤 โปรไฟล์</Text>
      <Text style={styles.phone}>เบอร์: {phone}</Text>
      <Text style={styles.subtitle}>หน้านี้จะมี:</Text>
      <Text style={styles.item}>• ข้อมูลส่วนตัว</Text>
      <Text style={styles.item}>• ประวัติการแจ้งเจอ</Text>
      <Text style={styles.item}>• ออกจากระบบ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 16 },
  phone: { fontSize: 18, color: '#FF6B35', marginBottom: 24 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 16 },
  item: { fontSize: 14, color: '#999', marginBottom: 8 },
});