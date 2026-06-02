import { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import PhoneEntry from './components/PhoneEntry';
import MainTabs from './components/MainTabs';
import { colors } from './theme';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [userPhone, setUserPhone] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const phone = await AsyncStorage.getItem('userPhone');
        if (phone) setUserPhone(phone);
      } catch (e) {
        console.log('Error checking user:', e);
      }
      setLoading(false);
    })();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userPhone');
    setUserPhone(null);
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {loading ? (
        <View style={styles.splash}>
          <Text style={styles.logo}>🐱</Text>
          <Text style={styles.brand}>PetFinder</Text>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
        </View>
      ) : !userPhone ? (
        <PhoneEntry onLogin={setUserPhone} />
      ) : (
        <MainTabs onLogout={handleLogout} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 72 },
  brand: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 8, letterSpacing: 0.5 },
});
