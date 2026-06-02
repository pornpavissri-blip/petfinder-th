import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadowSoft } from '../theme';

// หัวข้อแบบโล่งสะอาด (ไม่มีแถบสีทึบ) — โลโก้พีชมุมซ้าย + ชื่อสีน้ำตาลอุ่น
export default function GradientHeader({ title, subtitle, emoji, onClose, right }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      <View style={styles.row}>
        {emoji ? (
          <View style={styles.logo}><Text style={styles.logoEmoji}>{emoji}</Text></View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {onClose ? (
          <TouchableOpacity onPress={onClose} style={styles.close} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : right ? right : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 8, backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  logo: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 24 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: 0.2 },
  subtitle: { color: colors.sub, fontSize: 13, marginTop: 3, fontWeight: '500' },
  close: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadowSoft },
});
