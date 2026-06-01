import { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentCoords } from '../services/location';
import { colors, radius, shadow } from '../theme';

export default function ReportLostForm({ cat, onDone }) {
  const [reward, setReward] = useState('');
  const [lostNote, setLostNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const coords = await getCurrentCoords();
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

        <View style={styles.locBox}>
          <Ionicons name="location" size={20} color={colors.lost} />
          <Text style={styles.locText}>ระบบจะบันทึก "ตำแหน่งที่คุณอยู่ตอนนี้" เป็นจุดที่น้องหาย</Text>
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

  locBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.lostSoft, borderRadius: radius.md, padding: 14, marginTop: 16 },
  locText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },

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
