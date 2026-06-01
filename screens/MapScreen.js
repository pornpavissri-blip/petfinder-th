import { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import GradientHeader from '../components/GradientHeader';
import { colors, radius, shadow, statusInfo } from '../theme';

// ศูนย์กลางเริ่มต้น: นครราชสีมา
const DEFAULT_REGION = {
  latitude: 14.9799,
  longitude: 102.0978,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

// pin color ตามสถานะ
function pinColor(status) {
  if (status === 'lost') return colors.lost;
  if (status === 'found') return colors.found;
  return colors.home;
}

// กระจาย marker ที่ทับกันเล็กน้อย (ตำแหน่งโดยประมาณ)
function spread(value, index) {
  return value + ((index % 6) - 2.5) * 0.0035;
}

export default function MapScreen() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCats = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'cats'));
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => typeof c.homeLat === 'number' && typeof c.homeLng === 'number');
      setCats(data);
    } catch (e) { console.log('Map fetch error:', e); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchCats(); }, [fetchCats]));

  const lostCount = cats.filter((c) => c.status === 'lost').length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientHeader
        title="แผนที่"
        subtitle={cats.length ? `${cats.length} ตำแหน่ง • หายอยู่ ${lostCount}` : 'ตำแหน่งน้องแมวโดยประมาณ'}
        emoji="🗺️"
      />

      <View style={styles.mapWrap}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <>
            <MapView style={StyleSheet.absoluteFill} initialRegion={DEFAULT_REGION}>
              {cats.map((cat, idx) => (
                <Marker
                  key={cat.id}
                  coordinate={{ latitude: spread(cat.homeLat, idx), longitude: spread(cat.homeLng, idx + 3) }}
                  pinColor={pinColor(cat.status)}
                >
                  <Callout tooltip>
                    <View style={styles.callout}>
                      <Text style={styles.calloutName}>{cat.name}</Text>
                      <Text style={styles.calloutMeta}>สี{cat.color}</Text>
                      <View style={[styles.calloutBadge, { backgroundColor: statusInfo(cat.status).soft }]}>
                        <Text style={[styles.calloutBadgeText, { color: statusInfo(cat.status).color }]}>
                          {statusInfo(cat.status).label}
                        </Text>
                      </View>
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>

            {/* legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: colors.lost }]} /><Text style={styles.legendText}>หาย</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: colors.home }]} /><Text style={styles.legendText}>อยู่บ้าน</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: colors.found }]} /><Text style={styles.legendText}>พบแล้ว</Text>
              </View>
            </View>

            {cats.length === 0 && (
              <View style={styles.emptyOverlay}>
                <View style={styles.emptyCard}>
                  <Ionicons name="location-outline" size={40} color={colors.primary} />
                  <Text style={styles.emptyTitle}>ยังไม่มีตำแหน่ง</Text>
                  <Text style={styles.emptyText}>เพิ่มน้องแมว (พร้อมอนุญาตตำแหน่ง){'\n'}เพื่อแสดงบนแผนที่</Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: { flex: 1, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  callout: { backgroundColor: '#fff', borderRadius: radius.md, padding: 12, minWidth: 130, ...shadow },
  calloutName: { fontSize: 16, fontWeight: '800', color: colors.text },
  calloutMeta: { fontSize: 13, color: colors.sub, marginTop: 2 },
  calloutBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full, marginTop: 8 },
  calloutBadgeText: { fontSize: 12, fontWeight: '700' },

  legend: {
    position: 'absolute', top: 14, right: 14, backgroundColor: '#fff',
    borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14, gap: 8, ...shadow,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 11, height: 11, borderRadius: 6 },
  legendText: { fontSize: 12.5, fontWeight: '600', color: colors.text },

  emptyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(246,247,251,0.6)' },
  emptyCard: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 28, alignItems: 'center', marginHorizontal: 40, ...shadow },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 10 },
  emptyText: { fontSize: 13.5, color: colors.sub, marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
