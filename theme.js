import { Platform } from 'react-native';

// 🎨 PetFinder Thailand — Design Tokens
export const colors = {
  primary: '#FF6B35',
  primaryDark: '#E15524',
  primarySoft: '#FFEDE5',
  gradientFrom: '#FF8A5B',
  gradientTo: '#FF6B35',

  bg: '#F6F7FB',
  card: '#FFFFFF',
  text: '#16172A',
  sub: '#6B6C7E',
  faint: '#9A9BAE',
  border: '#ECEDF3',

  // status
  lost: '#E63946',
  lostSoft: '#FDECEC',
  home: '#2BA84A',
  homeSoft: '#E7F6EC',
  found: '#2D7FF9',
  foundSoft: '#E8F1FE',

  warn: '#FFB020',
  white: '#FFFFFF',
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, full: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const shadow = Platform.select({
  ios: {
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  android: { elevation: 4 },
});

export const shadowSoft = Platform.select({
  ios: {
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  android: { elevation: 2 },
});

// แปลงสถานะ → ป้าย/สี/ไอคอน (ใช้ทั่วทั้งแอป)
export function statusInfo(status) {
  switch (status) {
    case 'lost':
      return { label: 'แจ้งหาย', color: colors.lost, soft: colors.lostSoft, icon: 'alert-circle' };
    case 'found':
      return { label: 'พบแล้ว', color: colors.found, soft: colors.foundSoft, icon: 'checkmark-circle' };
    default:
      return { label: 'อยู่บ้าน', color: colors.home, soft: colors.homeSoft, icon: 'home' };
  }
}

// คำนวณ "หายมากี่วัน"
export function daysAgo(timestamp) {
  if (!timestamp?.toMillis) return '';
  const diff = Date.now() - timestamp.toMillis();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'วันนี้';
  if (days === 1) return 'เมื่อวาน';
  return `${days} วันก่อน`;
}
