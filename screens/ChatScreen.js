import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import GradientHeader from '../components/GradientHeader';
import { colors, radius, shadow } from '../theme';

function timeAgo(ts) {
  const ms = ts?.toMillis?.();
  if (!ms) return '';
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'เมื่อสักครู่';
  if (m < 60) return `${m} นาที`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'เมื่อวาน';
  return `${d} วันก่อน`;
}

// หน้ารายการแชท (ChatList) — แตะแล้วเข้าห้องแชท ChatRoom
export default function ChatScreen({ navigation }) {
  const [myPhone, setMyPhone] = useState('');
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('userPhone').then((p) => setMyPhone(p || ''));
  }, []);

  useEffect(() => {
    if (!myPhone) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', myPhone));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.lastAt?.toMillis?.() || 0) - (a.lastAt?.toMillis?.() || 0));
        setChats(list);
        setLoading(false);
      },
      (e) => { console.log('Chat list error:', e); setLoading(false); }
    );
    return unsub;
  }, [myPhone]);

  const openRoom = (chat) => {
    const otherPhone = (chat.participants || []).find((p) => p !== myPhone) || '';
    const otherLabel = chat[`label_${otherPhone}`] || otherPhone;
    navigation.navigate('ChatRoom', {
      chatId: chat.id, otherPhone, otherLabel, myPhone, catName: chat.catName || '',
    });
  };

  const renderItem = ({ item }) => {
    const otherPhone = (item.participants || []).find((p) => p !== myPhone) || '';
    const otherLabel = item[`label_${otherPhone}`] || otherPhone;
    const unread = item[`unread_${myPhone}`] || 0;
    const initial = (otherLabel || '?').trim().charAt(0).toUpperCase();
    return (
      <TouchableOpacity style={styles.row} onPress={() => openRoom(item)} activeOpacity={0.7}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text style={styles.name} numberOfLines={1}>{otherLabel}</Text>
            <Text style={styles.time}>{timeAgo(item.lastAt)}</Text>
          </View>
          {item.catName ? <Text style={styles.cat} numberOfLines={1}>🐱 {item.catName}</Text> : null}
          <Text style={[styles.last, unread > 0 && styles.lastUnread]} numberOfLines={1}>
            {item.lastMsg || 'เริ่มแชทได้เลย'}
          </Text>
        </View>
        {unread > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientHeader title="แชท" emoji="💬" subtitle={chats.length ? `${chats.length} การสนทนา` : 'ข้อความของคุณ'} />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : chats.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>ยังไม่มีการสนทนา</Text>
          <Text style={styles.emptyText}>เมื่อคุณติดต่อผู้ที่เจอแมว หรือมีคนติดต่อมา แชทจะแสดงที่นี่</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 14 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 10, ...shadow },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '800', color: colors.text, flex: 1, marginRight: 8 },
  time: { fontSize: 12, color: colors.faint },
  cat: { fontSize: 12.5, color: colors.primary, fontWeight: '600', marginTop: 2 },
  last: { fontSize: 13.5, color: colors.sub, marginTop: 3 },
  lastUnread: { color: colors.text, fontWeight: '700' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.lost, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 8 },
  emptyTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  emptyText: { fontSize: 14, color: colors.sub, textAlign: 'center', marginTop: 8, lineHeight: 21 },
});