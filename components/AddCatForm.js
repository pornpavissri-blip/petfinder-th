import { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import CatCamera from './CatCamera';
import { colors, radius, shadow } from '../theme';

export const CAT_COLORS = ['ส้ม', 'ขาว', 'ดำ', 'เทา', 'น้ำตาล', 'ลายเสือ', 'สามสี', 'ขาวดำ'];
export const SEX_OPTIONS = ['ผู้', 'เมีย', 'ไม่ทราบ'];

export default function AddCatForm({ onAdded }) {
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(null);
  const [sex, setSex] = useState(null);
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

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

  const handleSave = async () => {
    if (!imageBase64) { Alert.alert('ยังไม่มีรูป', 'กรุณาเพิ่มรูปน้องแมว'); return; }
    if (!name.trim()) { Alert.alert('ยังไม่มีชื่อ', 'กรุณาตั้งชื่อน้องแมว'); return; }
    if (!color) { Alert.alert('ยังไม่เลือกสี', 'กรุณาเลือกสีน้องแมว'); return; }

    setSaving(true);
    try {
      const ownerPhone = await AsyncStorage.getItem('userPhone');
      await addDoc(collection(db, 'cats'), {
        ownerPhone,
        name: name.trim(),
        color,
        sex: sex || 'ไม่ทราบ',
        breed: breed.trim(),
        age: age.trim(),
        notes: notes.trim(),
        imageBase64,
        status: 'home',
        createdAt: serverTimestamp(),
      });
      Alert.alert('สำเร็จ! 🎉', `เพิ่มน้อง "${name.trim()}" เรียบร้อยแล้ว`);
      onAdded?.();
    } catch (e) {
      console.log('Save error:', e);
      Alert.alert('บันทึกไม่สำเร็จ', 'ลองใหม่อีกครั้ง');
      setSaving(false);
    }
  };

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
          {CAT_COLORS.map((c) => (
            <TouchableOpacity key={c} style={[styles.chip, color === c && styles.chipActive]} onPress={() => setColor(c)}>
              <Text style={[styles.chipText, color === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

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

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>พันธุ์ (ถ้ามี)</Text>
            <TextInput style={styles.input} placeholder="เช่น วิเชียรมาศ" placeholderTextColor={colors.faint} value={breed} onChangeText={setBreed} />
          </View>
          <View style={{ width: 110 }}>
            <Text style={styles.label}>อายุ</Text>
            <TextInput style={styles.input} placeholder="2 ปี" placeholderTextColor={colors.faint} value={age} onChangeText={setAge} />
          </View>
        </View>

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
              <Text style={styles.saveText}>บันทึกน้องแมว</Text>
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
      </ScrollView>
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
  row: { flexDirection: 'row', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.full, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.sub, fontWeight: '600', fontSize: 14 },
  chipTextActive: { color: '#fff' },
  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, height: 56, borderRadius: radius.md, marginTop: 28 },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});