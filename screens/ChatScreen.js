import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import GradientHeader from '../components/GradientHeader';
import { colors, radius, shadow } from '../theme';

function formatLastTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'เมื่อกี้';
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} ชม.ที่แล้ว`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'เมื่อวาน';
  if (diffD < 7) return `${diffD} วันที่แล้ว`;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

export default function ChatScreen({ navigation }) {
  const [myPhone, setMyPhone] = useState('');
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── ดึงเบอร์โทรศัพท์ของตัวเองจาก Storage ───────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('userPhone').then(p => setMyPhone(p || ''));
  }, []);

  // ── Listen ดึงข้อมูลห้องแชทแบบ Real-time จาก Firestore ──────────────
  useEffect(() => {
    if (!myPhone) return;
    
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', myPhone),
      orderBy('lastAt', 'desc'),
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setChats(list);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to chats: ", error);
      setLoading(false);
    });
    
    return unsub;
  }, [myPhone]);

  // ── เปิดห้องสนทนาไปยังหน้า ChatRoom ──────────────────────────────
  const openChat = useCallback((chat) => {
    const otherPhone = chat.participants.find(p => p !== myPhone) || '';
    
    // สั่งให้ Navigation นำทางไปยังหน้า 'ChatRoom' พร้อมส่ง Params สำคัญไปใช้งานต่อ
    navigation.navigate('ChatRoom', {
      chatId: chat.id,
      otherPhone,
      otherLabel: chat[`label_${otherPhone}`] || otherPhone,
      myPhone,
      catName: chat.catName || '',
    });
  }, [myPhone, navigation]);

  // ── Render แถวรายชื่อแชทแต่ละห้อง ─────────────────────────────────
  const renderItem = ({ item }) => {
    const otherPhone = item.participants?.find(p => p !== myPhone) || '???';
    const label = item[`label_${otherPhone}`] || otherPhone;
    const unread = item[`unread_${myPhone}`] || 0;
    const lastMsg = item.lastMsg || 'เริ่มการสนทนา';

    return (
      <TouchableOpacity
        style={styles.chatRow}
        onPress={() => openChat(item)}
        activeOpacity={0.75}
      >
        {/* รูปโปรไฟล์จำลอง (Avatar) และจุดแจ้งเตือนสีแดง */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color={colors.primary} />
          </View>
          {unread > 0 && (
            <View style={styles.unreadDot} />
          )}
        </View>

        {/* ข้อมูลแชทเนื้อหาหลัก */}
        <View style={styles.chatInfo}>
          <View style={styles.chatTop}>
            <Text style={[styles.chatName, unread > 0 && styles.chatNameBold]} numberOfLines={1}>
              {label}
            </Text>
            <Text style={styles.chatTime}>{formatLastTime(item.lastAt)}</Text>
          </View>

          {item.catName ? (
            <Text style={styles.chatCat} numberOfLines={1}>
              🐱 {item.catName}
            </Text>
          ) : null}

          <View style={styles.chatBottom}>
            <Text
              style={[styles.chatLastMsg, unread > 0 && styles.chatLastMsgBold]}
              numberOfLines={1}
            >
              {lastMsg}
            </Text>
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.faint} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <GradientHeader title="แชท" emoji="💬" subtitle="ข้อความทั้งหมด" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={c => c.id}
          renderItem={renderItem}
          contentContainerStyle={chats.length === 0 ? styles.emptyContainer : { paddingBottom: 20 }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>ยังไม่มีการสนทนา</Text>
              <Text style={styles.emptySub}>
                เมื่อคุณหรือใครทักหาคุณจากโพสต์แมวหาย{'\n'}การสนทนาจะปรากฏที่นี่
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute', top: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.lost,
    borderWidth: 2, borderColor: colors.card,
  },

  chatInfo: { flex: 1, gap: 3 },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1, marginRight: 8 },
  chatNameBold: { fontWeight: '800' },
  chatTime: { fontSize: 12, color: colors.sub },
  chatCat: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  chatBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chatLastMsg: { fontSize: 13.5, color: colors.sub, flex: 1, marginRight: 8 },
  chatLastMsgBold: { color: colors.text, fontWeight: '700' },

  badge: {
    backgroundColor: colors.lost,
    borderRadius: 10, minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  sep: { height: 1, backgroundColor: colors.border, marginLeft: 78 },

  emptyContainer: { flex: 1 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: colors.sub, textAlign: 'center', lineHeight: 22 },
});