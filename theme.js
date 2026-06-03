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

// ---- อายุจากวันเกิด ----
// birthDate เก็บเป็นสตริง 'YYYY-MM-DD'
const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function parseBirth(birthDate) {
  if (!birthDate) return null;
  const d = new Date(`${birthDate}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

// คืนข้อความอายุแบบละเอียด เช่น "2 ปี 3 เดือน", "8 เดือน", "12 วัน"
export function ageText(birthDate) {
  const b = parseBirth(birthDate);
  if (!b) return null;
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months--;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const m = months % 12;
  if (years <= 0 && m <= 0) {
    const days = Math.floor((now.getTime() - b.getTime()) / 86400000);
    if (days <= 0) return 'แรกเกิด';
    if (days < 30) return `${days} วัน`;
    return '1 เดือน';
  }
  const parts = [];
  if (years) parts.push(`${years} ปี`);
  if (m) parts.push(`${m} เดือน`);
  return parts.join(' ');
}

// คืนวันเกิดแบบไทย เช่น "12 มี.ค. 2566"
export function formatBirthDate(birthDate) {
  const b = parseBirth(birthDate);
  if (!b) return null;
  return `${b.getDate()} ${TH_MONTHS_SHORT[b.getMonth()]} ${b.getFullYear() + 543}`;
}