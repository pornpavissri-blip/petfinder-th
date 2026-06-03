import { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Linking, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius, shadow, daysAgo } from '../theme';
import { formatDistance } from '../services/location';
import { getOrCreateChat } from '../services/chatService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PostDetail({ cat, distanceKm, onBack, navigation }) {
  const insets = useSafeAreaInsets();
  const [chatLoading, setChatLoading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0); // เก็บตำแหน่งรูปปัจจุบันที่เลื่อนอยู่

  // รวมรูปหลัก และ รูปเสริม (ถ้ามี) เข้าไว้ด้วยกันในอาร์เรย์เดียวเพื่อใช้วนนลูปสไลด์
  const allImages = [
    cat.imageBase64,
    ...(cat.extraImages || [])
  ].filter(Boolean); // กรองค่าเผื่อกรณีข้อมูลเป็น null หรือ undefined

  const openChat = async () => {
    setChatLoading(true);
    try {
      const myPhone = await AsyncStorage.getItem('userPhone');
      if (!myPhone) { Alert.alert('ข้อผิดพลาด', 'ไม่พบข้อมูลผู้ใช้'); return; }
      if (myPhone === cat.ownerPhone) { Alert.alert('นี่คือโพสต์ของคุณเอง'); return; }
      const chatId = await getOrCreateChat(myPhone, cat.ownerPhone, {
        catName: cat.name,
        myLabel: `ผู้พบเห็น (${myPhone})`,
        otherLabel: `เจ้าของแมว (${cat.ownerPhone})`,
      });
      navigation?.navigate('Chat', {
        screen: 'ChatRoom',
        params: {
          chatId,
          otherPhone: cat.ownerPhone,
          otherLabel: `เจ้าของแมว`,
          myPhone,
          catName: cat.name,
        },
      });
    } catch (e) {
      Alert.alert('เปิดแชทไม่สำเร็จ', e.message || 'กรุณาลองใหม่');
    }
    setChatLoading(false);
  };

  const callOwner = () => {
    Alert.alert('ติดต่อเจ้าของ', `โทรหา ${cat.ownerPhone} ?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'โทร', onPress: () => Linking.openURL(`tel:${cat.ownerPhone}`) },
    ]);
  };

  // คอยคำนวณว่าตอนผู้ใช้รูดสไลด์ภาพ อยู่ที่รูปที่เท่าไหร่แล้ว
  const handleScroll = (event) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (slide !== activeImageIndex) {
      setActiveImageIndex(slide);
    }
  };

  const dist = formatDistance(distanceKm);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* 🖼️ ส่วนแสดงสไลด์รูปภาพเลื่อนได้ */}
      <View style={styles.imgWrap}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.imageSlider}
        >
          {allImages.map((b64, index) => (
            <Image
              key={index}
              source={{ uri: `data:image/jpeg;base64,${b64}` }}
              style={styles.img}
            />
          ))}
        </ScrollView>

        {/* ปุ่มกดกลับ (Overlay อยู่บนรูป) */}
        <TouchableOpacity style={[styles.back, { top: insets.top + 6 }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        {/* แท็กสถานะกำลังตามหา */}
        <View style={styles.lostBadge}>
          <Ionicons name="alert-circle" size={14} color="#fff" />
          <Text style={styles.lostBadgeText}>กำลังตามหา • {daysAgo(cat.lostAt)}</Text>
        </View>

        {/* 🔘 จุดระบุตำแหน่งรูปภาพ (Dots Indicator) จะขึ้นเมื่อมีมากกว่า 1 รูป */}
        {allImages.length > 1 && (
          <View style={styles.pagination}>
            {allImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  activeImageIndex === index ? styles.activeDot : styles.inactiveDot
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{cat.name}</Text>
          {dist && (
            <View style={styles.distChip}>
              <Ionicons name="navigate" size={13} color={colors.primary} />
              <Text style={styles.distText}>{dist}</Text>
            </View>
          )}
        </View>
        <Text style={styles.meta}>
          สี{cat.color}{cat.breed ? ` • ${cat.breed}` : ''}{cat.age ? ` • ${cat.age}` : ''}{cat.sex === 'ผู้' ? ' • ♂ ผู้' : cat.sex === 'เมีย' ? ' • ♀ เมีย' : ''}
        </Text>

        {cat.reward > 0 && (
          <View style={styles.reward}>
            <Text style={styles.rewardEmoji}>💰</Text>
            <View>
              <Text style={styles.rewardLabel}>เงินรางวัล</Text>
              <Text style={styles.rewardAmount}>{Number(cat.reward).toLocaleString()} บาท</Text>
            </View>
          </View>
        )}

        {cat.lostNote ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 เห็นครั้งสุดท้าย</Text>
            <Text style={styles.sectionText}>{cat.lostNote}</Text>
          </View>
        ) : null}

        {cat.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🐱 ลักษณะเด่น</Text>
            <Text style={styles.sectionText}>{cat.notes}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.chatBtn} onPress={openChat} activeOpacity={0.85} disabled={chatLoading}>
            {chatLoading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
            }
            <Text style={styles.chatBtnText}>แชทกับเจ้าของ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.call} onPress={callOwner} activeOpacity={0.85}>
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={styles.callText}>โทร</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.disclaimer}>โปรดยืนยันลักษณะน้องกับเจ้าของก่อนนัดรับ</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  imgWrap: { position: 'relative', width: SCREEN_WIDTH, aspectRatio: 1 },
  imageSlider: { width: SCREEN_WIDTH, height: '100%' },
  img: { width: SCREEN_WIDTH, height: '100%', backgroundColor: '#eee', resizeMode: 'cover' },
  back: { position: 'absolute', left: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  lostBadge: { position: 'absolute', bottom: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.lost, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, zIndex: 10 },
  lostBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // สไตล์สำหรับจุดสไลด์รูปภาพ (Pagination Dots)
  pagination: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', gap: 6, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.full, zIndex: 10 },
  dot: { height: 6, borderRadius: 3 },
  activeDot: { width: 14, backgroundColor: '#fff' },
  inactiveDot: { width: 6, backgroundColor: 'rgba(255,255,255,0.5)' },

  body: { padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 28, fontWeight: '800', color: colors.text },
  distChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full },
  distText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  meta: { fontSize: 15, color: colors.sub, marginTop: 6 },

  reward: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.rewardSoft, borderRadius: radius.lg, padding: 16, marginTop: 18 },
  rewardEmoji: { fontSize: 32 },
  rewardLabel: { fontSize: 13, color: colors.reward, fontWeight: '600' },
  rewardAmount: { fontSize: 22, fontWeight: '800', color: colors.reward },

  section: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginTop: 16, ...shadow },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 8 },
  sectionText: { fontSize: 15, color: colors.sub, lineHeight: 23 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  chatBtn: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primarySoft, height: 56, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary + '40' },
  chatBtnText: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  call: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, height: 56, borderRadius: radius.md },
  callText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  disclaimer: { fontSize: 12, color: colors.faint, textAlign: 'center', marginTop: 12 },
});
