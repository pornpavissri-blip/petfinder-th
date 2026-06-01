import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, Image, TouchableOpacity,
  ActivityIndicator, Linking, Alert, ScrollView, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { findMatches } from '../services/aiMatch';
import { CAT_COLORS } from '../components/AddCatForm';
import GradientHeader from '../components/GradientHeader';
import { colors, radius, shadow, statusInfo, daysAgo } from '../theme';

export default function SearchScreen() {
  const [lostCats, setLostCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // found-cat match flow
  const [foundImage, setFoundImage] = useState(null);
  const [foundColor, setFoundColor] = useState(null);
  const [results, setResults] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState('');

  const fetchLost = useCallback(async () => {
    try {
      const q = query(collection(db, 'cats'), where('status', '==', 'lost'));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.lostAt?.toMillis?.() || 0) - (a.lostAt?.toMillis?.() || 0));
      setLostCats(data);
    } catch (e) { console.log('Fetch error:', e); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchLost(); }, [fetchLost]));

  const callOwner = (phone) => {
    Alert.alert('ติดต่อเจ้าของ', `โทรหา ${phone} ?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'โทร', onPress: () => Linking.openURL(`tel:${phone}`) },
    ]);
  };

  // ---------- found-cat match ----------
  const pickFound = async (fromCamera) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') { Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึง'); return; }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });

    if (!result.canceled) {
      setFoundImage(result.assets[0].uri);
      setFoundColor(null);
      setResults(null);
    }
  };

  const runMatch = async (color) => {
    setFoundColor(color);
    setProcessing(true);
    setResults(null);
    try {
      setStep('กำลังวิเคราะห์ใบหน้าแมว...');
      const snap = await getDocs(collection(db, 'cats'));
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStep('กำลังเปรียบเทียบกับฐานข้อมูล...');
      const top = await findMatches(color, all);
      setResults(top);
    } catch (e) {
      console.log('Match error:', e);
      Alert.alert('ผิดพลาด', 'ลองใหม่อีกครั้ง');
    }
    setProcessing(false);
  };

  const closeMatch = () => {
    setFoundImage(null); setFoundColor(null); setResults(null); setProcessing(false);
    fetchLost();
  };

  // ====== MATCH VIEW ======
  if (foundImage) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <GradientHeader
          title="ตามหาเจ้าของ"
          subtitle="เปรียบเทียบแมวจรกับฐานข้อมูล"
          emoji="🔍"
          right={
            <TouchableOpacity onPress={closeMatch} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          }
        />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={styles.foundCard}>
            <Image source={{ uri: foundImage }} style={styles.foundImage} />
            <Text style={styles.foundLabel}>แมวจรที่คุณเจอ</Text>
            {foundColor && <View style={styles.colorTag}><Text style={styles.colorTagText}>สี{foundColor}</Text></View>}
          </View>

          {/* choose color */}
          {!foundColor && !processing && (
            <View style={styles.colorBox}>
              <Text style={styles.colorBoxTitle}>น้องแมวสีอะไร?</Text>
              <Text style={styles.colorBoxHint}>เลือกสีเพื่อช่วยให้ค้นหาแม่นยำขึ้น</Text>
              <View style={styles.chips}>
                {CAT_COLORS.map((c) => (
                  <TouchableOpacity key={c} style={styles.chip} onPress={() => runMatch(c)}>
                    <Text style={styles.chipText}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* processing */}
          {processing && (
            <View style={styles.processing}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.processingText}>{step}</Text>
              <Text style={styles.processingHint}>ระบบกำลังประมวลผลใบหน้า</Text>
            </View>
          )}

          {/* no match */}
          {results && results.length === 0 && (
            <View style={styles.noMatch}>
              <Text style={{ fontSize: 56 }}>🤷</Text>
              <Text style={styles.noMatchTitle}>ยังไม่พบแมวที่ตรงกัน</Text>
              <Text style={styles.noMatchText}>อาจยังไม่มีเจ้าของลงทะเบียนน้องตัวนี้</Text>
            </View>
          )}

          {/* results */}
          {results && results.length > 0 && (
            <View>
              <Text style={styles.resultTitle}>🏆 {results.length} อันดับที่ใกล้เคียงที่สุด</Text>
              {results.map((cat, idx) => {
                const pct = Math.round(cat.similarity * 100);
                const high = pct >= 70;
                const mid = pct >= 45 && pct < 70;
                const s = statusInfo(cat.status);
                return (
                  <View key={cat.id} style={[styles.matchCard, high && styles.matchHigh]}>
                    <View style={styles.rank}><Text style={styles.rankText}>#{idx + 1}</Text></View>
                    <Image source={{ uri: `data:image/jpeg;base64,${cat.imageBase64}` }} style={styles.matchImg} />
                    <View style={styles.matchBody}>
                      <View style={styles.matchTop}>
                        <Text style={styles.matchName}>{cat.name}</Text>
                        <View style={[styles.score, high ? styles.scoreHigh : mid ? styles.scoreMid : styles.scoreLow]}>
                          <Text style={styles.scoreText}>{pct}%</Text>
                        </View>
                      </View>
                      <Text style={styles.matchMeta}>สี{cat.color}{cat.breed ? ` • ${cat.breed}` : ''}</Text>
                      {cat.status === 'lost' && (
                        <View style={styles.lostTag}>
                          <Ionicons name="alert-circle" size={13} color={colors.lost} />
                          <Text style={styles.lostTagText}>แจ้งหาย • {daysAgo(cat.lostAt)}</Text>
                        </View>
                      )}
                      <TouchableOpacity style={styles.callBtn} onPress={() => callOwner(cat.ownerPhone)}>
                        <Ionicons name="call" size={15} color="#fff" />
                        <Text style={styles.callBtnText}>โทรหาเจ้าของ {cat.ownerPhone}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              <Text style={styles.disclaimer}>
                * ผลลัพธ์เป็นการเปรียบเทียบเบื้องต้น โปรดยืนยันตัวตนกับเจ้าของอีกครั้ง
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ====== DEFAULT FEED ======
  const renderLost = ({ item }) => (
    <View style={styles.lostCard}>
      <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.lostImage} />
      <View style={styles.lostBadge}>
        <Ionicons name="alert-circle" size={12} color="#fff" />
        <Text style={styles.lostBadgeText}>หาย {daysAgo(item.lostAt)}</Text>
      </View>
      <View style={styles.lostBody}>
        <Text style={styles.lostName}>{item.name}</Text>
        <Text style={styles.lostMeta}>สี{item.color}{item.breed ? ` • ${item.breed}` : ''}</Text>
        {item.notes ? <Text style={styles.lostNotes} numberOfLines={2}>{item.notes}</Text> : null}
        <TouchableOpacity style={styles.callBtnSmall} onPress={() => callOwner(item.ownerPhone)}>
          <Ionicons name="call" size={14} color={colors.primary} />
          <Text style={styles.callBtnSmallText}>ติดต่อเจ้าของ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientHeader
        title="ตามหาน้องแมว"
        subtitle={`${lostCats.length} ตัวกำลังตามหา`}
        emoji="🐾"
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={lostCats}
          keyExtractor={(i) => i.id}
          renderItem={renderLost}
          numColumns={2}
          columnWrapperStyle={{ gap: 14, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLost(); }} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={styles.ctaWrap}>
              <View style={styles.cta}>
                <Text style={styles.ctaEmoji}>📸</Text>
                <Text style={styles.ctaTitle}>เจอแมวจร?</Text>
                <Text style={styles.ctaText}>ถ่ายรูปน้อง แล้วให้ระบบช่วยหาเจ้าของ</Text>
                <View style={styles.ctaButtons}>
                  <TouchableOpacity style={styles.ctaBtn} onPress={() => pickFound(true)}>
                    <Ionicons name="camera" size={18} color="#fff" />
                    <Text style={styles.ctaBtnText}>ถ่ายรูป</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.ctaBtn, styles.ctaBtnAlt]} onPress={() => pickFound(false)}>
                    <Ionicons name="images" size={18} color={colors.primary} />
                    <Text style={[styles.ctaBtnText, { color: colors.primary }]}>เลือกรูป</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.feedTitle}>🔴 แมวที่กำลังตามหา</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyFeed}>
              <Text style={{ fontSize: 56 }}>🎉</Text>
              <Text style={styles.emptyFeedTitle}>ตอนนี้ไม่มีแมวหาย</Text>
              <Text style={styles.emptyFeedText}>ทุกตัวอยู่บ้านปลอดภัยดี</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  // CTA
  ctaWrap: { padding: 16 },
  cta: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 22, alignItems: 'center', ...shadow },
  ctaEmoji: { fontSize: 44 },
  ctaTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 6 },
  ctaText: { fontSize: 13.5, color: colors.sub, marginTop: 6, textAlign: 'center', marginBottom: 18 },
  ctaButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  ctaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.primary, height: 50, borderRadius: radius.md },
  ctaBtnAlt: { backgroundColor: colors.primarySoft },
  ctaBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  feedTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 24 },

  // lost feed card
  lostCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, marginTop: 14, overflow: 'hidden', ...shadow },
  lostImage: { width: '100%', aspectRatio: 1, backgroundColor: '#eee' },
  lostBadge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.lost, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  lostBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  lostBody: { padding: 12 },
  lostName: { fontSize: 16, fontWeight: '800', color: colors.text },
  lostMeta: { fontSize: 12, color: colors.sub, marginTop: 3 },
  lostNotes: { fontSize: 11.5, color: colors.faint, marginTop: 5, lineHeight: 16 },
  callBtnSmall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primarySoft, height: 38, borderRadius: radius.sm, marginTop: 10 },
  callBtnSmallText: { color: colors.primary, fontWeight: '700', fontSize: 13 },

  emptyFeed: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyFeedTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 8 },
  emptyFeedText: { fontSize: 14, color: colors.sub, marginTop: 6 },

  // found / match
  foundCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, alignItems: 'center', ...shadow },
  foundImage: { width: 160, height: 160, borderRadius: radius.md, backgroundColor: '#eee' },
  foundLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 12 },
  colorTag: { backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full, marginTop: 8 },
  colorTagText: { color: colors.primary, fontWeight: '700', fontSize: 13 },

  colorBox: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, marginTop: 16, ...shadow },
  colorBoxTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  colorBoxHint: { fontSize: 13, color: colors.sub, marginTop: 4, marginBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: radius.full, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 14 },

  processing: { alignItems: 'center', paddingVertical: 40 },
  processingText: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 16 },
  processingHint: { fontSize: 13, color: colors.faint, marginTop: 6 },

  noMatch: { alignItems: 'center', paddingVertical: 36 },
  noMatchTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 10 },
  noMatchText: { fontSize: 14, color: colors.sub, marginTop: 6, textAlign: 'center' },

  resultTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 20, marginBottom: 4 },
  matchCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, marginTop: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', ...shadow },
  matchHigh: { borderColor: colors.home },
  rank: { position: 'absolute', top: 8, left: 8, zIndex: 1, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  rankText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  matchImg: { width: 116, height: '100%', minHeight: 150, backgroundColor: '#eee' },
  matchBody: { flex: 1, padding: 13 },
  matchTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  matchName: { fontSize: 18, fontWeight: '800', color: colors.text },
  score: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: radius.sm },
  scoreHigh: { backgroundColor: colors.home },
  scoreMid: { backgroundColor: colors.warn },
  scoreLow: { backgroundColor: colors.faint },
  scoreText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  matchMeta: { fontSize: 13, color: colors.sub, marginTop: 5 },
  lostTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 },
  lostTagText: { color: colors.lost, fontSize: 12, fontWeight: '700' },
  callBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.primary, height: 42, borderRadius: radius.md, marginTop: 11 },
  callBtnText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
  disclaimer: { fontSize: 11.5, color: colors.faint, marginTop: 16, lineHeight: 17, textAlign: 'center' },
});
