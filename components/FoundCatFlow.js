import { useState } from 'react';
import {
  StyleSheet, Text, View, Image, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { findMatches } from '../services/aiMatch';
import { getCurrentCoords } from '../services/location';
import { CAT_COLORS } from './AddCatForm';
import MapPicker from './MapPicker';
import { colors, radius, shadow } from '../theme';

export default function FoundCatFlow({ foundImageUri, lostCats, finderPhone, onBack, onPinnedDone }) {
  const [step, setStep] = useState('color'); // color | scanning | result | pinned
  const [color, setColor] = useState(null);
  const [results, setResults] = useState([]);
  const [pinning, setPinning] = useState(false);
  const [pinnedInfo, setPinnedInfo] = useState(null);

  // ---- ตำแหน่งที่เจอแมว ----
  const [locMode, setLocMode] = useState('current'); // current | manual
  const [picked, setPicked] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const scan = async (c) => {
    setColor(c);
    setStep('scanning');
    // ⚠️ เทียบกับ "แมวหาย" เท่านั้น (lostCats = status lost)
    const top = await findMatches(c, lostCats);
    setResults(top);
    setStep('result');
  };

  const pin = async (confidence) => {
    if (locMode === 'manual' && !picked) {
      Alert.alert('ยังไม่ได้เลือกตำแหน่ง', 'แตะ "ปักจุดเอง" แล้วเลือกจุดบนแผนที่ก่อน');
      return;
    }
    setPinning(true);
    try {
      // ย่อรูปที่ถ่าย → base64 เก็บไว้โชว์บนแผนที่
      const img = await ImageManipulator.manipulateAsync(
        foundImageUri, [{ resize: { width: 600 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      // ใช้ตำแหน่งตามที่เลือก
      let coords;
      if (locMode === 'manual' && picked) coords = picked;
      else coords = await getCurrentCoords();

      const top = results[0];
      const matched = top && top.similarity >= 0.7 ? top : null;

      const data = {
        finderPhone,
        imageBase64: img.base64,
        color,
        confidence, // 'lost' (มั่นใจว่าหาย) | 'maybe' (อาจเป็นจร/หาย)
        matchedCatId: matched?.id || null,
        matchedCatName: matched?.name || null,
        matchedOwnerPhone: matched?.ownerPhone || null,
        createdAt: serverTimestamp(),
      };
      if (coords) { data.foundLat = coords.lat; data.foundLng = coords.lng; }
      await addDoc(collection(db, 'sightings'), data);

      setPinnedInfo({ confidence, matched, hasCoords: !!coords });
      setStep('pinned');
      onPinnedDone?.();
    } catch (e) {
      console.log('Sighting error:', e);
      Alert.alert('ผิดพลาด', 'ปักหมุดไม่สำเร็จ ลองใหม่');
    }
    setPinning(false);
  };

  const callPhone = (phone) => {
    Alert.alert('โทรออก', `โทรหา ${phone} ?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'โทร', onPress: () => Linking.openURL(`tel:${phone}`) },
    ]);
  };

  const top = results[0];
  const strong = top && top.similarity >= 0.7;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.photoCard}>
        <Image source={{ uri: foundImageUri }} style={styles.photo} />
        <Text style={styles.photoLabel}>แมวที่คุณเจอ</Text>
        {color && <View style={styles.colorTag}><Text style={styles.colorTagText}>สี{color}</Text></View>}
      </View>

      {/* STEP: color */}
      {step === 'color' && (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>น้องแมวสีอะไร?</Text>
          <Text style={styles.boxHint}>เลือกสีเพื่อช่วยให้ระบบเทียบแม่นขึ้น</Text>
          <View style={styles.chips}>
            {CAT_COLORS.map((c) => (
              <TouchableOpacity key={c} style={styles.chip} onPress={() => scan(c)}>
                <Text style={styles.chipText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* STEP: scanning */}
      {step === 'scanning' && (
        <View style={styles.scanning}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.scanText}>กำลังวิเคราะห์ใบหน้าแมว...</Text>
          <Text style={styles.scanHint}>เทียบกับโพสต์แมวหายในระบบ</Text>
        </View>
      )}

      {/* STEP: result */}
      {step === 'result' && (
        <View>
          {strong ? (
            <View style={styles.hitBanner}>
              <Text style={styles.hitEmoji}>🎯</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.hitTitle}>น่าจะเป็นแมวที่หาย!</Text>
                <Text style={styles.hitSub}>ตรงกับโพสต์ "{top.name}" {Math.round(top.similarity * 100)}%</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.resultTitle}>
              {results.length ? 'ผลการเทียบกับแมวหาย' : 'ไม่พบแมวหายที่ตรงกัน'}
            </Text>
          )}

          {results.map((cat) => {
            const pct = Math.round(cat.similarity * 100);
            const high = pct >= 70;
            return (
              <View key={cat.id} style={[styles.matchCard, high && styles.matchHigh]}>
                <Image source={{ uri: `data:image/jpeg;base64,${cat.imageBase64}` }} style={styles.matchImg} />
                <View style={styles.matchBody}>
                  <View style={styles.matchTop}>
                    <Text style={styles.matchName}>{cat.name}</Text>
                    <View style={[styles.score, high ? styles.scoreHigh : styles.scoreLow]}>
                      <Text style={styles.scoreText}>{pct}%</Text>
                    </View>
                  </View>
                  <Text style={styles.matchMeta}>สี{cat.color}{cat.breed ? ` • ${cat.breed}` : ''}</Text>
                  <TouchableOpacity style={styles.callMatch} onPress={() => callPhone(cat.ownerPhone)}>
                    <Ionicons name="call" size={14} color="#fff" />
                    <Text style={styles.callMatchText}>โทรหาเจ้าของ {cat.ownerPhone}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* เลือกตำแหน่งที่เจอ */}
          <View style={styles.locChooser}>
            <Text style={styles.locTitle}>📍 ตำแหน่งที่เจอแมว</Text>
            <View style={styles.locRow}>
              <TouchableOpacity
                style={[styles.locOpt, locMode === 'current' && styles.locOptActive]}
                onPress={() => { setLocMode('current'); setPicked(null); }}
              >
                <Ionicons name="navigate" size={16} color={locMode === 'current' ? '#fff' : colors.primary} />
                <Text style={[styles.locOptText, locMode === 'current' && styles.locOptTextActive]}>ตำแหน่งปัจจุบัน</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.locOpt, locMode === 'manual' && styles.locOptActive]}
                onPress={() => { setLocMode('manual'); setShowPicker(true); }}
              >
                <Ionicons name="map" size={16} color={locMode === 'manual' ? '#fff' : colors.primary} />
                <Text style={[styles.locOptText, locMode === 'manual' && styles.locOptTextActive]}>ปักจุดเอง</Text>
              </TouchableOpacity>
            </View>
            {locMode === 'manual' && (
              <TouchableOpacity onPress={() => setShowPicker(true)}>
                <Text style={styles.locPicked}>
                  {picked
                    ? `📌 ปักไว้ที่ ${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)} (แตะเพื่อแก้)`
                    : 'แตะเพื่อเลือกจุดบนแผนที่'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* เลือกประเภท + ปักหมุด */}
          <View style={styles.pinBox}>
            <Text style={styles.pinTitle}>ปักหมุดแมวตัวนี้บนแผนที่</Text>
            <Text style={styles.pinHint}>เลือกว่าคุณมั่นใจแค่ไหน</Text>

            <TouchableOpacity style={[styles.pinBtn, styles.pinSure]} onPress={() => pin('lost')} disabled={pinning}>
              <View style={[styles.pinDot, { backgroundColor: colors.lost }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.pinBtnTitle, { color: colors.lost }]}>มั่นใจว่าเป็นแมวหาย</Text>
                <Text style={styles.pinBtnSub}>มีปลอกคอ / เป็นพันธุ์เลี้ยง / มาอาศัยตามบ้าน</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.pinBtn, styles.pinMaybe]} onPress={() => pin('maybe')} disabled={pinning}>
              <View style={[styles.pinDot, { backgroundColor: colors.warn }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.pinBtnTitle, { color: '#B8780A' }]}>อาจเป็นแมวจร หรือแมวหาย</Text>
                <Text style={styles.pinBtnSub}>ไม่แน่ใจ ปักไว้เผื่อเจ้าของมาเห็น</Text>
              </View>
            </TouchableOpacity>

            {pinning && <ActivityIndicator color={colors.primary} style={{ marginTop: 14 }} />}
          </View>
        </View>
      )}

      {/* STEP: pinned */}
      {step === 'pinned' && pinnedInfo && (
        <View style={styles.successBox}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successTitle}>ปักหมุดบนแผนที่แล้ว!</Text>
          <View style={[styles.confBadge, { backgroundColor: pinnedInfo.confidence === 'lost' ? colors.lostSoft : colors.rewardSoft }]}>
            <Text style={[styles.confBadgeText, { color: pinnedInfo.confidence === 'lost' ? colors.lost : '#B8780A' }]}>
              {pinnedInfo.confidence === 'lost' ? '🔴 มั่นใจว่าแมวหาย' : '🟡 อาจเป็นจร/หาย'}
            </Text>
          </View>
          {pinnedInfo.matched ? (
            <>
              <Text style={styles.successText}>คล้ายโพสต์ "{pinnedInfo.matched.name}" — ช่วยโทรแจ้งเจ้าของได้เลย</Text>
              <TouchableOpacity style={styles.successCall} onPress={() => callPhone(pinnedInfo.matched.ownerPhone)}>
                <Ionicons name="call" size={18} color="#fff" />
                <Text style={styles.successCallText}>โทรหาเจ้าของ {pinnedInfo.matched.ownerPhone}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.successText}>หมุดขึ้นบนแผนที่แล้ว เจ้าของที่ตามหาอาจมาเห็น</Text>
          )}
          {!pinnedInfo.hasCoords && <Text style={styles.noGps}>* ไม่ได้บันทึกตำแหน่ง (ไม่ได้เปิด GPS)</Text>}
          <TouchableOpacity style={styles.doneBtn} onPress={onBack}><Text style={styles.doneText}>เสร็จสิ้น</Text></TouchableOpacity>
        </View>
      )}

      {/* ตัวเลือกตำแหน่งบนแผนที่ */}
      <MapPicker
        visible={showPicker}
        title="ปักจุดที่เจอแมว"
        initialCoords={picked}
        onCancel={() => { setShowPicker(false); if (!picked) setLocMode('current'); }}
        onConfirm={(c) => { setPicked(c); setShowPicker(false); }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  photoCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, alignItems: 'center', ...shadow },
  photo: { width: 150, height: 150, borderRadius: radius.md, backgroundColor: '#eee' },
  photoLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 12 },
  colorTag: { backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full, marginTop: 8 },
  colorTagText: { color: colors.primary, fontWeight: '700', fontSize: 13 },

  box: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, marginTop: 16, ...shadow },
  boxTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  boxHint: { fontSize: 13, color: colors.sub, marginTop: 4, marginBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: radius.full, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 14 },

  scanning: { alignItems: 'center', paddingVertical: 44 },
  scanText: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 16 },
  scanHint: { fontSize: 13, color: colors.faint, marginTop: 6 },

  hitBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.homeSoft, borderRadius: radius.lg, padding: 16, marginTop: 16, borderWidth: 2, borderColor: colors.home },
  hitEmoji: { fontSize: 34 },
  hitTitle: { fontSize: 18, fontWeight: '800', color: colors.home },
  hitSub: { fontSize: 13.5, color: colors.text, marginTop: 3 },
  resultTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 18 },

  matchCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, marginTop: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', ...shadow },
  matchHigh: { borderColor: colors.home },
  matchImg: { width: 104, minHeight: 124, backgroundColor: '#eee' },
  matchBody: { flex: 1, padding: 13 },
  matchTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  matchName: { fontSize: 17, fontWeight: '800', color: colors.text },
  score: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm },
  scoreHigh: { backgroundColor: colors.home },
  scoreLow: { backgroundColor: colors.faint },
  scoreText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  matchMeta: { fontSize: 13, color: colors.sub, marginTop: 5 },
  callMatch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, height: 38, borderRadius: radius.md, marginTop: 10 },
  callMatchText: { color: '#fff', fontWeight: '700', fontSize: 12.5 },

  // location chooser
  locChooser: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, marginTop: 16, ...shadow },
  locTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
  locRow: { flexDirection: 'row', gap: 10 },
  locOpt: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border },
  locOptActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  locOptText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  locOptTextActive: { color: '#fff' },
  locPicked: { fontSize: 13, color: colors.sub, marginTop: 12, fontWeight: '600' },

  pinBox: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, marginTop: 16, ...shadow },
  pinTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  pinHint: { fontSize: 13, color: colors.sub, marginTop: 4, marginBottom: 14 },
  pinBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, marginTop: 10, borderWidth: 1.5 },
  pinSure: { backgroundColor: colors.lostSoft, borderColor: '#F5C6C6' },
  pinMaybe: { backgroundColor: colors.rewardSoft, borderColor: '#F3D9A0' },
  pinDot: { width: 14, height: 14, borderRadius: 7 },
  pinBtnTitle: { fontSize: 15, fontWeight: '800' },
  pinBtnSub: { fontSize: 12, color: colors.sub, marginTop: 3 },

  successBox: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 26, marginTop: 16, alignItems: 'center', ...shadow },
  successEmoji: { fontSize: 56 },
  successTitle: { fontSize: 21, fontWeight: '800', color: colors.text, marginTop: 8 },
  confBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, marginTop: 12 },
  confBadgeText: { fontSize: 14, fontWeight: '800' },
  successText: { fontSize: 14.5, color: colors.sub, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  successCall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, height: 52, borderRadius: radius.md, marginTop: 16, paddingHorizontal: 20 },
  successCallText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  noGps: { fontSize: 12, color: colors.faint, marginTop: 12 },
  doneBtn: { marginTop: 18, paddingVertical: 12, paddingHorizontal: 30 },
  doneText: { color: colors.primary, fontWeight: '800', fontSize: 16 },
});