import { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Linking, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius, shadow, daysAgo } from '../theme';
import { formatDistance } from '../services/location';
import { getOrCreateChat } from '../services/chatService';

export default function SightingDetail({ sighting, distanceKm, onBack, onViewOnMap, navigation }) {
  const insets = useSafeAreaInsets();
  const [chatLoading, setChatLoading] = useState(false);

  const callFinder = () => {
    Alert.alert('ติดต่อผู้พบเห็น', `โทรหา ${sighting.finderPhone} ?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'โทร', onPress: () => Linking.openURL(`tel:${sighting.finderPhone}`) },
    ]);
  };

  const openChat = async () => {
    setChatLoading(true);
    try {
      const myPhone = await AsyncStorage.getItem('userPhone');
      if (!myPhone) { Alert.alert('ข้อผิดพลาด', 'ไม่พบข้อมูลผู้ใช้'); return; }
      if (myPhone === sighting.finderPhone) { Alert.alert('นี่คือโพสต์ของคุณเอง'); return; }
      const chatId = await getOrCreateChat(myPhone, sighting.finderPhone, {
        catName: sighting.matchedCatName || `แมวสี${sighting.color}`,
        myLabel: `เจ้าของแมว (${myPhone})`,
        otherLabel: `ผู้พบเห็น (${sighting.finderPhone})`,
      });
      navigation?.navigate('Chat', {
        screen: 'ChatRoom',
        params: {
          chatId,
          otherPhone: sighting.finderPhone,
          otherLabel: `ผู้พบเห็น`,
          myPhone,
          catName: sighting.matchedCatName || `แมวสี${sighting.color}`,
        },
      });
    } catch (e) {
      Alert.alert('เปิดแชทไม่สำเร็จ', e.message || 'กรุณาลองใหม่');
    }
    setChatLoading(false);
  };

  const dist = formatDistance(distanceKm);
  const isLost = sighting.confidence === 'lost';

  const handleViewOnMap = () => {
    if (typeof sighting.foundLat === 'number' && typeof sighting.foundLng === 'number') {
      if (onViewOnMap) onViewOnMap({ latitude: sighting.foundLat, longitude: sighting.foundLng, title: `เจอแมวสี${sighting.color}`, catId: sighting.id });
    } else {
      Alert.alert('ไม่พบตำแหน่ง', 'โพสต์นี้ไม่ได้ระบุพิกัดที่ชัดเจนไว้บนแผนที่');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.imgWrap}>
        <Image source={{ uri: `data:image/jpeg;base64,${sighting.imageBase64}` }} style={styles.img} />
        <TouchableOpacity style={[styles.back, { top: insets.top + 6 }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={[styles.lostBadge, { backgroundColor: isLost ? colors.lost : '#B8780A' }]}>
          <Ionicons name={isLost ? 'alert-circle' : 'help-circle'} size={14} color="#fff" />
          <Text style={styles.lostBadgeText}>
            {isLost ? 'มั่นใจว่าแมวหาย' : 'อาจเป็นจร/หาย'} • {daysAgo(sighting.createdAt)}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>เจอแมวสี{sighting.color}</Text>
          {dist && (
            <View style={styles.distChip}>
              <Ionicons name="navigate" size={13} color={colors.primary} />
              <Text style={styles.distText}>{dist}</Text>
            </View>
          )}
        </View>

        {sighting.matchedCatName ? (
          <View style={styles.matchAlert}>
            <Text style={styles.matchAlertText}>🎯 ระบบวิเคราะห์ว่าคล้ายโพสต์ "{sighting.matchedCatName}"</Text>
          </View>
        ) : null}

        {sighting.foundNote ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 บันทึกจากผู้พบเห็น</Text>
            <Text style={styles.sectionText}>{sighting.foundNote}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.mapBtn} onPress={handleViewOnMap} activeOpacity={0.8}>
          <Ionicons name="map" size={20} color={colors.primary} />
          <Text style={styles.mapBtnText}>ดูตำแหน่งบนแผนที่</Text>
        </TouchableOpacity>

        {sighting.finderPhone ? (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.chatBtn} onPress={openChat} activeOpacity={0.85} disabled={chatLoading}>
              {chatLoading
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
              }
              <Text style={styles.chatBtnText}>แชทกับผู้พบเห็น</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.call} onPress={callFinder} activeOpacity={0.85}>
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.callText}>โทร</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.disclaimer}>โปรดตรวจสอบพิกัดและโทรนัดหมายล่วงหน้าอย่างระมัดระวัง</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  imgWrap: { position: 'relative' },
  img: { width: '100%', aspectRatio: 1, backgroundColor: '#eee' },
  back: { position: 'absolute', left: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  lostBadge: { position: 'absolute', bottom: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full },
  lostBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  body: { padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 24, fontWeight: '800', color: colors.text, flex: 1, marginRight: 8 },
  distChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full },
  distText: { color: colors.primary, fontWeight: '700', fontSize: 14 },

  matchAlert: { backgroundColor: colors.rewardSoft, padding: 12, borderRadius: radius.md, marginTop: 14 },
  matchAlertText: { color: colors.reward, fontWeight: '700', fontSize: 13.5 },

  section: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginTop: 16, ...shadow },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 8 },
  sectionText: { fontSize: 15, color: colors.sub, lineHeight: 23 },

  mapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', height: 56, borderRadius: radius.md, marginTop: 24, borderWidth: 1, borderColor: colors.primarySoft, ...shadow },
  mapBtnText: { color: colors.primary, fontSize: 16, fontWeight: '800' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  chatBtn: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primarySoft, height: 56, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary + '40' },
  chatBtnText: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  call: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, height: 56, borderRadius: radius.md },
  callText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  disclaimer: { fontSize: 12, color: colors.faint, textAlign: 'center', marginTop: 12 },
});
