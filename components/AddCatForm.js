import { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import CatCamera from './CatCamera';
import DOBPicker from './DOBPicker';
import { colors, radius, shadow, ageText, formatBirthDate } from '../theme';

export const CAT_COLORS = [
  'ส้ม', 'ขาว', 'ดำ', 'เทา', 'น้ำตาล', 'ครีม', 'ทอง',
  'ลายเสือ', 'ลายสลิด', 'สามสี', 'กระดองเต่า',
  'ขาวดำ', 'ขาวส้ม', 'เทาขาว', 'บลู (เทาน้ำเงิน)',
];
export const SEX_OPTIONS = ['ผู้', 'เมีย', 'ไม่ทราบ'];
export const CAT_BREEDS = [
  'ไทย/พันทาง', 'วิเชียรมาศ', 'โคราช (สีสวาด)', 'ขาวมณี', 'ศุภลักษณ์',
  'เปอร์เซีย', 'สก็อตติชโฟลด์', 'บริติชชอร์ตแฮร์', 'อเมริกันชอร์ตแฮร์',
  'เมนคูน', 'เบงกอล', 'แร็กดอลล์', 'สฟิงซ์', 'มันช์กิน', 'เอ็กโซติก',
];

// editCat = ส่งมาเมื่ออยู่ในโหมด "แก้ไข" (เติมข้อมูลเดิม + บันทึกทับ)
export default function AddCatForm({ onAdded, editCat }) {
  const isEdit = !!editCat;

  // ---- รูป ----
  const [imageUri, setImageUri] = useState(editCat ? `data:image/jpeg;base64,${editCat.imageBase64}` : null);
  const [imageBase64, setImageBase64] = useState(editCat?.imageBase64 || null);
  const [name, setName] = useState(editCat?.name || '');

  // ---- สี (มีตัวเลือก + พิมพ์เอง) ----
  const editColorIsCustom = !!editCat?.color && !CAT_COLORS.includes(editCat.color);
  const [colorMode, setColorMode] = useState(editColorIsCustom ? 'custom' : 'preset'); // preset | custom
  const [color, setColor] = useState(editColorIsCustom ? null : (editCat?.color || null));
  const [customColor, setCustomColor] = useState(editColorIsCustom ? editCat.color : '');

  const [sex, setSex] = useState(editCat?.sex || null);

  // ---- พันธุ์ (ดรอปดาวน์ + พิมพ์เอง) ----
  const editBreedIsCustom = !!editCat?.breed && !CAT_BREEDS.includes(editCat.breed);
  const [breed, setBreed] = useState(editCat?.breed || '');
  const [breedCustom, setBreedCustom] = useState(editBreedIsCustom);
  const [showBreed, setShowBreed] = useState(false);

  // ---- วันเกิด (เลือกไม่ทราบได้) ----
  const [birthDate, setBirthDate] = useState(editCat?.birthDate || null); // 'YYYY-MM-DD'
  const [ageUnknown, setAgeUnknown] = useState(editCat?.ageUnknown || false);

  const [notes, setNotes] = useState(editCat?.notes || '');
  const [saving, setSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showDOB, setShowDOB] = useState(false);

  const effectiveColor = colorMode === 'custom' ? customColor.trim() : color;

  const processImage = async (uri) => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 600 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      setImageUri(result.uri);
      setImageBase64(result.base64);
    } catch (e) {
      console.log('Image process error:', e);
      Alert.alert('รูปภาพมีปัญหา', 'ลองเลือกรูปใหม่อีกครั้ง');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงคลังรูปภาพ'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) processImage(result.assets[0].uri);
  };

  const pickBreed = (b) => {
    if (b === '__custom__') { setBreedCustom(true); setBreed(''); }
    else { setBreedCustom(false); setBreed(b); }
    setShowBreed(false);
  };

  const handleSave = async () => {
    if (!imageBase64) { Alert.alert('ยังไม่มีรูป', 'กรุณาเพิ่มรูปน้องแมว'); return; }
    if (!name.trim()) { Alert.alert('ยังไม่มีชื่อ', 'กรุณาตั้งชื่อน้องแมว'); return; }
    if (!effectiveColor) { Alert.alert('ยังไม่เลือกสี', 'กรุณาเลือกหรือพิมพ์สีน้องแมว'); return; }

    setSaving(true);
    try {
      const common = {
        name: name.trim(),
        color: effectiveColor,
        sex: sex || 'ไม่ทราบ',
        breed: breed.trim(),
        birthDate: ageUnknown ? '' : (birthDate || ''),
        ageUnknown: !!ageUnknown,
        notes: notes.trim(),
        imageBase64,
      };
      if (isEdit) {
        await updateDoc(doc(db, 'cats', editCat.id), common);
        Alert.alert('บันทึกแล้ว ✏️', `อัปเดตข้อมูลน้อง "${name.trim()}" เรียบร้อย`);
      } else {
        const ownerPhone = await AsyncStorage.getItem('userPhone');
        await addDoc(collection(db, 'cats'), {
          ownerPhone, ...common, status: 'home', createdAt: serverTimestamp(),
        });
        Alert.alert('สำเร็จ! 🎉', `เพิ่มน้อง "${name.trim()}" เรียบร้อยแล้ว`);
      }
      onAdded?.();
    } catch (e) {
      console.log('Save error:', e);
      Alert.alert('บันทึกไม่สำเร็จ', 'ลองใหม่อีกครั้ง');
      setSaving(false);
    }
  };

  const breedLabel = breed || (breedCustom ? 'อื่นๆ (พิมพ์เอง)' : 'เลือกสายพันธุ์');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {imageUri ? (
          <TouchableOpacity onPress={() => setShowCamera(true)} style={styles.imageBox} activeOpacity={0.9}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            <View style={styles.imageEdit}>
              <Ionicons name="camera" size={16} color="#fff" />
              <Text style={styles.imageEditText}>ถ่ายใหม่</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={48} color={colors.faint} />
            <Text style={styles.placeholderText}>เพิ่มรูปน้องแมว</Text>
            <View style={styles.imageButtons}>
              <TouchableOpacity style={styles.imgBtn} onPress={() => setShowCamera(true)}>
                <Ionicons name="camera" size={18} color={colors.primary} />
                <Text style={styles.imgBtnText}>ถ่ายรูป</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imgBtn} onPress={pickImage}>
                <Ionicons name="images" size={18} color={colors.primary} />
                <Text style={styles.imgBtnText}>เลือกจากคลัง</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.label}>ชื่อน้องแมว *</Text>
        <TextInput style={styles.input} placeholder="เช่น สมโชค" placeholderTextColor={colors.faint} value={name} onChangeText={setName} />

        <Text style={styles.label}>สี *</Text>
        <View style={styles.chips}>
          {CAT_COLORS.map((c) => {
            const active = colorMode === 'preset' && color === c;
            return (
              <TouchableOpacity key={c} style={[styles.chip, active && styles.chipActive]} onPress={() => { setColorMode('preset'); setColor(c); }}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.chip, colorMode === 'custom' && styles.chipActive]}
            onPress={() => setColorMode('custom')}
          >
            <Ionicons name="create-outline" size={13} color={colorMode === 'custom' ? '#fff' : colors.sub} style={{ marginRight: 4 }} />
            <Text style={[styles.chipText, colorMode === 'custom' && styles.chipTextActive]}>อื่นๆ</Text>
          </TouchableOpacity>
        </View>
        {colorMode === 'custom' && (
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            placeholder="พิมพ์สีเอง เช่น ส้มลายขาว, เทาควันบุหรี่"
            placeholderTextColor={colors.faint}
            value={customColor}
            onChangeText={setCustomColor}
          />
        )}

        <Text style={styles.label}>เพศ</Text>
        <View style={styles.chips}>
          {SEX_OPTIONS.map((s) => {
            const icon = s === 'ผู้' ? 'male' : s === 'เมีย' ? 'female' : 'help';
            const active = sex === s;
            return (
              <TouchableOpacity key={s} style={[styles.chip, active && styles.chipActive]} onPress={() => setSex(s)}>
                <Ionicons name={icon} size={14} color={active ? '#fff' : colors.sub} style={{ marginRight: 5 }} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>พันธุ์ (ถ้ามี)</Text>
        <TouchableOpacity style={styles.selectField} onPress={() => setShowBreed(true)} activeOpacity={0.8}>
          <Ionicons name="paw" size={18} color={colors.primary} />
          <Text style={[styles.selectText, !breed && !breedCustom && { color: colors.faint }]}>{breedLabel}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.faint} />
        </TouchableOpacity>
        {breedCustom && (
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            placeholder="พิมพ์สายพันธุ์เอง"
            placeholderTextColor={colors.faint}
            value={breed}
            onChangeText={setBreed}
          />
        )}

        <Text style={styles.label}>วันเกิด</Text>
        {!ageUnknown && (
          <TouchableOpacity style={styles.selectField} onPress={() => setShowDOB(true)} activeOpacity={0.8}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
            <Text style={[styles.selectText, !birthDate && { color: colors.faint }]}>
              {birthDate ? formatBirthDate(birthDate) : 'เลือกวันเกิดน้อง'}
            </Text>
            {birthDate ? <Text style={styles.dobAge}>อายุ {ageText(birthDate)}</Text> : null}
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => { const v = !ageUnknown; setAgeUnknown(v); if (v) setBirthDate(null); }}
          activeOpacity={0.7}
        >
          <Ionicons name={ageUnknown ? 'checkbox' : 'square-outline'} size={22} color={ageUnknown ? colors.primary : colors.faint} />
          <Text style={styles.checkText}>ไม่ทราบวันเกิด (เช่น รับน้องมาเลี้ยง)</Text>
        </TouchableOpacity>

        <Text style={styles.label}>ลักษณะเด่น / หมายเหตุ</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="เช่น มีจุดขาวที่อก ใส่ปลอกคอสีฟ้า ขี้อ้อน"
          placeholderTextColor={colors.faint}
          value={notes} onChangeText={setNotes} multiline
        />

        <TouchableOpacity style={[styles.save, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveText}>{isEdit ? 'บันทึกการแก้ไข' : 'บันทึกน้องแมว'}</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />

        {/* กล้องในแอป + กรอบเล็งหน้าแมว */}
        <CatCamera
          visible={showCamera}
          onClose={() => setShowCamera(false)}
          onCapture={(uri) => { setShowCamera(false); processImage(uri); }}
        />
        {/* ตัวเลือกวันเกิด */}
        <DOBPicker
          visible={showDOB}
          value={birthDate}
          onCancel={() => setShowDOB(false)}
          onConfirm={(s) => { setBirthDate(s); setAgeUnknown(false); setShowDOB(false); }}
        />
      </ScrollView>

      {/* ดรอปดาวน์เลือกสายพันธุ์ */}
      <Modal visible={showBreed} transparent animationType="slide" onRequestClose={() => setShowBreed(false)}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setShowBreed(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.breedSheet} onPress={() => {}}>
            <View style={styles.grabber} />
            <Text style={styles.breedTitle}>เลือกสายพันธุ์</Text>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {CAT_BREEDS.map((b) => {
                const active = !breedCustom && breed === b;
                return (
                  <TouchableOpacity key={b} style={styles.breedRow} onPress={() => pickBreed(b)}>
                    <Text style={[styles.breedRowText, active && { color: colors.primary, fontWeight: '800' }]}>{b}</Text>
                    {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.breedRow} onPress={() => pickBreed('__custom__')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={[styles.breedRowText, { color: colors.primary, fontWeight: '700' }]}>อื่นๆ (พิมพ์เอง)</Text>
                </View>
                {breedCustom && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  imageBox: { borderRadius: radius.lg, overflow: 'hidden', ...shadow },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#eee' },
  imageEdit: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full },
  imageEditText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  imagePlaceholder: { backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: 32, alignItems: 'center', borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed' },
  placeholderText: { color: colors.sub, fontSize: 15, fontWeight: '600', marginTop: 10, marginBottom: 16 },
  imageButtons: { flexDirection: 'row', gap: 12 },
  imgBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.primarySoft, paddingHorizontal: 18, paddingVertical: 11, borderRadius: radius.full },
  imgBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 20, marginBottom: 8 },
  input: { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 16, height: 52, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  textarea: { height: 96, paddingTop: 14, textAlignVertical: 'top' },

  selectField: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: colors.border },
  selectText: { flex: 1, fontSize: 16, color: colors.text },
  dobAge: { fontSize: 13, fontWeight: '700', color: colors.primary },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingVertical: 4 },
  checkText: { fontSize: 14.5, color: colors.text, fontWeight: '600' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.full, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.sub, fontWeight: '600', fontSize: 14 },
  chipTextActive: { color: '#fff' },

  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, height: 56, borderRadius: radius.md, marginTop: 28 },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // breed dropdown sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  breedSheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 12 },
  breedTitle: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  breedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, borderBottomWidth: 1, borderBottomColor: colors.border },
  breedRowText: { fontSize: 16, color: colors.text, fontWeight: '600' },
});