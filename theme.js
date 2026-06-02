import { Platform } from 'react-native';

// 🎨 PetFinder Thailand — Design Tokens (โทนพีช-มิ้นต์พาสเทล)
export const colors = {
  // primary = พีช/คอรัล นุ่ม
  primary: '#F1A06B',
  primaryDark: '#E68C53',
  primarySoft: '#FCEEE3',
  gradientFrom: '#F8BC96',
  gradientTo: '#F0A06B',

  // secondary = เขียวมิ้นต์ (ปุ่มรอง/ยืนยัน)
  secondary: '#7FC9AE',
  secondaryDark: '#5FB494',
  secondarySoft: '#E6F5EF',

  bg: '#FBF6F0',        // ครีมอุ่น
  card: '#FFFFFF',
  text: '#463E38',      // น้ำตาลเข้มอุ่น (ไม่ใช่ดำสนิท)
  sub: '#9A8D83',
  faint: '#C4B9AF',
  border: '#F1E8DF',

  // status
  lost: '#E8736A',      // แดงคอรัลนุ่ม
  lostSoft: '#FCEAE7',
  home: '#46A98A',      // มิ้นต์เขียว
  homeSoft: '#E6F5EF',
  found: '#5E9BD6',     // ฟ้านุ่ม
  foundSoft: '#E9F1FB',

  warn: '#EBB05A',      // เหลืองอำพัน (อาจเป็นจร/หาย)
  reward: '#D89A38',
  rewardSoft: '#FBF1DC',
  white: '#FFFFFF',
};

export const radius = { sm: 12, md: 18, lg: 24, xl: 30, full: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// เงาฟุ้งนุ่ม โทนอุ่น
export const shadow = Platform.select({
  ios: { shadowColor: '#B58B6A', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 7 } },
  android: { elevation: 4 },
});

export const shadowSoft = Platform.select({
  ios: { shadowColor: '#B58B6A', shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 2 },
});

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

export function daysAgo(timestamp) {
  if (!timestamp?.toMillis) return '';
  const diff = Date.now() - timestamp.toMillis();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'วันนี้';
  if (days === 1) return 'เมื่อวาน';
  return `${days} วันก่อน`;
}
