import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import SearchScreen from '../screens/SearchScreen';
import MyCatsScreen from '../screens/MyCatsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Search') iconName = focused ? 'search' : 'search-outline';
            else if (route.name === 'MyCats') iconName = focused ? 'paw' : 'paw-outline';
            else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#FF6B35',
          tabBarInactiveTintColor: '#999',
          headerStyle: { backgroundColor: '#FF6B35' },
          headerTintColor: '#fff',
        })}
      >
        <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'หาแมว' }} />
        <Tab.Screen name="MyCats" component={MyCatsScreen} options={{ title: 'แมวของฉัน' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'โปรไฟล์' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}