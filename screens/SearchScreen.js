import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList, Image, ActivityIndicator, Linking, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getCatEmbedding, findTopMatches } from '../services/aiMatch';

export default function SearchScreen() {
  const [lostCats, setLostCats] = useState([]);
  const [loading, setLoading] = useState(true);

  // AI Match state
  const [foundCatImage, setFoundCatImage] = useState(null);
  const [foundCatColor, setFoundCatColor] = useState(null);
  const [matchResults, setMatchResults] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');

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
    Alert.alert('ติดต่อเจ้าของ', `โทรหา ${phone} ?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'โทร', onPress: () => Linking.openURL(`tel:${phone}`) },
    ]);
  };

  const daysAgo = (timestamp) => {
    if (!timestamp?.toMillis) return '';
    const diff = Date.now() - timestamp.toMillis();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'หายวันนี้';
    if (days === 1) return 'หายเมื่อวาน';
    return `หาย ${days} วันแล้ว`;
  };

  // ============ AI MATCH FUNCTIONS ============
  const pickAndMatch = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) askColorAndProcess(result.assets[0].uri);
  };

  const takePhotoAndMatch = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) askColorAndProcess(result.assets[0].uri);
  };

  const handleFindCat = () => {
    Alert.alert('เจอแมวจร?', 'ถ่ายรูปแมวที่เจอ — AI จะหาเจ้าของให้', [
      { text: '📷 ถ่ายรูป', onPress: takePhotoAndMatch },
      { text: '🖼️ แกลเลอรี', onPress: pickAndMatch },
      { text: 'ยกเลิก', style: 'cancel' },
    ]);
  };

  const askColorAndProcess = (uri) => {
    Alert.alert('สีแมวที่เจอ?', 'เลือกสีหลัก เพื่อช่วย AI', [
      { text: 'ส้ม/เหลือง', onPress: () => processFoundCat(uri, 'ส้ม') },
      { text: 'เทา/ดำ', onPress: () => processFoundCat(uri, 'เทา') },
      { text: 'ขาว', onPress: () => processFoundCat(uri, 'ขาว') },
      { text: 'สามสี/ลาย', onPress: () => processFoundCat(uri, 'ลาย') },
    ]);
  };

  const processFoundCat = async (uri, color) => {
    setFoundCatImage(uri);
    setFoundCatColor(color);
    setProcessing(true);
    setMatchResults(null);

    try {
      setProcessStep('กำลังบีบรูป...');
      const compressed = await ImageManipulator.manipulateAsync(
        uri, [{ resize: { width: 400 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );

      setProcessStep('🤖 AI กำลังวิเคราะห์รูป...');
      const queryEmbedding = await getCatEmbedding(compressed.uri);

      setProcessStep('📚 ดึงฐานข้อมูลแมว...');
      const snapshot = await getDocs(collection(db, 'cats'));
      const allCats = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log('Total cats in DB:', allCats.length);

      setProcessStep('🔍 เปรียบเทียบกับฐาน...');
      const matches = findTopMatches(queryEmbedding, allCats, color, 5);
      console.log('Found matches:', matches.length);

      setMatchResults(matches);
    } catch (error) {
      console.log('Match error:', error);
      Alert.alert('Error', error.message);
      closeMatch();
    }
    setProcessing(false);
    setProcessStep('');
  };

  const closeMatch = () => {
    setFoundCatImage(null);
    setFoundCatColor(null);
    setMatchResults(null);
    setProcessing(false);
    fetchLostCats();
  };

  // ============ MATCH RESULT UI ============
  if (foundCatImage) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.matchHeader}>
          <Text style={styles.matchTitle}>🔍 ผลการค้นหา</Text>
          <TouchableOpacity onPress={closeMatch}>
            <Ionicons name="close" size={28} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.foundImageContainer}>
          <Text style={styles.foundLabel}>แมวจรที่คุณเจอ:</Text>
          <Image source={{ uri: foundCatImage }} style={styles.foundImage} />
          {foundCatColor && (
            <Text style={styles.foundColorTag}>สี: {foundCatColor}</Text>
          )}
        </View>

        {processing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.processingText}>{processStep}</Text>
            <Text style={styles.processingHint}>(อาจใช้เวลา 5-30 วินาที)</Text>
          </View>
        )}

        {matchResults && matchResults.length === 0 && (
          <View style={styles.noMatch}>
            <Text style={styles.noMatchEmoji}>🤷</Text>
            <Text style={styles.noMatchText}>ไม่พบแมวที่เหมือนในระบบ</Text>
            <Text style={styles.noMatchHint}>อาจยังไม่มีเจ้าของลงทะเบียน</Text>
          </View>
        )}

        {matchResults && matchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>🏆 Top {matchResults.length} ที่เหมือนที่สุด</Text>
            {matchResults.map((cat, idx) => {
              const pct = Math.round(cat.similarity * 100);
              const isHigh = pct >= 70;
              const isMid = pct >= 40 && pct < 70;
              return (
                <View key={cat.id} style={[styles.matchCard, isHigh && styles.matchCardHigh]}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{idx + 1}</Text>
                  </View>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${cat.imageBase64}` }}
                    style={styles.matchImage}
                  />
                  <View style={styles.matchInfo}>
                    <View style={styles.matchTopRow}>
                      <Text style={styles.matchName}>{cat.name}</Text>
                      <View style={[
                        styles.scoreBadge,
                        isHigh && styles.scoreHigh,
                        isMid && styles.scoreMid,
                        !isHigh && !isMid && styles.scoreLow,
                      ]}>
                        <Text style={styles.scoreText}>{pct}%</Text>
                      </View>
                    </View>
                    <Text style={styles.matchDetail}>
                      สี: {cat.color}{cat.breed ? ` • ${cat.breed}` : ''}
                    </Text>
                    {cat.status === 'lost' && (
                      <Text style={styles.matchLost}>⚠️ แจ้งหายอยู่ • {daysAgo(cat.lostAt)}</Text>
                    )}
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => callOwner(cat.ownerPhone)}
                    >
                      <Ionicons name="call" size={16} color="#fff" />
                      <Text style={styles.callButtonText}>โทรหาเจ้าของ {cat.ownerPhone}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  }

  // ============ DEFAULT FEED UI ============
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 หาแมว ({lostCats.length})</Text>
        <TouchableOpacity onPress={fetchLostCats}>
          <Ionicons name="refresh" size={24} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <View style={styles.aiButtonContainer}>
        <TouchableOpacity style={styles.aiButton} onPress={handleFindCat}>
          <Ionicons name="camera" size={28} color="#fff" />
          <View style={{flex: 1}}>
            <Text style={styles.aiButtonText}>เจอแมวจร? 📷</Text>
            <Text style={styles.aiButtonSubtext}>ถ่ายรูปให้ AI หาเจ้าของ</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
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
  callButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#999' },

  // Match UI
  matchHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  matchTitle: { fontSize: 22, fontWeight: 'bold' },
  foundImageContainer: { padding: 16, alignItems: 'center' },
  foundLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  foundImage: { width: 200, height: 200, borderRadius: 12, borderWidth: 2, borderColor: '#FF6B35' },
  foundColorTag: { marginTop: 8, fontSize: 14, color: '#FF6B35', fontWeight: 'bold' },
  processingContainer: { padding: 40, alignItems: 'center' },
  processingText: { fontSize: 16, fontWeight: 'bold', color: '#FF6B35', marginTop: 16 },
  processingHint: { fontSize: 12, color: '#999', marginTop: 4 },
  noMatch: { padding: 40, alignItems: 'center' },
  noMatchEmoji: { fontSize: 64, marginBottom: 16 },
  noMatchText: { fontSize: 16, fontWeight: 'bold', color: '#666' },
  noMatchHint: { fontSize: 13, color: '#999', marginTop: 4 },
  resultsContainer: { padding: 16 },
  resultsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  matchCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: '#eee', position: 'relative',
  },
  matchCardHigh: { borderColor: '#639922', borderWidth: 2 },
  rankBadge: {
    position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, zIndex: 1,
  },
  rankText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  matchImage: { width: 110, height: 140 },
  matchInfo: { flex: 1, padding: 12 },
  matchTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  matchName: { fontSize: 18, fontWeight: 'bold' },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  scoreHigh: { backgroundColor: '#639922' },
  scoreMid: { backgroundColor: '#FF9500' },
  scoreLow: { backgroundColor: '#999' },
  scoreText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  matchDetail: { fontSize: 13, color: '#666', marginBottom: 4 },
  matchLost: { fontSize: 12, color: '#E24B4A', marginBottom: 6, fontWeight: 'bold' },
});