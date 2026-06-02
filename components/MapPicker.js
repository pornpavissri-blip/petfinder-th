import { useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCurrentCoords } from '../services/location';
import { colors, radius, shadow } from '../theme';

const DEFAULT = { latitude: 14.9799, longitude: 102.0978, latitudeDelta: 0.05, longitudeDelta: 0.05 };

// ตัวเลือกตำแหน่งบนแผนที่ — เลื่อนแผนที่ให้หมุดกลางจอตรงจุดที่ต้องการ แล้วกดยืนยัน
export default function MapPicker({ visible, initialCoords, title = 'เลือกตำแหน่ง', onCancel, onConfirm }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const [locating, setLocating] = useState(false);

  const start = initialCoords
    ? { latitude: initialCoords.lat, longitude: initialCoords.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : DEFAULT;
  const [region, setRegion] = useState(start);

  const useMyLocation = async () => {
    setLocating(true);
    const c = await getCurrentCoords();
    setLocating(false);
    if (!c) return;
    const r = { latitude: c.lat, longitude: c.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    setRegion(r);
    mapRef.current?.animateToRegion(r, 500);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerBtn} />
        </View>

        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={start}
            onRegionChangeComplete={setRegion}
          />

          {/* หมุดกลางจอ (ปลายหมุดชี้จุดที่จะบันทึก) */}
          <View pointerEvents="none" style={styles.centerPin}>
            <Ionicons name="location" size={46} color={colors.lost} />
          </View>

          <TouchableOpacity style={styles.myLoc} onPress={useMyLocation} activeOpacity={0.85}>
            {locating
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Ionicons name="locate" size={22} color={colors.primary} />}
          </TouchableOpacity>

          <View style={styles.hintWrap}>
            <Text style={styles.hint}>เลื่อนแผนที่ให้หมุดอยู่ตรงจุดที่ต้องการ</Text>
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={styles.confirm}
            onPress={() => onConfirm({ lat: region.latitude, lng: region.longitude })}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.confirmText}>ยืนยันตำแหน่งนี้</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: colors.text },

  // วางหมุดไว้กลางจอพอดี (ปลายหมุดอยู่ที่จุดกึ่งกลาง)
  centerPin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -23, marginTop: -46 },

  myLoc: { position: 'absolute', right: 16, bottom: 20, width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow },
  hintWrap: { position: 'absolute', top: 14, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full },
  hint: { color: '#fff', fontSize: 13, fontWeight: '600' },

  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  confirm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, height: 54, borderRadius: radius.md },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});