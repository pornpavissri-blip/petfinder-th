import { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentCoords } from '../services/location';
import MapPicker from './MapPicker';
import { colors, radius, shadow } from '../theme';

export default function ReportLostForm({ cat, onDone }) {
  const [reward, setReward] = useState('');
  const [lostNote, setLostNote] = useState('');
  const [saving, setSaving] = useState(false);

  // ---- จุดที่น้องหาย ----
  const [locMode, setLocMode] = useState('current'); // current | manual
  const [picked, setPicked] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const handleSubmit = async () => {
    if (locMode === 'manual' && !picked) {
      Alert.alert('ยังไม่ได้เลือกตำแหน่ง', 'แตะ "ปักจุดเอง" แล้วเลือกจุดบนแผนที่ก่อน');
      return;
    }
    setSaving(true);
    try {
      // ใช้ตำแหน่งตามที่เลือก
      let coords;
      if (locMode === 'manual' && picked) coords = picked;
      else coords = await getCurrentCoords();

      const data = {
        status: 'lost',
        lostAt: serverTimestamp(),
        lostNote: lostNote.trim(),
        reward: reward.trim() ? Number(reward.replace(/[^0-9]/g, '')) : 0,
      };
      if (coords) { data.lostLat = coords.lat; data.lostLng = coords.lng; }
      await updateDoc(doc(db, 'cats', cat.id), data);
      Alert.alert(
        'แจ้งหายแล้ว 🔴',
        coords
          ? `โพสต์ของน้อง "${cat.name}" ขึ้นในหน้าค้นหาและแผนที่แล้ว`
          : `โพสต์ขึ้นแล้ว (ไม่ได้บันทึกตำแหน่ง เพราะไม่ได้เปิด GPS)`
      );
      onDone?.();
    } catch (e) {
      console.log('Report lost error:', e);
      Alert.alert('ผิดพลาด', 'ลองใหม่อีกครั้ง');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.catPreview}>
          <Image source={{ uri: `data:image/jpeg;base64,${cat.imageBase64}` }} style={styles.catImg} />
          <View style={{ flex: 1 }}>
            <Text style={styles.catName}>{cat.name}</Text>
            <Text style={styles.catMeta}>สี{cat.color}{cat.breed ? ` • ${cat.breed}` : ''}</Text>
          </View>
        </View>

        {/* เลือกจุดที่น้องหาย */}
        <View style={styles.locChooser}>
          <Text style={styles.locTitle}>📍 จุดที่น้องหาย</Text>
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

        <Text style={styles.label}>💰 เงินรางวัล (ถ้ามี)</Text>
        <View style={styles.rewardWrap}>
          <TextInput
            style={styles.rewardInput}
            placeholder="0"
            placeholderTextColor={colors.faint}
            keyboardType="number-pad"
            value={reward}
            onChangeText={setReward}
          />
          <Text style={styles.baht}>บาท</Text>
        </View>
        <Text style={styles.hint}>ใส่เงินรางวัลช่วยให้คนช่วยตามหามากขึ้น</Text>

        <Text style={styles.label}>เห็นครั้งสุดท้าย / รายละเอียด</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="เช่น หายแถวตลาดเซฟวัน เมื่อเช้า ใส่ปลอกคอแดง ตกใจง่าย"
          placeholderTextColor={colors.faint}
          value={lostNote}
          onChangeText={setLostNote}
          multiline
        />

        <TouchableOpacity style={[styles.submit, saving && { opacity: 0.7 }]} onPress={handleSubmit} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="megaphone" size={20} color="#fff" />
              <Text style={styles.submitText}>ประกาศตามหา</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />

        {/* ตัวเลือกตำแหน่งบนแผนที่ */}
        <MapPicker
          visible={showPicker}
          title="ปักจุดที่น้องหาย"
          initialCoords={picked}
          onCancel={() => { setShowPicker(false); if (!picked) setLocMode('current'); }}
          onConfirm={(c) => { setPicked(c); setShowPicker(false); }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  catPreview: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, ...shadow },
  catImg: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: '#eee' },
  catName: { fontSize: 19, fontWeight: '800', color: colors.text },
  catMeta: { fontSize: 13, color: colors.sub, marginTop: 3 },

  // location chooser
  locChooser: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, marginTop: 16, ...shadow },
  locTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
  locRow: { flexDirection: 'row', gap: 10 },
  locOpt: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border },
  locOptActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  locOptText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  locOptTextActive: { color: '#fff' },
  locPicked: { fontSize: 13, color: colors.sub, marginTop: 12, fontWeight: '600' },

  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 22, marginBottom: 8 },
  rewardWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.rewardSoft, borderRadius: radius.md, paddingHorizontal: 16, height: 56, borderWidth: 1.5, borderColor: '#F3D9A0' },
  rewardInput: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.reward },
  baht: { fontSize: 16, fontWeight: '700', color: colors.reward },
  hint: { fontSize: 12.5, color: colors.faint, marginTop: 7 },

  input: { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  textarea: { height: 110, paddingTop: 14, textAlignVertical: 'top' },

  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.lost, height: 56, borderRadius: radius.md, marginTop: 28 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});