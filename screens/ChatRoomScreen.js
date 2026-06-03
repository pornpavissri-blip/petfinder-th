import { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity,
  Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, doc, updateDoc, getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { colors, radius, shadow } from '../theme';
import * as ImageManipulator from 'expo-image-manipulator';

// ── helpers ──────────────────────────────────────────────────────
function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}
function formatDateSep(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
}
function isSameDay(a, b) {
  if (!a || !b) return false;
  const da = a.toDate ? a.toDate() : new Date(a);
  const db2 = b.toDate ? b.toDate() : new Date(b);
  return da.toDateString() === db2.toDateString();
}
async function resizeBase64(uri, maxW = 1000) {
  try {
    const actions = [{ resize: { width: maxW } }];
    const saveOptions = {
      compress: 0.5, // บีบอัดคุณภาพรูปเหลือ 50%
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true, // สั่งให้ส่งค่า base64 กลับมาทันที
    };
    const result = await ImageManipulator.manipulateAsync(uri, actions, saveOptions);
    return result.base64; // คืนค่าเฉพาะสตริง Base64 ออกไปใช้งาน
  } catch (error) {
    console.error("Resize error:", error);
    return null;
  }
}
async function uriToBase64(uri) {
  const resp = await fetch(uri);
  const blob = await resp.blob();
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onloadend = () => res(reader.result.split(',')[1]);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}

// ── component ─────────────────────────────────────────────────────
export default function ChatRoomScreen({ route, navigation }) {
  const { chatId, otherPhone, otherLabel, myPhone, catName } = route.params;
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const listRef = useRef(null);

  // ── listen to messages ──────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      // mark read
      updateDoc(doc(db, 'chats', chatId), {
        [`unread_${myPhone}`]: 0,
      }).catch(() => {});
    });
    return unsub;
  }, [chatId, myPhone]);

  // auto-scroll
  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // ── send text ───────────────────────────────────────────────────
  const sendText = useCallback(async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        type: 'text',
        body,
        sender: myPhone,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'chats', chatId), {
        lastMsg: body,
        lastAt: serverTimestamp(),
        [`unread_${otherPhone}`]: (await getUnread(otherPhone)) + 1,
      });
    } catch (e) {
      Alert.alert('ส่งไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง');
    }
    setSending(false);
  }, [text, sending, chatId, myPhone, otherPhone]);

  async function getUnread(phone) {
    try {
      const snap = await getDoc(doc(db, 'chats', chatId));
      return snap.data()?.[`unread_${phone}`] || 0;
    } catch { return 0; }
  }

  // ── send image ───────────────────────────────────────────────────
  const sendImage = useCallback(async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึงรูปภาพในการตั้งค่า');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: 5,
    // ไม่จำเป็นต้องใส่ base64: true ตรงนี้แล้ว เพราะเราจะให้ ImageManipulator เป็นคนเจนฯ ให้แทน
  });

  if (result.canceled || !result.assets || result.assets.length === 0) return;
  
  setUploading(true);

  try {
    let currentUnread = await getUnread(otherPhone);

    for (const asset of result.assets) {
      // 🚀 เรียกใช้ฟังก์ชันย่อขนาดรูปภาพ (กว้างไม่เกิน 1000px) และรับค่า Base64
      const b64 = await resizeBase64(asset.uri, 1000);
      
      if (!b64) {
        throw new Error("ไม่สามารถประมวลผลรูปภาพบางรูปได้");
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        type: 'image',
        imageBase64: b64,
        sender: myPhone,
        createdAt: serverTimestamp(),
      });

      currentUnread += 1;
    }

    await updateDoc(doc(db, 'chats', chatId), {
      lastMsg: `📷 ส่งรูปภาพ (${result.assets.length} รูป)`,
      lastAt: serverTimestamp(),
      [`unread_${otherPhone}`]: currentUnread,
    });

  } catch (e) {
    console.error("เกิดข้อผิดพลาดในการส่งรูปภาพหลายรูป: ", e);
    Alert.alert('อัปโหลดรูปไม่สำเร็จ', 'รูปภาพอาจมีขนาดใหญ่เกินไป หรือระบบขัดข้อง');
  } finally {
    setUploading(false);
  }
}, [chatId, myPhone, otherPhone]);

  // ── send camera ──────────────────────────────────────────────────
  const sendCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการใช้กล้องในการตั้งค่า');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const b64 = asset.base64 || (await uriToBase64(asset.uri));
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        type: 'image',
        imageBase64: b64,
        sender: myPhone,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'chats', chatId), {
        lastMsg: '📷 รูปภาพ',
        lastAt: serverTimestamp(),
        [`unread_${otherPhone}`]: (await getUnread(otherPhone)) + 1,
      });
    } catch (e) {
      Alert.alert('อัปโหลดรูปไม่สำเร็จ', 'กรุณาลองใหม่');
    }
    setUploading(false);
  }, [chatId, myPhone, otherPhone]);

  // ── send location ────────────────────────────────────────────────
  const sendLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึงตำแหน่งในการตั้งค่า');
      return;
    }
    setSending(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        type: 'location',
        latitude,
        longitude,
        sender: myPhone,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'chats', chatId), {
        lastMsg: '📍 ตำแหน่ง',
        lastAt: serverTimestamp(),
        [`unread_${otherPhone}`]: (await getUnread(otherPhone)) + 1,
      });
    } catch (e) {
      Alert.alert('ไม่สามารถดึงตำแหน่งได้', 'กรุณาลองใหม่');
    }
    setSending(false);
  }, [chatId, myPhone, otherPhone]);

  // ── open map ────────────────────────────────────────────────────
  const openMap = (lat, lng) => {
    const scheme = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}`,
    });
    Linking.openURL(scheme).catch(() =>
      Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`)
    );
  };

  // ── show attachment menu ─────────────────────────────────────────
  const showAttachMenu = () => {
    Alert.alert('แนบไฟล์', '', [
      { text: 'ถ่ายรูปตอนนี้', onPress: sendCamera },
      { text: 'เลือกรูปจากคลัง', onPress: sendImage },
      { text: 'ส่งพิกัดของฉัน', onPress: sendLocation },
      { text: 'ยกเลิก', style: 'cancel' },
    ]);
  };

  // ── render message ───────────────────────────────────────────────
  const renderMsg = ({ item, index }) => {
    const isMe = item.sender === myPhone;
    const prev = messages[index - 1];
    const showDate = !prev || !isSameDay(prev.createdAt, item.createdAt);
    const showAvatar = !isMe && (index === 0 || messages[index - 1]?.sender !== item.sender);

    return (
      <>
        {showDate && (
          <View style={styles.dateSep}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>{formatDateSep(item.createdAt)}</Text>
            <View style={styles.dateLine} />
          </View>
        )}

        <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
          {/* avatar placeholder */}
          {!isMe && (
            <View style={[styles.avatar, { opacity: showAvatar ? 1 : 0 }]}>
              <Ionicons name="person" size={14} color={colors.primary} />
            </View>
          )}

          <View style={{ maxWidth: '72%' }}>
            {/* text */}
            {item.type === 'text' && (
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                  {item.body}
                </Text>
                <Text style={[styles.timeText, isMe && styles.timeTextMe]}>
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            )}

            {/* image */}
            {item.type === 'image' && item.imageBase64 && (
              <View style={[styles.imgBubble, isMe ? styles.imgBubbleMe : styles.imgBubbleThem]}>
                <Image
                  source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }}
                  style={styles.msgImg}
                  resizeMode="cover"
                />
                <Text style={[styles.timeTextImg, isMe && styles.timeTextImgMe]}>
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            )}

            {/* location */}
            {item.type === 'location' && (
              <TouchableOpacity
                style={[styles.locBubble, isMe ? styles.locBubbleMe : styles.locBubbleThem]}
                onPress={() => openMap(item.latitude, item.longitude)}
                activeOpacity={0.8}
              >
                <View style={styles.locIconWrap}>
                  <Ionicons name="location" size={20} color={isMe ? '#fff' : colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.locTitle, isMe && styles.locTitleMe]}>ตำแหน่ง</Text>
                  <Text style={[styles.locCoords, isMe && styles.locCoordsMe]} numberOfLines={1}>
                    {item.latitude?.toFixed(5)}, {item.longitude?.toFixed(5)}
                  </Text>
                </View>
                <Ionicons
                  name="open-outline"
                  size={16}
                  color={isMe ? 'rgba(255,255,255,0.7)' : colors.sub}
                />
                <Text style={[styles.timeText, { marginLeft: 0, marginTop: 2 }, isMe && styles.timeTextMe]}>
                  {formatTime(item.createdAt)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </>
    );
  };

  // ── main render ──────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerAvatarWrap}>
          <View style={styles.headerAvatar}>
            <Ionicons name="person" size={18} color={colors.primary} />
          </View>
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{otherLabel || otherPhone}</Text>
          {catName ? (
            <Text style={styles.headerSub} numberOfLines={1}>เรื่อง: {catName}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => {
            Alert.alert('โทรออก', `โทรหา ${otherPhone}?`, [
              { text: 'ยกเลิก', style: 'cancel' },
              { text: 'โทร', onPress: () => Linking.openURL(`tel:${otherPhone}`) },
            ]);
          }}
        >
          <Ionicons name="call" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderMsg}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubbles-outline" size={44} color={colors.faint} />
              <Text style={styles.emptyText}>เริ่มการสนทนาได้เลย</Text>
              <Text style={styles.emptySub}>ส่งข้อความ รูปภาพ หรือพิกัดตำแหน่ง</Text>
            </View>
          }
        />

        {/* Uploading indicator */}
        {uploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.uploadingText}>กำลังอัปโหลดรูป...</Text>
          </View>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 6 }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={showAttachMenu}>
            <Ionicons name="add-circle" size={28} color={colors.primary} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="พิมพ์ข้อความ..."
            placeholderTextColor={colors.faint}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendText}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F2ED' },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#B58B6A', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },
  backBtn: { padding: 4, marginRight: 6 },
  headerAvatarWrap: { position: 'relative', marginRight: 10 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.home,
    borderWidth: 2, borderColor: colors.card,
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: 12, color: colors.sub, marginTop: 1 },
  callBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 6,
  },

  // messages
  msgList: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 8 },

  dateSep: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 8 },
  dateLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dateText: { fontSize: 12, color: colors.sub, fontWeight: '600' },

  msgRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-end' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },

  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 6, marginBottom: 2,
  },

  // text bubble
  bubble: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, maxWidth: '100%',
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    ...Platform.select({
      ios: { shadowColor: '#B58B6A', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 1 },
    }),
  },
  bubbleText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  bubbleTextMe: { color: '#fff' },
  timeText: { fontSize: 11, color: colors.sub, marginTop: 4, alignSelf: 'flex-end' },
  timeTextMe: { color: 'rgba(255,255,255,0.65)' },

  // image bubble
  imgBubble: { borderRadius: 18, overflow: 'hidden' },
  imgBubbleMe: { borderBottomRightRadius: 4 },
  imgBubbleThem: { borderBottomLeftRadius: 4 },
  msgImg: { width: 220, height: 220 },
  timeTextImg: {
    position: 'absolute', bottom: 8, right: 10,
    fontSize: 11, color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  timeTextImgMe: { color: 'rgba(255,255,255,0.85)' },

  // location bubble
  locBubble: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12,
    maxWidth: 260,
  },
  locBubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  locBubbleThem: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
  locIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center',
  },
  locTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  locTitleMe: { color: '#fff' },
  locCoords: { fontSize: 11, color: colors.sub, marginTop: 2 },
  locCoordsMe: { color: 'rgba(255,255,255,0.7)' },

  // uploading bar
  uploadingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  uploadingText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  // input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: colors.card,
    paddingHorizontal: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: 8,
  },
  attachBtn: { paddingBottom: 4 },
  input: {
    flex: 1,
    minHeight: 40, maxHeight: 120,
    backgroundColor: '#F3EDE6',
    borderRadius: 22,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: colors.text,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.faint },

  // empty
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: colors.sub },
  emptySub: { fontSize: 13, color: colors.faint, textAlign: 'center' },
});
