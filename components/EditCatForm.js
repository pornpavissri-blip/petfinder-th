// components/EditCatForm.js
import { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, ScrollView, Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import CatCamera from './CatCamera'; // เรียกใช้กล้องตัวเดียวกับที่ AddCatForm ใช้
import { colors, radius, shadow } from '../theme';

export default function EditCatForm({ cat, onUpdated }) {
  // 🔥 ดึงรูปเก่ามาแสดงเป็นจุดเริ่มต้น
  const [imageUri, setImageUri] = useState(cat.imageBase64 ? `data:image/jpeg;base64,${cat.imageBase64}` : null);
  const [imageBase64, setImageBase64] = useState(cat.imageBase64 || null);
  
  const [name, setName] = useState(cat.name || '');
  const [breed, setBreed] = useState(cat.breed || '');
  const [color, setColor] = useState(cat.color || '');
  const [age, setAge] = useState(cat.age || '');
  const [notes, setNotes] = useState(cat.notes || '');
  const [history, setHistory] = useState(cat.history || '');
  const [submitting, setSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false); // ควบคุมการเปิด-ปิดกล้อง

  // ฟังก์ชันย่อขนาดรูปภาพและแปลงเป็น Base64
  const processImage = async (uri) => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 600 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      setImageUri(result.uri);
      setImageBase64(result.base64); // ได้ Base64 ตัวใหม่พร้อมอัปเดตลงคลับ
    } catch (e) {
      console.log('Image process error:', e);
      Alert.alert('รูปภาพมีปัญหา', 'ลองเลือกรูปใหม่อีกครั้ง');
    }
  };

  // เลือกรูปจากคลังภาพในเครื่อง
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงคลังรูปภาพ'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) processImage(result.assets[0].uri);
  };

  const handleUpdate = async () => {
    if (!imageUri) { Alert.alert('คำเตือน', 'กรุณาใส่รูปภาพน้องแมว'); return; }
    if (!name.trim()) { Alert.alert('คำเตือน', 'กรุณากรอกชื่อน้องแมว'); return; }
    
    setSubmitting(true);
    try {
      // อัปเดตข้อมูลทั้งหมดรวมถึงรูปภาพภาพใหม่ (imageBase64)
      await updateDoc(doc(db, 'cats', cat.id), {
        name: name.trim(), 
        breed: breed.trim(), 
        color: color.trim(), 
        age: age.trim(), 
        notes: notes.trim(), 
        history: history.trim(),
        imageBase64: imageBase64 // ส่งรูปใหม่เข้าคลังไปทดแทนรูปเก่า
      });
      Alert.alert('สำเร็จ', 'อัปเดตข้อมูลและประวัติเรียบร้อยแล้ว');
      onUpdated();
    } catch (e) {
      console.log(e);
      Alert.alert('ผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
    }
    setSubmitting(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      
      {/* 📸 ส่วนเลือก/เปลี่ยนรูปภาพประจำตัวน้องแมว */}
      <Text style={styles.label}>รูปภาพน้องแมว</Text>
      {imageUri ? (
        <View style={styles.imageBox}>
          <Image source={{ uri: imageUri }} style={styles.image} />
          <View style={styles.imageButtonsOverlay}>
            <TouchableOpacity style={styles.miniBtn} onPress={() => setShowCamera(true)}>
              <Ionicons name="camera" size={16} color={colors.primary} />
              <Text style={styles.miniBtnText}>ถ่ายใหม่</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.miniBtn} onPress={pickImage}>
              <Ionicons name="images" size={16} color={colors.primary} />
              <Text style={styles.miniBtnText}>คลังภาพ</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image-outline" size={40} color="#ccc" />
          <View style={styles.imageButtons}>
            <TouchableOpacity style={styles.imgBtn} onPress={() => setShowCamera(true)}>
              <Text style={styles.imgBtnText}>ถ่ายรูป</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imgBtn} onPress={pickImage}>
              <Text style={styles.imgBtnText}>เลือกจากคลัง</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.label}>ชื่อน้องแมว *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="ชื่อน้องแมว" />

      <Text style={styles.label}>สายพันธุ์</Text>
      <TextInput style={styles.input} value={breed} onChangeText={setBreed} placeholder="เช่น เปอร์เซีย, ไทย" />

      <Text style={styles.label}>สี</Text>
      <TextInput style={styles.input} value={breed ? color : ''} value={color} onChangeText={setColor} placeholder="เช่น ขาว-ส้ม, ดำล้วน" />

      <Text style={styles.label}>อายุ</Text>
      <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="เช่น 2 ปี, 5 เดือน" />

      <Text style={styles.label}>หมายเหตุทั่วไป</Text>
      <TextInput style={[styles.input, { height: 60, paddingTop: 10 }]} value={notes} onChangeText={setNotes} placeholder="ข้อมูลเพิ่มเติมสั้นๆ" multiline />

      {/* 📋 ช่องสำหรับกรอกประวัติข้อมูลแมว */}
      <Text style={styles.label}>ประวัติข้อมูลแมว (วัคซีน / ประวัติการรักษา / นิสัย)</Text>
      <TextInput 
        style={[styles.input, styles.textArea]} 
        value={history} 
        onChangeText={setHistory} 
        placeholder="เช่น พิษสุนัขบ้าเข็มล่าสุดเมื่อ 01/69, มีโรคประจำตัวต้องกินยาคุม, นิสัยขี้กลัวคนแปลกหน้า" 
        multiline 
        numberOfLines={4}
      />

      <TouchableOpacity style={[styles.btn, submitting && { opacity: 0.7 }]} onPress={handleUpdate} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>บันทึกข้อมูล</Text>}
      </TouchableOpacity>

      {/* เรียกใช้งานโมดูลกล้องถ่ายรูปส่องกรอบหน้าแมว */}
      <CatCamera
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(uri) => { setShowCamera(false); processImage(uri); }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: '#fff', height: 48, borderRadius: radius.md, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border || '#ccc', color: colors.text, fontSize: 15 },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 10 },
  
  // สไตล์การจัดการรูปภาพ
  imageBox: { borderRadius: radius.lg, overflow: 'hidden', position: 'relative', backgroundColor: '#eee', ...shadow },
  image: { width: '100%', aspectRatio: 1.2, resizeMode: 'cover' },
  imageButtonsOverlay: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', gap: 8 },
  miniBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, ...shadow },
  miniBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  
  imagePlaceholder: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#ccc' },
  imageButtons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  imgBtn: { backgroundColor: colors.primarySoft, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.md },
  imgBtnText: { color: colors.primary, fontWeight: '700' },

  btn: { backgroundColor: colors.primary, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 28, ...shadow },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});