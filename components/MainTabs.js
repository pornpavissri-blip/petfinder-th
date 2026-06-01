import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import MyCatsScreen from '../screens/MyCatsScreen';
import SearchScreen from '../screens/SearchScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

const ICONS = {
  MyCats: ['paw', 'paw-outline'],
  Search: ['search', 'search-outline'],
  Map: ['map', 'map-outline'],
  Profile: ['person', 'person-outline'],
};

export default function MainTabs({ onLogout }) {
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
            return <Ionicons name={focused ? on : off} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="MyCats" component={MyCatsScreen} options={{ title: 'แมวของฉัน' }} />
        <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'ตามหา' }} />
        <Tab.Screen name="Map" component={MapScreen} options={{ title: 'แผนที่' }} />
        <Tab.Screen name="Profile" options={{ title: 'โปรไฟล์' }}>
          {() => <ProfileScreen onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
