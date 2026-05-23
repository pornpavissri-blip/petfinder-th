import { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PhoneEntry from './components/PhoneEntry';
import MainTabs from './components/MainTabs';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [userPhone, setUserPhone] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const phone = await AsyncStorage.getItem('userPhone');
      if (phone) setUserPhone(phone);
    } catch (error) {
      console.log('Error checking user:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!userPhone) {
    return <PhoneEntry onLogin={setUserPhone} />;
  }

  return <MainTabs />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});