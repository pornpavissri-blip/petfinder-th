import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, daysAgo } from '../theme';
import { formatDistance } from '../services/location';

export default function SightingDetail({ sighting, distanceKm, onBack }) {
  const insets = useSafeAreaInsets();
  const isLost = sighting.confidence === 'lost';
  const dist = formatDistance(distanceKm);

  const call = (phone) => {
    Alert.alert('โทรออก', `โทรหา ${phone} ?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'โทร', onPress: () => Linking.openURL(`tel:${phone}`) },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.imgWrap}>
        <Image source={{ uri: `data:image/jpeg;base64,${sighting.imageBase64}` }} style={styles.img} />
        <TouchableOpacity style={[styles.back, { top: insets.top + 6 }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={[styles.badge, { backgroundColor: isLost ? colors.lost : colors.warn }]}>
          <Ionicons name="camera" size={14} color="#fff" />
          <Text style={styles.badgeText}>{isLost ? 'มั่นใจว่าแมวหาย' : 'อาจเป็นจร/หาย'}</Text>
        </View>
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

  body: { padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, flex: 1 },
  distChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full },
  distText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  meta: { fontSize: 14, color: colors.sub, marginTop: 6 },

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