import { useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker'; // 👈 นำเข้า ImagePicker เพิ่มเติม
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

// กล้องในแอป + กรอบเล็งหน้าแมว (เหมือนสแกนใบหน้า) + เลือกรูปจากอัลบั้มได้
// props: visible, onClose, onCapture(uri)
export default function CatCamera({ visible, onClose, onCapture }) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [ready, setReady] = useState(false);
  const [taking, setTaking] = useState(false);

  // 📸 ฟังก์ชันสำหรับกดถ่ายรูป
  const snap = async () => {
    if (!cameraRef.current || !ready || taking) return;
    setTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      onCapture?.(photo.uri);
    } catch (e) {
      console.log('takePicture error:', e);
    }
    setTaking(false);
  };

  // 🖼️ ฟังก์ชันสำหรับเลือกรูปภาพจากคลัง (Gallery)
  const pickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตให้แอปเข้าถึงคลังรูปภาพในตั้งค่าโทรศัพท์ของคุณ');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1], // ตัดภาพเป็นสี่เหลี่ยมจัตุรัสตาม Layout หลัก
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onCapture?.(result.assets[0].uri); // ส่งพาร์ทไฟล์รูปกลับไปทำงานต่อ
      }
    } catch (e) {
      console.log('pickFromGallery error:', e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        {!permission ? (
          // กำลังโหลดสถานะสิทธิ์
          <View style={styles.center}><ActivityIndicator color="#fff" size="large" /></View>
        ) : !permission.granted ? (
          // ยังไม่ได้อนุญาตกล้อง
          <View style={styles.permWrap}>
            <Ionicons name="camera-outline" size={56} color="#fff" />
            <Text style={styles.permTitle}>ขออนุญาตใช้กล้อง</Text>
            <Text style={styles.permText}>เพื่อถ่ายรูปน้องแมวและสแกนใบหน้า</Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.85}>
              <Text style={styles.permBtnText}>อนุญาต</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.permClose} onPress={onClose}>
              <Text style={styles.permCloseText}>ปิด</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              onCameraReady={() => setReady(true)}
            />

            {/* กรอบเล็งหน้าแมว (กดทะลุได้ ไม่บังการแตะ) */}
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame}>
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
              </View>
              <View style={styles.hintPill}>
                <Text style={styles.hintText}>เล็งหน้าน้องให้อยู่ในกรอบ</Text>
              </View>
            </View>

            {/* แถบบน: ปิด / ป้ายสแกน / สลับกล้อง */}
            <View style={[styles.topBar, { top: insets.top + 8 }]}>
              <TouchableOpacity style={styles.iconBtn} onPress={onClose} activeOpacity={0.7}>
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
              <View style={styles.scanTag}>
                <Ionicons name="scan" size={14} color="#fff" />
                <Text style={styles.scanTagText}>สแกนใบหน้าแมว</Text>
              </View>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} activeOpacity={0.7}>
                <Ionicons name="camera-reverse" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* แถบล่างควบคุม: ปุ่มคลังภาพ / ปุ่มถ่ายรูปชัตเตอร์ / เว้นพื้นที่สมดุลฝั่งซ้าย */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
              <Text style={styles.shutterHint}>{ready ? 'แตะเพื่อถ่ายรูป' : 'กำลังเปิดกล้อง...'}</Text>
              
              <View style={styles.controlsRow}>
                {/* ดัมมี่เปล่าๆ ไว้ทางซ้ายเพื่อจัดตำแหน่งให้ปุ่มชัตเตอร์อยู่ตรงกลางเป๊ะพอดี */}
                <View style={styles.sideButtonDummy} />

                {/* ปุ่มชัตเตอร์ถ่ายรูป */}
                <TouchableOpacity style={styles.shutter} onPress={snap} disabled={!ready || taking} activeOpacity={0.8}>
                  {taking ? <ActivityIndicator color={colors.primary} /> : <View style={styles.shutterInner} />}
                </TouchableOpacity>

                {/* ปุ่มเปิดคลังภาพ (Gallery Button) */}
                <TouchableOpacity style={[styles.iconBtn, styles.galleryBtn]} onPress={pickFromGallery} activeOpacity={0.7}>
                  <Ionicons name="images" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const FRAME = 280;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // permission screen
  permWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36 },
  permTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 16 },
  permText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 21 },
  permBtn: { backgroundColor: colors.primary, paddingHorizontal: 32, height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 26 },
  permBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  permClose: { marginTop: 16, padding: 10 },
  permCloseText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },

  // face-scan overlay
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: { width: FRAME, height: FRAME },
  corner: { position: 'absolute', width: 38, height: 38, borderColor: '#fff' },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  hintPill: { position: 'absolute', top: '50%', marginTop: FRAME / 2 + 16, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  hintText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // top bar
  topBar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  scanTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.secondary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  scanTagText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // bottom controls layout
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 14 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 36 },
  sideButtonDummy: { width: 44, height: 44 }, // ตัวค้ำบาลานซ์ฝั่งซ้าย
  galleryBtn: { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  shutterHint: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },

});

