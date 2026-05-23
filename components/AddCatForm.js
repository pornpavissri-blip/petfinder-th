import { useState, useEffect } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { addDoc, collection } from 'firebase/firestore';

export default function AddCatForm({ onClose, onSaved }) {
  const [image, setImage] = useState(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [age, setAge] = useState('');
  const [breed, setBreed] = useState('');
  const [notes, setNotes] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('userPhone').then(p => setUserPhone(p || ''));
  }, []);

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('ต้องการสิทธิ์', 'อนุญาตเข้าถึงรูปก่อน');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('ต้องการสิทธิ์', 'อนุญาตใช้กล้องก่อน');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handlePickImage = () => {
    Alert.alert('เลือกรูปแมว', 'เลือกแหล่งที่มา', [
      { text: '📷 ถ่ายรูป', onPress: takePhoto },
      { text: '🖼️ แกลเลอรี', onPress: pickFromGallery },
      { text: 'ยกเลิก', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    // Validation
    if (!image) {
      Alert.alert('ขาดข้อมูล', 'กรุณาเลือกรูปแมว');
      return;
    }
    if (!name.trim() || !color.trim()) {
      Alert.alert('ขาดข้อมูล', 'กรุณากรอกชื่อและสี');
      return;
    }

    setSaving(true);
    try {
      // 1. Compress + convert to base64
      const compressed = await ImageManipulator.manipulateAsync(
        image,
        [{ resize: { width: 400 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      // 2. Save to Firestore
      await addDoc(collection(db, 'cats'), {
        ownerPhone: userPhone,
        name: name.trim(),
        color: color.trim(),
        breed: breed.trim(),
        age: age.trim(),
        notes: notes.trim(),
        imageBase64: compressed.base64,
        status: 'home',
        createdAt: new Date(),
      });

      Alert.alert('สำเร็จ! 🎉', `เพิ่ม "${name}" เรียบร้อย`, [
        { text: 'OK', onPress: () => {
          if (onSaved) onSaved();
          onClose();
        }}
      ]);
    } catch (error) {
      console.log('Save error:', error);
      Alert.alert('Error', error.message);
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>เพิ่มน้องแมวใหม่ 🐱</Text>

      <TouchableOpacity style={styles.imageBox} onPress={handlePickImage} disabled={saving}>
        {image ? (
          <Image source={{ uri: image }} style={styles.imagePreview} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imageEmoji}>📷</Text>
            <Text style={styles.imageHint}>แตะเพื่อเลือกรูปแมว</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>ชื่อน้อง *</Text>
      <TextInput style={styles.input} placeholder="เช่น ส้ม, ขาว" value={name} onChangeText={setName} editable={!saving} />

      <Text style={styles.label}>สี *</Text>
      <TextInput style={styles.input} placeholder="เช่น ส้ม, ดำ" value={color} onChangeText={setColor} editable={!saving} />

      <Text style={styles.label}>พันธุ์</Text>
      <TextInput style={styles.input} placeholder="เช่น เปอร์เซีย, ไทย" value={breed} onChangeText={setBreed} editable={!saving} />

      <Text style={styles.label}>อายุ (ปี)</Text>
      <TextInput style={styles.input} placeholder="เช่น 2" value={age} onChangeText={setAge} keyboardType="numeric" editable={!saving} />

      <Text style={styles.label}>หมายเหตุ</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="ลักษณะเด่น, นิสัย"
        value={notes} onChangeText={setNotes}
        multiline numberOfLines={3} editable={!saving}
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]} 
          onPress={onClose}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>ยกเลิก</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]} 
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>บันทึก</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  imageBox: { width: '100%', height: 220, marginBottom: 20, borderRadius: 12, overflow: 'hidden' },
  imagePlaceholder: {
    flex: 1, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#ddd', borderStyle: 'dashed', borderRadius: 12,
  },
  imageEmoji: { fontSize: 48, marginBottom: 8 },
  imageHint: { color: '#999', fontSize: 14 },
  imagePreview: { width: '100%', height: '100%' },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, fontSize: 16, marginBottom: 16, backgroundColor: '#fafafa',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  button: { flex: 1, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.5 },
  cancelButton: { backgroundColor: '#f0f0f0' },
  cancelButtonText: { color: '#666', fontSize: 16, fontWeight: 'bold' },
  saveButton: { backgroundColor: '#FF6B35' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});