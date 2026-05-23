import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList, Image, ActivityIndicator, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function SearchScreen() {
  const [lostCats, setLostCats] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLostCats = useCallback(async () => {
    try {
      const q = query(collection(db, 'cats'), where('status', '==', 'lost'));
      const snapshot = await getDocs(q);
      const catsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      catsData.sort((a, b) => (b.lostAt?.toMillis?.() || 0) - (a.lostAt?.toMillis?.() || 0));
      setLostCats(catsData);
    } catch (error) {
      console.log('Fetch error:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLostCats(); }, [fetchLostCats]);

  const callOwner = (phone) => {
    Alert.alert(
      'ติดต่อเจ้าของ',
      `โทรหา ${phone} ?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'โทร', onPress: () => Linking.openURL(`tel:${phone}`) },
      ]
    );
  };

  const daysAgo = (timestamp) => {
    if (!timestamp?.toMillis) return '';
    const diff = Date.now() - timestamp.toMillis();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'หายวันนี้';
    if (days === 1) return 'หายเมื่อวาน';
    return `หาย ${days} วันแล้ว`;
  };

  const renderCard = ({ item }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }}
        style={styles.cardImage}
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardDetail}>สี: {item.color}{item.breed ? ` • ${item.breed}` : ''}</Text>
        {item.age ? <Text style={styles.cardDetail}>อายุ: {item.age} ปี</Text> : null}
        <Text style={styles.lostTime}>⏱ {daysAgo(item.lostAt)}</Text>

        <TouchableOpacity style={styles.callButton} onPress={() => callOwner(item.ownerPhone)}>
          <Ionicons name="call" size={16} color="#fff" />
          <Text style={styles.callButtonText}>โทรหาเจ้าของ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 หาแมว ({lostCats.length})</Text>
        <TouchableOpacity onPress={fetchLostCats}>
          <Ionicons name="refresh" size={24} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <View style={styles.aiButtonContainer}>
        <TouchableOpacity style={styles.aiButton}>
          <Ionicons name="camera" size={28} color="#fff" />
          <View>
            <Text style={styles.aiButtonText}>เจอแมวจร? 📷</Text>
            <Text style={styles.aiButtonSubtext}>ถ่ายรูปให้ AI หาเจ้าของ (เร็ว ๆ นี้)</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>แมวที่หายล่าสุด</Text>

      {lostCats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🎉</Text>
          <Text style={styles.emptyText}>ยังไม่มีน้องแมวหายในระบบ</Text>
        </View>
      ) : (
        <FlatList
          data={lostCats}
          renderItem={renderCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  aiButtonContainer: { padding: 16 },
  aiButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF6B35',
    paddingHorizontal: 20, paddingVertical: 16, borderRadius: 12, gap: 12,
  },
  aiButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  aiButtonSubtext: { color: '#fff', fontSize: 12, opacity: 0.9, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, color: '#333' },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: '#eee',
  },
  cardImage: { width: 120, height: 140 },
  cardInfo: { flex: 1, padding: 12 },
  cardName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  cardDetail: { fontSize: 14, color: '#666', marginBottom: 2 },
  lostTime: { fontSize: 13, color: '#E24B4A', marginTop: 6, marginBottom: 8 },
  callButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#378ADD', paddingVertical: 8, borderRadius: 6, gap: 6,
  },
  callButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#999' },
});