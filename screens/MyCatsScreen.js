import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import AddCatForm from '../components/AddCatForm';

export default function MyCatsScreen() {
  const [showForm, setShowForm] = useState(false);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCats = useCallback(async () => {
    try {
      const phone = await AsyncStorage.getItem('userPhone');
      if (!phone) return;

      const q = query(collection(db, 'cats'), where('ownerPhone', '==', phone));
      const snapshot = await getDocs(q);
      const catsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      catsData.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setCats(catsData);
    } catch (error) {
      console.log('Fetch error:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCats(); }, [fetchCats]);

  const toggleLostStatus = async (cat) => {
    const newStatus = cat.status === 'lost' ? 'home' : 'lost';
    const action = newStatus === 'lost' ? 'แจ้งหาย' : 'กลับบ้านแล้ว';

    Alert.alert(
      `ยืนยัน${action}`,
      `${action} น้อง "${cat.name}" ใช่ไหม?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ยืนยัน', onPress: async () => {
          try {
            await updateDoc(doc(db, 'cats', cat.id), {
              status: newStatus,
              lostAt: newStatus === 'lost' ? new Date() : null,
            });
            fetchCats();
          } catch (error) {
            Alert.alert('Error', error.message);
          }
        }},
      ]
    );
  };

  if (showForm) {
    return (
      <AddCatForm
        onClose={() => setShowForm(false)}
        onSaved={() => { setLoading(true); fetchCats(); }}
      />
    );
  }

  const getStatusBadge = (status) => {
    if (status === 'lost') return { text: 'หาย 😿', color: '#E24B4A' };
    if (status === 'found') return { text: 'เจอแล้ว 🎉', color: '#378ADD' };
    return { text: 'อยู่บ้าน 🏠', color: '#639922' };
  };

  const renderCatCard = ({ item }) => {
    const badge = getStatusBadge(item.status);
    const isLost = item.status === 'lost';
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }}
            style={styles.cardImage}
          />
          <View style={styles.cardInfo}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardName}>{item.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: badge.color }]}>
                <Text style={styles.statusText}>{badge.text}</Text>
              </View>
            </View>
            <Text style={styles.cardDetail}>สี: {item.color}{item.breed ? ` • ${item.breed}` : ''}</Text>
            {item.age ? <Text style={styles.cardDetail}>อายุ: {item.age} ปี</Text> : null}
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.actionButton, isLost ? styles.foundButton : styles.lostButton]}
          onPress={() => toggleLostStatus(item)}
        >
          <Ionicons name={isLost ? 'happy-outline' : 'alert-circle-outline'} size={18} color="#fff" />
          <Text style={styles.actionButtonText}>
            {isLost ? 'น้องกลับมาแล้ว!' : 'แจ้งว่าแมวหาย'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

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
        <Text style={styles.title}>🐱 แมวของฉัน ({cats.length})</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>เพิ่ม</Text>
        </TouchableOpacity>
      </View>

      {cats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🐱</Text>
          <Text style={styles.emptyText}>ยังไม่มีน้องแมว</Text>
          <Text style={styles.emptyHint}>กดปุ่ม "+ เพิ่ม" ด้านบน เพื่อลงทะเบียนน้องแมว</Text>
        </View>
      ) : (
        <FlatList
          data={cats}
          renderItem={renderCatCard}
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
  addButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF6B35',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 4,
  },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: '#eee',
  },
  cardTop: { flexDirection: 'row' },
  cardImage: { width: 100, height: 100 },
  cardInfo: { flex: 1, padding: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardName: { fontSize: 18, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  cardDetail: { fontSize: 14, color: '#666', marginBottom: 4 },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, gap: 6, borderTopWidth: 1, borderTopColor: '#eee',
  },
  lostButton: { backgroundColor: '#E24B4A' },
  foundButton: { backgroundColor: '#639922' },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, color: '#999', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#ccc', textAlign: 'center' },
});