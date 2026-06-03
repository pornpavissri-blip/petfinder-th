import { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Linking, Alert, Dimensions, Modal, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, daysAgo } from '../theme';
import { formatDistance } from '../services/location';

export default function SightingDetail({ sighting, distanceKm, onBack }) {
  const insets = useSafeAreaInsets();
  const isLost = sighting.confidence === 'lost';
  const dist = formatDistance(distanceKm);

  const { width } = Dimensions.get('window');
  const images = sighting.images?.length ? sighting.images : [sighting.imageBase64];
  const [index, setIndex] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const hasLoc = typeof sighting.foundLat === 'number';

  const call = (phone) => {
    Alert.alert('โทรออก', `โทรหา ${phone} ?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'โทร', onPress: () => Linking.openURL(`tel:${phone}`) },
    ]);
  };

  const openExternalMaps = () => {
    const lat = sighting.foundLat, lng = sighting.foundLng;
    const label = encodeURIComponent('ตำแหน่งที่เจอแมว');
    const url = Platform.select({
      ios: `http://maps.apple.com/?ll=${lat},${lng}&q=${label}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.imgWrap}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {images.map((b64, i) => (
            <Image key={i} source={{ uri: `data:image/jpeg;base64,${b64}` }} style={{ width, height: width, backgroundColor: '#eee' }} />
          ))}
        </ScrollView>
        <TouchableOpacity style={[styles.back, { top: insets.top + 6 }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={[styles.badge, { backgroundColor: isLost ? colors.lost : colors.warn }]}>
          <Ionicons name="camera" size={14} color="#fff" />
          <Text style={styles.badgeText}>{isLost ? 'มั่นใจว่าแมวหาย' : 'อาจเป็นจร/หาย'}</Text>
        </View>
        {images.length > 1 && (
          <>
            <View style={[styles.counter, { top: insets.top + 6 }]}>
              <Text style={styles.counterText}>{index + 1}/{images.length}</Text>
            </View>
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
              ))}
            </View>
          </>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>มีคนเจอแมวสี{sighting.color}</Text>
          {dist && (
            <View style={styles.distChip}>
              <Ionicons name="navigate" size={13} color={colors.primary} />
              <Text style={styles.distText}>{dist}</Text>
            </View>
          )}
        </View>
        <Text style={styles.meta}>เจอเมื่อ {daysAgo(sighting.createdAt)}</Text>

        {hasLoc && (
          <TouchableOpacity style={styles.locBtn} onPress={() => setShowMap(true)} activeOpacity={0.85}>
            <Ionicons name="location" size={18} color={colors.primary} />
            <Text style={styles.locBtnText}>ดูตำแหน่งที่เจอบนแผนที่</Text>
            {dist && <Text style={styles.locBtnDist}>{dist}</Text>}
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </TouchableOpacity>
        )}

        {sighting.matchedCatName ? (
          <View style={styles.matchBox}>
            <Text style={styles.matchTitle}>🎯 ระบบว่าคล้ายโพสต์แมวหาย</Text>
            <Text style={styles.matchName}>"{sighting.matchedCatName}"</Text>
            {sighting.matchedOwnerPhone && (
              <TouchableOpacity style={styles.matchCall} onPress={() => call(sighting.matchedOwnerPhone)}>
                <Ionicons name="call" size={16} color="#fff" />
                <Text style={styles.matchCallText}>โทรหาเจ้าของโพสต์ {sighting.matchedOwnerPhone}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 ติดต่อคนที่เจอแมว</Text>
          <Text style={styles.sectionText}>ถ้านี่คือแมวของคุณ โทรหาคนที่เจอเพื่อสอบถามและนัดรับน้อง</Text>
        </View>

        <TouchableOpacity style={styles.call} onPress={() => call(sighting.finderPhone)} activeOpacity={0.85}>
          <Ionicons name="call" size={20} color="#fff" />
          <Text style={styles.callText}>โทรหาคนที่เจอ {sighting.finderPhone}</Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>โปรดยืนยันลักษณะน้องให้แน่ใจก่อนนัดรับ</Text>
      </View>

      {/* ดูตำแหน่งบนแผนที่ */}
      {hasLoc && (
        <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <MapView
              style={{ flex: 1 }}
              initialRegion={{ latitude: sighting.foundLat, longitude: sighting.foundLng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
            >
              <Marker
                coordinate={{ latitude: sighting.foundLat, longitude: sighting.foundLng }}
                pinColor={isLost ? 'red' : 'orange'}
                title="ตำแหน่งที่เจอแมว"
                description={`แมวสี${sighting.color}`}
              />
            </MapView>
            <TouchableOpacity style={[styles.mapClose, { top: insets.top + 8 }]} onPress={() => setShowMap(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={[styles.mapBottom, { paddingBottom: insets.bottom + 16 }]}>
              <Text style={styles.mapTitle}>📍 จุดที่เจอแมวสี{sighting.color}</Text>
              <TouchableOpacity style={styles.navBtn} onPress={openExternalMaps} activeOpacity={0.85}>
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={styles.navBtnText}>เปิดในแอปแผนที่ (นำทาง)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  imgWrap: { position: 'relative' },
  img: { width: '100%', aspectRatio: 1, backgroundColor: '#eee' },
  back: { position: 'absolute', left: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', bottom: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  counter: { position: 'absolute', right: 16, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: radius.full },
  counterText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  dots: { position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { backgroundColor: '#fff', width: 20 },

  body: { padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, flex: 1 },
  distChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full },
  distText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  meta: { fontSize: 14, color: colors.sub, marginTop: 6 },

  locBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primarySoft, borderRadius: radius.md, paddingHorizontal: 16, height: 52, marginTop: 14 },
  locBtnText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  locBtnDist: { fontSize: 13, fontWeight: '700', color: colors.primary },
  mapClose: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  mapBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: 20, paddingTop: 18 },
  mapTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 14 },
  navBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, height: 52, borderRadius: radius.md },
  navBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  matchBox: { backgroundColor: colors.homeSoft, borderRadius: radius.lg, padding: 16, marginTop: 18, borderWidth: 1.5, borderColor: colors.home },
  matchTitle: { fontSize: 14, fontWeight: '800', color: colors.home },
  matchName: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 },
  matchCall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.home, height: 46, borderRadius: radius.md, marginTop: 12 },
  matchCallText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },

  section: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginTop: 16, ...shadow },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 8 },
  sectionText: { fontSize: 14.5, color: colors.sub, lineHeight: 22 },

  call: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, height: 56, borderRadius: radius.md, marginTop: 24 },
  callText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  disclaimer: { fontSize: 12, color: colors.faint, textAlign: 'center', marginTop: 12 },
});