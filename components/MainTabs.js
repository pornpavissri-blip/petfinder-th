import { useEffect, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

import MyCatsScreen from '../screens/MyCatsScreen';
import SearchScreen from '../screens/SearchScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const ChatStack = createNativeStackNavigator();

function ChatStackNavigator() {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="ChatList" component={ChatScreen} />
      <ChatStack.Screen name="ChatRoom" component={ChatRoomScreen} />
    </ChatStack.Navigator>
  );
}

const ICONS = {
  MyCats: ['paw', 'paw-outline'],
  Search: ['search', 'search-outline'],
  Map: ['map', 'map-outline'],
  Chat: ['chatbubbles', 'chatbubbles-outline'],
  Profile: ['person', 'person-outline'],
};

export default function MainTabs({ onLogout }) {
  const [myPhone, setMyPhone] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // ── get my phone once ────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('userPhone').then(p => setMyPhone(p || ''));
  }, []);

  // ── listen for total unread ───────────────────────────────────────
  useEffect(() => {
    if (!myPhone) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', myPhone),
    );
    const unsub = onSnapshot(q, (snap) => {
      let total = 0;
      snap.docs.forEach(d => {
        total += d.data()[`unread_${myPhone}`] || 0;
      });
      setUnreadCount(total);
    });
    return unsub;
  }, [myPhone]);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.faint,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginBottom: Platform.OS === 'ios' ? 0 : 6 },
          tabBarStyle: {
            height: Platform.OS === 'ios' ? 88 : 66,
            paddingTop: 8,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderTopWidth: 1,
          },
          tabBarIcon: ({ focused, color, size }) => {
            const [on, off] = ICONS[route.name];
            return (
              <View>
                <Ionicons name={focused ? on : off} size={size} color={color} />
                {/* Unread badge on Chat tab */}
                {route.name === 'Chat' && unreadCount > 0 && (
                  <View style={{
                    position: 'absolute', top: -4, right: -8,
                    backgroundColor: colors.lost,
                    borderRadius: 8, minWidth: 16, height: 16,
                    alignItems: 'center', justifyContent: 'center',
                    paddingHorizontal: 3,
                    borderWidth: 1.5, borderColor: colors.card,
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            );
          },
        })}
      >
        <Tab.Screen name="MyCats" component={MyCatsScreen} options={{ title: 'แมวของฉัน' }} />
        <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'ตามหา' }} />
        <Tab.Screen name="Map" component={MapScreen} options={{ title: 'แผนที่' }} />
        <Tab.Screen name="Chat" component={ChatStackNavigator} options={{ title: 'แชท' }} />
        <Tab.Screen name="Profile" options={{ title: 'โปรไฟล์' }}>
          {() => <ProfileScreen onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
