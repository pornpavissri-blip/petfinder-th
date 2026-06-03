import { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator,
  Modal, Linking, Alert, Platform, TextInput, FlatList
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import GradientHeader from '../components/GradientHeader';
import { colors, radius, shadow } from '../theme';

const PROVINCES = [
  { label: 'ทุกจังหวัด', id: 'all', latitude: 14.9799, longitude: 102.0978, latDelta: 12.0, lngDelta: 12.0 },
  { label: 'กรุงเทพมหานคร', id: 'bangkok', latitude: 13.7563, longitude: 100.5018, latDelta: 0.25, lngDelta: 0.25, minLat: 13.4, maxLat: 14.0, minLng: 100.3, maxLng: 100.8 },
  { label: 'กำแพงเพชร', id: 'kamphaengphet', latitude: 16.4828, longitude: 99.5227, latDelta: 0.4, lngDelta: 0.4, minLat: 15.8, maxLat: 17.1, minLng: 99.0, maxLng: 100.0 },
  { label: 'ชัยนาท', id: 'chainat', latitude: 15.1852, longitude: 100.1251, latDelta: 0.25, lngDelta: 0.25, minLat: 14.9, maxLat: 15.4, minLng: 99.8, maxLng: 100.4 },
  { label: 'นครนายก', id: 'nakhonnayok', latitude: 14.2069, longitude: 101.2131, latDelta: 0.25, lngDelta: 0.25, minLat: 13.9, maxLat: 14.5, minLng: 100.9, maxLng: 101.5 },
  { label: 'นครปฐม', id: 'nakhonpathom', latitude: 13.8140, longitude: 100.0373, latDelta: 0.25, lngDelta: 0.25, minLat: 13.6, maxLat: 14.1, minLng: 99.8, maxLng: 100.3 },
  { label: 'นครสวรรค์', id: 'nakhonsawan', latitude: 15.6882, longitude: 100.1199, latDelta: 0.45, lngDelta: 0.45, minLat: 15.3, maxLat: 16.2, minLng: 99.1, maxLng: 100.7 },
  { label: 'นนทบุรี', id: 'nonthaburi', latitude: 13.8591, longitude: 100.4988, latDelta: 0.15, lngDelta: 0.15, minLat: 13.75, maxLat: 14.0, minLng: 100.3, maxLng: 100.6 },
  { label: 'ปทุมธานี', id: 'pathumthani', latitude: 14.0208, longitude: 100.5250, latDelta: 0.2, lngDelta: 0.2, minLat: 13.9, maxLat: 14.2, minLng: 100.3, maxLng: 100.9 },
  { label: 'พระนครศรีอยุธยา', id: 'ayutthaya', latitude: 14.3589, longitude: 100.5734, latDelta: 0.3, lngDelta: 0.3, minLat: 14.1, maxLat: 14.6, minLng: 100.2, maxLng: 100.8 },
  { label: 'พิจิตร', id: 'phichit', latitude: 16.4426, longitude: 100.3441, latDelta: 0.3, lngDelta: 0.3, minLat: 15.9, maxLat: 16.7, minLng: 100.0, maxLng: 100.7 },
  { label: 'พิษณุโลก', id: 'phitsanulok', latitude: 16.8211, longitude: 100.2659, latDelta: 0.4, lngDelta: 0.4, minLat: 16.3, maxLat: 17.5, minLng: 99.9, maxLng: 101.1 },
  { label: 'เพชรบูรณ์', id: 'phetchabun', latitude: 16.4194, longitude: 101.1578, latDelta: 0.5, lngDelta: 0.5, minLat: 15.4, maxLat: 17.0, minLng: 100.7, maxLng: 101.8 },
  { label: 'ลพบุรี', id: 'lopburi', latitude: 14.7995, longitude: 100.6534, latDelta: 0.35, lngDelta: 0.35, minLat: 14.6, maxLat: 15.8, minLng: 100.4, maxLng: 101.4 },
  { label: 'สมุทรปราการ', id: 'samutprakan', latitude: 13.5991, longitude: 100.5968, latDelta: 0.2, lngDelta: 0.2, minLat: 13.4, maxLat: 13.75, minLng: 100.4, maxLng: 101.0 },
  { label: 'สมุทรสงคราม', id: 'samutsongkhram', latitude: 13.4098, longitude: 100.0023, latDelta: 0.15, lngDelta: 0.15, minLat: 13.3, maxLat: 13.6, minLng: 99.8, maxLng: 100.2 },
  { label: 'สมุทรสาคร', id: 'samutsakhon', latitude: 13.5475, longitude: 100.2744, latDelta: 0.18, lngDelta: 0.18, minLat: 13.4, maxLat: 13.7, minLng: 100.1, maxLng: 100.4 },
  { label: 'สระบุรี', id: 'saraburi', latitude: 14.5290, longitude: 100.9107, latDelta: 0.3, lngDelta: 0.3, minLat: 14.3, maxLat: 15.1, minLng: 100.6, maxLng: 101.3 },
  { label: 'สิงห์บุรี', id: 'singburi', latitude: 14.8936, longitude: 100.3967, latDelta: 0.18, lngDelta: 0.18, minLat: 14.7, maxLat: 15.0, minLng: 100.2, maxLng: 100.6 },
  { label: 'สุโขทัย', id: 'sukhothai', latitude: 17.0078, longitude: 99.8234, latDelta: 0.35, lngDelta: 0.35, minLat: 16.6, maxLat: 17.8, minLng: 99.4, maxLng: 100.2 },
  { label: 'สุพรรณบุรี', id: 'suphanburi', latitude: 14.4745, longitude: 100.1177, latDelta: 0.4, lngDelta: 0.4, minLat: 14.1, maxLat: 15.1, minLng: 99.7, maxLng: 100.3 },
  { label: 'อุทัยธานี', id: 'uthaithani', latitude: 15.3777, longitude: 100.0248, latDelta: 0.35, lngDelta: 0.35, minLat: 14.9, maxLat: 15.8, minLng: 99.0, maxLng: 100.2 },
  { label: 'อ่างทอง', id: 'angthong', latitude: 14.5896, longitude: 100.4538, latDelta: 0.15, lngDelta: 0.15, minLat: 14.4, maxLat: 14.7, minLng: 100.2, maxLng: 100.6 },
  { label: 'เชียงใหม่', id: 'chiangmai', latitude: 18.7883, longitude: 98.9853, latDelta: 0.5, lngDelta: 0.5, minLat: 17.2, maxLat: 20.2, minLng: 98.0, maxLng: 99.5 },
  { label: 'เชียงราย', id: 'chiangrai', latitude: 19.9105, longitude: 99.8325, latDelta: 0.4, lngDelta: 0.4, minLat: 19.0, maxLat: 20.5, minLng: 99.2, maxLng: 100.6 },
  { label: 'น่าน', id: 'nan', latitude: 18.7830, longitude: 100.7756, latDelta: 0.45, lngDelta: 0.45, minLat: 18.0, maxLat: 19.7, minLng: 100.4, maxLng: 101.4 },
  { label: 'พะเยา', id: 'phayao', latitude: 19.1658, longitude: 99.9023, latDelta: 0.35, lngDelta: 0.35, minLat: 18.7, maxLat: 19.7, minLng: 99.6, maxLng: 100.7 },
  { label: 'แพร่', id: 'phrae', latitude: 18.1446, longitude: 100.1403, latDelta: 0.3, lngDelta: 0.3, minLat: 17.6, maxLat: 18.7, minLng: 99.5, maxLng: 100.4 },
  { label: 'แม่ฮ่องสอน', id: 'maehongson', latitude: 19.3021, longitude: 97.9641, latDelta: 0.45, lngDelta: 0.45, minLat: 17.7, maxLat: 19.8, minLng: 97.3, maxLng: 98.6 },
  { label: 'ลำปาง', id: 'lampang', latitude: 18.2855, longitude: 99.4924, latDelta: 0.45, lngDelta: 0.45, minLat: 17.1, maxLat: 19.0, minLng: 99.1, maxLng: 100.0 },
  { label: 'ลำพูน', id: 'lamphun', latitude: 18.5745, longitude: 99.0087, latDelta: 0.25, lngDelta: 0.25, minLat: 17.7, maxLat: 18.7, minLng: 98.7, maxLng: 99.4 },
  { label: 'อุตรดิตถ์', id: 'uttaradit', latitude: 17.6256, longitude: 100.0993, latDelta: 0.35, lngDelta: 0.35, minLat: 17.1, maxLat: 18.2, minLng: 99.9, maxLng: 101.2 },
  { label: 'นครราชสีมา', id: 'korat', latitude: 14.9799, longitude: 102.0978, latDelta: 0.5, lngDelta: 0.5, minLat: 14.1, maxLat: 15.8, minLng: 101.3, maxLng: 103.1 },
  { label: 'กาฬสินธุ์', id: 'kalasin', latitude: 16.4328, longitude: 103.5068, latDelta: 0.3, lngDelta: 0.3, minLat: 16.1, maxLat: 17.0, minLng: 103.1, maxLng: 103.9 },
  { label: 'ขอนแก่น', id: 'khonkaen', latitude: 16.4322, longitude: 102.8236, latDelta: 0.4, lngDelta: 0.4, minLat: 15.6, maxLat: 17.1, minLng: 101.9, maxLng: 103.2 },
  { label: 'ชัยภูมิ', id: 'chaiyaphum', latitude: 15.8068, longitude: 102.0315, latDelta: 0.45, lngDelta: 0.45, minLat: 15.3, maxLat: 16.6, minLng: 101.2, maxLng: 102.7 },
  { label: 'นครพนม', id: 'nakhonphanom', latitude: 17.3949, longitude: 104.7915, latDelta: 0.35, lngDelta: 0.35, minLat: 16.9, maxLat: 18.0, minLng: 104.1, maxLng: 104.9 },
  { label: 'บึงกาฬ', id: 'buengkan', latitude: 18.3619, longitude: 103.6524, latDelta: 0.3, lngDelta: 0.3, minLat: 17.9, maxLat: 18.5, minLng: 103.2, maxLng: 104.3 },
  { label: 'บุรีรัมย์', id: 'buriram', latitude: 14.9930, longitude: 103.1026, latDelta: 0.45, lngDelta: 0.45, minLat: 14.1, maxLat: 15.6, minLng: 102.5, maxLng: 103.6 },
  { label: 'มหาสารคาม', id: 'mahasarakham', latitude: 16.1848, longitude: 103.3008, latDelta: 0.3, lngDelta: 0.3, minLat: 15.4, maxLat: 16.5, minLng: 102.9, maxLng: 103.5 },
  { label: 'มุกดาหาร', id: 'mukdahan', latitude: 16.5430, longitude: 104.7244, latDelta: 0.25, lngDelta: 0.25, minLat: 16.2, maxLat: 16.9, minLng: 104.1, maxLng: 104.9 },
  { label: 'ยโสธร', id: 'yasothon', latitude: 15.7926, longitude: 104.1453, latDelta: 0.25, lngDelta: 0.25, minLat: 15.4, maxLat: 16.2, minLng: 104.0, maxLng: 104.7 },
  { label: 'ร้อยเอ็ด', id: 'roiet', latitude: 16.0538, longitude: 103.6520, latDelta: 0.35, lngDelta: 0.35, minLat: 15.4, maxLat: 16.4, minLng: 103.3, maxLng: 104.4 },
  { label: 'เลย', id: 'loei', latitude: 17.4860, longitude: 101.7223, latDelta: 0.4, lngDelta: 0.4, minLat: 16.7, maxLat: 18.2, minLng: 100.9, maxLng: 102.2 },
  { label: 'ศรีสะเกษ', id: 'sisaket', latitude: 15.1154, longitude: 104.3224, latDelta: 0.35, lngDelta: 0.35, minLat: 14.3, maxLat: 15.5, minLng: 103.9, maxLng: 104.9 },
  { label: 'สกลนคร', id: 'sakonnakhon', latitude: 17.1610, longitude: 104.1472, latDelta: 0.4, lngDelta: 0.4, minLat: 16.6, maxLat: 18.0, minLng: 103.2, maxLng: 104.4 },
  { label: 'สุรินทร์', id: 'surin', latitude: 14.8818, longitude: 103.4937, latDelta: 0.4, lngDelta: 0.4, minLat: 14.3, maxLat: 15.4, minLng: 103.1, maxLng: 104.0 },
  { label: 'หนองคาย', id: 'nongkhai', latitude: 17.8785, longitude: 102.7413, latDelta: 0.3, lngDelta: 0.3, minLat: 17.5, maxLat: 18.3, minLng: 102.1, maxLng: 103.4 },
  { label: 'หนองบัวลำภู', id: 'nongbualamphu', latitude: 17.2034, longitude: 102.4385, latDelta: 0.25, lngDelta: 0.25, minLat: 16.8, maxLat: 17.7, minLng: 101.9, maxLng: 102.7 },
  { label: 'อำนาจเจริญ', id: 'amnatcharoen', latitude: 15.8564, longitude: 104.6293, latDelta: 0.2, lngDelta: 0.2, minLat: 15.6, maxLat: 16.3, minLng: 104.3, maxLng: 105.0 },
  { label: 'อุดรธานี', id: 'udonthani', latitude: 17.4138, longitude: 102.7872, latDelta: 0.4, lngDelta: 0.4, minLat: 16.8, maxLat: 18.1, minLng: 102.2, maxLng: 103.5 },
  { label: 'อุบลราชธานี', id: 'ubonratchathani', latitude: 15.2294, longitude: 104.8569, latDelta: 0.45, lngDelta: 0.45, minLat: 14.1, maxLat: 16.1, minLng: 104.4, maxLng: 105.7 },
  { label: 'จันทบุรี', id: 'chanthaburi', latitude: 12.6096, longitude: 102.1130, latDelta: 0.3, lngDelta: 0.3, minLat: 12.4, maxLat: 13.4, minLng: 101.7, maxLng: 102.7 },
  { label: 'ฉะเชิงเทรา', id: 'chachoengsao', latitude: 13.6890, longitude: 101.0744, latDelta: 0.35, lngDelta: 0.35, minLat: 13.1, maxLat: 14.0, minLng: 100.8, maxLng: 102.2 },
  { label: 'ชลบุรี', id: 'chonburi', latitude: 13.3611, longitude: 100.9847, latDelta: 0.3, lngDelta: 0.3, minLat: 12.5, maxLat: 13.6, minLng: 100.6, maxLng: 101.6 },
  { label: 'ตราด', id: 'trat', latitude: 12.2428, longitude: 102.5175, latDelta: 0.3, lngDelta: 0.3, minLat: 11.6, maxLat: 12.8, minLng: 102.2, maxLng: 102.9 },
  { label: 'ปราจีนบุรี', id: 'prachinburi', latitude: 14.0501, longitude: 101.3732, latDelta: 0.3, lngDelta: 0.3, minLat: 13.6, maxLat: 14.4, minLng: 101.1, maxLng: 102.0 },
  { label: 'ระยอง', id: 'rayong', latitude: 12.6815, longitude: 101.2813, latDelta: 0.25, lngDelta: 0.25, minLat: 12.5, maxLat: 13.2, minLng: 101.0, maxLng: 101.8 },
  { label: 'สระแก้ว', id: 'sakaeo', latitude: 13.8241, longitude: 102.0646, latDelta: 0.35, lngDelta: 0.35, minLat: 13.4, maxLat: 14.4, minLng: 101.7, maxLng: 103.0 },
  { label: 'กาญจนบุรี', id: 'kanchanaburi', latitude: 14.0228, longitude: 99.5328, latDelta: 0.6, lngDelta: 0.6, minLat: 13.3, maxLat: 15.3, minLng: 98.1, maxLng: 100.0 },
  { label: 'ตาก', id: 'tak', latitude: 16.8840, longitude: 99.1258, latDelta: 0.6, lngDelta: 0.6, minLat: 15.5, maxLat: 17.9, minLng: 98.1, maxLng: 99.7 },
  { label: 'ประจวบคีรีขันธ์', id: 'prachuapkhirikhan', latitude: 11.8042, longitude: 99.7963, latDelta: 0.5, lngDelta: 0.5, minLat: 11.0, maxLat: 12.8, minLng: 99.3, maxLng: 100.1 },
  { label: 'เพชรบุรี', id: 'phetchaburi', latitude: 13.1118, longitude: 99.9439, latDelta: 0.35, lngDelta: 0.35, minLat: 12.4, maxLat: 13.4, minLng: 99.3, maxLng: 100.2 },
  { label: 'ราชบุรี', id: 'ratchaburi', latitude: 13.5283, longitude: 99.8134, latDelta: 0.35, lngDelta: 0.35, minLat: 13.2, maxLat: 13.9, minLng: 99.2, maxLng: 100.1 },
  { label: 'กระบี่', id: 'krabi', latitude: 8.0584, longitude: 98.9189, latDelta: 0.3, lngDelta: 0.3, minLat: 7.5, maxLat: 8.7, minLng: 98.6, maxLng: 99.4 },
  { label: 'ชุมพร', id: 'chumphon', latitude: 10.4930, longitude: 99.1800, latDelta: 0.4, lngDelta: 0.4, minLat: 9.6, maxLat: 11.0, minLng: 98.9, maxLng: 99.5 },
  { label: 'ตรัง', id: 'trang', latitude: 7.5562, longitude: 99.6114, latDelta: 0.3, lngDelta: 0.3, minLat: 7.1, maxLat: 8.0, minLng: 99.3, maxLng: 99.9 },
  { label: 'นครศรีธรรมราช', id: 'nakhonsithammarat', latitude: 8.4326, longitude: 99.9631, latDelta: 0.5, lngDelta: 0.5, minLat: 7.8, maxLat: 9.4, minLng: 99.3, maxLng: 100.4 },
  { label: 'นราธิวาส', id: 'narathiwat', latitude: 6.4255, longitude: 101.8253, latDelta: 0.25, lngDelta: 0.25, minLat: 5.8, maxLat: 6.6, minLng: 101.4, maxLng: 102.1 },
  { label: 'ปัตตานี', id: 'pattani', latitude: 6.8672, longitude: 101.2497, latDelta: 0.2, lngDelta: 0.2, minLat: 6.5, maxLat: 7.0, minLng: 101.0, maxLng: 101.6 },
  { label: 'พังงา', id: 'phangnga', latitude: 8.4410, longitude: 98.5255, latDelta: 0.3, lngDelta: 0.3, minLat: 8.1, maxLat: 9.0, minLng: 98.2, maxLng: 98.8 },
  { label: 'พัทลุง', id: 'phatthalung', latitude: 7.6167, longitude: 100.0740, latDelta: 0.3, lngDelta: 0.3, minLat: 7.1, maxLat: 7.9, minLng: 99.8, maxLng: 100.4 },
  { label: 'ภูเก็ต', id: 'phuket', latitude: 7.8804, longitude: 98.3923, latDelta: 0.25, lngDelta: 0.25, minLat: 7.7, maxLat: 8.2, minLng: 98.2, maxLng: 98.5 },
  { label: 'ยะลา', id: 'yala', latitude: 6.5411, longitude: 101.2804, latDelta: 0.3, lngDelta: 0.3, minLat: 5.6, maxLat: 6.7, minLng: 100.9, maxLng: 101.6 },
  { label: 'ระนอง', id: 'ranong', latitude: 9.9529, longitude: 98.6348, latDelta: 0.35, lngDelta: 0.35, minLat: 9.3, maxLat: 10.7, minLng: 98.4, maxLng: 98.9 },
  { label: 'สงขลา', id: 'songkhla', latitude: 7.1897, longitude: 100.5954, latDelta: 0.4, lngDelta: 0.4, minLat: 6.3, maxLat: 7.9, minLng: 100.0, maxLng: 101.2 },
  { label: 'สตูล', id: 'satun', latitude: 6.6231, longitude: 100.0674, latDelta: 0.25, lngDelta: 0.25, minLat: 6.4, maxLat: 7.0, minLng: 99.7, maxLng: 100.3 },
  { label: 'สุราษฎร์ธานี', id: 'suratthani', latitude: 9.1344, longitude: 99.3334, latDelta: 0.5, lngDelta: 0.5, minLat: 8.3, maxLat: 9.8, minLng: 98.2, maxLng: 100.2 },
];

const DEFAULT_REGION = { latitude: 14.9799, longitude: 102.0978, latitudeDelta: 12.0, longitudeDelta: 12.0 };

function formatTimestamp(timestamp) {
  if (!timestamp) return 'ไม่ระบุเวลา';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }) + ' น.';
}

// ── Filter chip config ────────────────────────────────────────────
const FILTER_OPTIONS = [
  { id: 'all',   label: 'ทั้งหมด',          icon: 'apps-outline',        color: colors.primary },
  { id: 'lost',  label: 'ตามหาเจ้าของ',     icon: 'alert-circle-outline', color: colors.lost },
  { id: 'sight', label: 'แจ้งพบเบาะแส',     icon: 'camera-outline',       color: colors.warn },
];

export default function MapScreen() {
  const [items, setItems]                         = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [selected, setSelected]                   = useState(null);
  const [myPhone, setMyPhone]                     = useState('');
  const [activeFilter, setActiveFilter]           = useState('all');
  const [searchQuery, setSearchQuery]             = useState('');
  const [selectedProvince, setSelectedProvince]   = useState(PROVINCES[0]);
  const [provinceModalVisible, setProvinceModalVisible] = useState(false);
  const [mapRegion, setMapRegion]                 = useState(DEFAULT_REGION);
  const [provinceSearchQuery, setProvinceSearchQuery]   = useState('');

  // ── Fetch ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const phone = await AsyncStorage.getItem('userPhone');
      setMyPhone(phone || '');
      const list = [];

      const lostSnap = await getDocs(query(collection(db, 'cats'), where('status', '==', 'lost')));
      lostSnap.docs.forEach((d) => {
        const c = d.data();
        if (typeof c.lostLat === 'number') {
          list.push({
            key: `lost-${d.id}`, docId: d.id, lat: c.lostLat, lng: c.lostLng,
            color: colors.lost, image: c.imageBase64, kind: 'lost',
            title: c.name,
            sub: `แมวหาย • สี${c.color}${c.sex === 'ผู้' ? ' • ♂' : c.sex === 'เมีย' ? ' • ♀' : ''}`,
            breed: c.breed || '', reward: c.reward,
            note: c.lostNote || c.notes || '',
            phone: c.ownerPhone, role: 'เจ้าของ', createdAt: c.createdAt,
          });
        }
      });

      const sightSnap = await getDocs(collection(db, 'sightings'));
      sightSnap.docs.forEach((d) => {
        const s = d.data();
        if (typeof s.foundLat === 'number') {
          const sure = s.confidence === 'lost';
          list.push({
            key: `sight-${d.id}`, docId: d.id, lat: s.foundLat, lng: s.foundLng,
            color: sure ? colors.lost : colors.warn, image: s.imageBase64,
            kind: 'sight', title: 'มีคนเจอแมว',
            sub: `สี${s.color} • ${sure ? 'มั่นใจว่าแมวหาย' : 'อาจเป็นจร/หาย'}`,
            breed: '', matchedCatName: s.matchedCatName,
            phone: s.finderPhone, role: 'คนที่เจอ',
            note: s.notes || s.lostNote || '', createdAt: s.createdAt,
          });
        }
      });

      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setItems(list);
    } catch (e) { console.log('Map fetch error:', e); }
    loading && setLoading(false);
  }, [loading]);

  useFocusEffect(useCallback(() => { fetchData(); setSelected(null); }, [fetchData]));

  // ── Derived data ───────────────────────────────────────────────────
  const filteredItems = useMemo(() => items.filter((item) => {
    const matchesType = activeFilter === 'all' || item.kind === activeFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q
      || item.title?.toLowerCase().includes(q)
      || item.sub?.toLowerCase().includes(q)
      || item.note?.toLowerCase().includes(q)
      || item.breed?.toLowerCase().includes(q);
    let matchesProvince = true;
    if (selectedProvince.id !== 'all') {
      const { minLat, maxLat, minLng, maxLng } = selectedProvince;
      matchesProvince = item.lat >= minLat && item.lat <= maxLat && item.lng >= minLng && item.lng <= maxLng;
    }
    return matchesType && matchesSearch && matchesProvince;
  }), [items, activeFilter, searchQuery, selectedProvince]);

  const filteredProvinces = useMemo(() => {
    const q = provinceSearchQuery.trim().toLowerCase();
    return q ? PROVINCES.filter(p => p.label.toLowerCase().includes(q)) : PROVINCES;
  }, [provinceSearchQuery]);

  // ── Helpers ────────────────────────────────────────────────────────
  const handleProvinceSelect = (province) => {
    setSelectedProvince(province);
    setProvinceModalVisible(false);
    setProvinceSearchQuery('');
    setMapRegion({ latitude: province.latitude, longitude: province.longitude, latitudeDelta: province.latDelta, longitudeDelta: province.lngDelta });
  };

  const call = (phone) => {
    if (!phone) return;
    Alert.alert('โทรออก', `โทรหา ${phone} ?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'โทร', onPress: () => Linking.openURL(`tel:${phone}`) },
    ]);
  };

  const navigateToLocation = (lat, lng, label) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      Alert.alert('ผิดพลาด', 'ไม่พบพิกัดของหมุดนี้');
      return;
    }
    const scheme = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}(${label})`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });
    Linking.canOpenURL(scheme)
      .then(ok => Linking.openURL(ok ? scheme : `http://maps.google.com/?q=${lat},${lng}`))
      .catch(err => console.error(err));
  };

  const deleteSighting = (item) => {
    Alert.alert('ลบหมุดนี้?', 'หมุดแมวที่คุณปักไว้จะถูกลบออกจากแผนที่ถาวร', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'sightings', item.docId));
          setSelected(null); fetchData();
        } catch { Alert.alert('ผิดพลาด', 'ลบไม่สำเร็จ ลองใหม่อีกครั้ง'); }
      }},
    ]);
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <GradientHeader
        title="แผนที่"
        emoji="🗺️"
        subtitle={filteredItems.length
          ? `${filteredItems.length} จุด • แตะหมุดเพื่อดูรายละเอียด`
          : 'ตำแหน่งแมวหาย & คนเจอ'}
      />

      {/* ── Control bar ──────────────────────────────────────── */}
      <View style={styles.controlBar}>

        {/* Row 1 — Filter chips */}
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map(opt => {
            const isActive = activeFilter === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.chip, isActive && { backgroundColor: opt.color, borderColor: opt.color }]}
                onPress={() => setActiveFilter(opt.id)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={opt.icon}
                  size={14}
                  color={isActive ? '#fff' : colors.sub}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Row 2 — Province picker */}
        <TouchableOpacity
          style={styles.provincePicker}
          onPress={() => setProvinceModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.provincePickerLeft}>
            <Ionicons name="location" size={15} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.provincePickerText} numberOfLines={1}>
              {selectedProvince.label}
            </Text>
            {selectedProvince.id !== 'all' && (
              <View style={styles.provinceBadge}>
                <Text style={styles.provinceBadgeText}>กรองอยู่</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-down" size={16} color={colors.sub} />
        </TouchableOpacity>

      </View>

      {/* ── Map ──────────────────────────────────────────────── */}
      <View style={styles.mapWrap}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <MapView
              style={StyleSheet.absoluteFill}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
            >
              {filteredItems.map((m) => (
                <Marker
                  key={m.key}
                  coordinate={{ latitude: m.lat, longitude: m.lng }}
                  onPress={() => setSelected(m)}
                >
                  <View style={[styles.marker, { borderColor: m.kind === 'lost' ? colors.lost : colors.warn }]}>
                    {m.image
                      ? <Image source={{ uri: `data:image/jpeg;base64,${m.image}` }} style={styles.markerImg} />
                      : <Ionicons name="paw" size={16} color="#fff" />
                    }
                    <View style={[styles.markerTip, { borderTopColor: m.kind === 'lost' ? colors.lost : colors.warn }]} />
                  </View>
                </Marker>
              ))}
            </MapView>

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.lost }]} />
                <Text style={styles.legendText}>แมวหาย</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.warn }]} />
                <Text style={styles.legendText}>อาจเป็นจร/หาย</Text>
              </View>
            </View>

            {filteredItems.length === 0 && (
              <View style={styles.emptyOverlay}>
                <View style={styles.emptyCard}>
                  <Ionicons name="location-outline" size={38} color={colors.primary} />
                  <Text style={styles.emptyTitle}>ไม่พบหมุดที่ค้นหา</Text>
                  <Text style={styles.emptySub}>ลองเปลี่ยนตัวกรองหรือพื้นที่จังหวัดใหม่</Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>

      {/* ── Province Modal ────────────────────────────────────── */}
      <Modal
        visible={provinceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setProvinceModalVisible(false); setProvinceSearchQuery(''); }}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => { setProvinceModalVisible(false); setProvinceSearchQuery(''); }}
        >
          <View style={styles.provinceSheet}>
            {/* Handle */}
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>เลือกจังหวัด</Text>
              <TouchableOpacity onPress={() => { setProvinceModalVisible(false); setProvinceSearchQuery(''); }}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.sheetSearch}>
              <Ionicons name="search" size={16} color={colors.sub} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.sheetSearchInput}
                placeholder="ค้นหาชื่อจังหวัด..."
                value={provinceSearchQuery}
                onChangeText={setProvinceSearchQuery}
                clearButtonMode="while-editing"
              />
            </View>

            <FlatList
              data={filteredProvinces}
              keyExtractor={p => p.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isActive = selectedProvince.id === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.provinceRow, isActive && styles.provinceRowActive]}
                    onPress={() => handleProvinceSelect(item)}
                  >
                    <Text style={[styles.provinceLabel, isActive && styles.provinceLabelActive]}>
                      {item.label}
                    </Text>
                    {isActive && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Detail Modal ──────────────────────────────────────── */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.detailBackdrop} activeOpacity={1} onPress={() => setSelected(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.detailCard}>
            {selected && (
              <>
                {/* Image */}
                <View style={styles.detailImgWrap}>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${selected.image}` }}
                    style={styles.detailImg}
                    resizeMode="cover"
                  />
                  <TouchableOpacity style={styles.detailClose} onPress={() => setSelected(null)}>
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                  <View style={[styles.detailTag, { backgroundColor: selected.color === colors.warn ? colors.warn : colors.lost }]}>
                    <Ionicons name={selected.kind === 'sight' ? 'camera' : 'alert-circle'} size={12} color="#fff" />
                    <Text style={styles.detailTagText}>
                      {selected.kind === 'sight' ? 'มีคนเจอ' : 'แมวหาย'}
                    </Text>
                  </View>
                </View>

                {/* Body */}
                <View style={styles.detailBody}>
                  <Text style={styles.detailTitle}>{selected.title}</Text>
                  <Text style={styles.detailSub}>{selected.sub}</Text>

                  <View style={styles.detailTime}>
                    <Ionicons name="time-outline" size={13} color={colors.sub} />
                    <Text style={styles.detailTimeText}>อัปโหลดเมื่อ {formatTimestamp(selected.createdAt)}</Text>
                  </View>

                  {selected.reward > 0 && (
                    <View style={styles.rewardBadge}>
                      <Text style={styles.rewardText}>💰 รางวัล {Number(selected.reward).toLocaleString()} บาท</Text>
                    </View>
                  )}
                  {selected.matchedCatName && (
                    <Text style={styles.matchText}>🎯 คล้ายโพสต์: {selected.matchedCatName}</Text>
                  )}
                  {!!selected.note && <Text style={styles.noteText}>{selected.note}</Text>}

                  {/* Actions */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.btnCall} onPress={() => call(selected.phone)}>
                      <Ionicons name="call" size={17} color="#fff" />
                      <Text style={styles.btnCallText}>โทรหา{selected.role}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnNav, {
                        backgroundColor: selected.kind === 'lost' ? colors.lostSoft : colors.warnSoft,
                        borderColor: selected.kind === 'lost' ? colors.lost + '30' : colors.warn + '30',
                      }]}
                      onPress={() => navigateToLocation(selected.lat, selected.lng, selected.title)}
                    >
                      <Ionicons
                        name="navigate-circle-outline"
                        size={19}
                        color={selected.kind === 'lost' ? colors.lost : colors.warn}
                      />
                      <Text style={[styles.btnNavText, { color: selected.kind === 'lost' ? colors.lost : colors.warn }]}>
                        นำทาง
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {selected.kind === 'sight' && selected.phone === myPhone && (
                    <TouchableOpacity style={styles.btnDelete} onPress={() => deleteSighting(selected)}>
                      <Ionicons name="trash-outline" size={16} color={colors.lost} />
                      <Text style={styles.btnDeleteText}>ลบหมุดนี้</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Control bar
  controlBar: {
    backgroundColor: '#fff',
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e4e6eb',
  },

  // Filter chips (row 1)
  filterRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: '#e4e6eb',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  chipText: { fontSize: 12.5, fontWeight: '700', color: colors.sub },
  chipTextActive: { color: '#fff' },

  // Province picker (row 2)
  provincePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f8f9fb',
    borderWidth: 1.5,
    borderColor: '#e4e6eb',
    paddingHorizontal: 12,
  },
  provincePickerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  provincePickerText: { fontSize: 13.5, fontWeight: '700', color: colors.text, flex: 1 },
  provinceBadge: {
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    marginLeft: 6,
  },
  provinceBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },

  // Map
  mapWrap: { flex: 1, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Markers
  marker: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 3,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    ...shadow,
  },
  markerImg: { width: '100%', height: '100%', borderRadius: 19 },
  markerTip: {
    position: 'absolute', bottom: -8,
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },

  // Legend
  legend: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: '#ffffffee', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14, gap: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd',
    ...shadow,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '600', color: colors.text },

  // Empty state
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(246,247,251,0.65)',
  },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 28,
    alignItems: 'center', marginHorizontal: 40, ...shadow,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 10 },
  emptySub: { fontSize: 13, color: colors.sub, marginTop: 5, textAlign: 'center', lineHeight: 20 },

  // Province sheet
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
  provinceSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: '65%', paddingBottom: 24,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#d1d5db', alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  sheetSearch: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f3f4f6', height: 40, borderRadius: 10,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#e4e6eb',
  },
  sheetSearchInput: { flex: 1, fontSize: 13.5, color: colors.text, paddingVertical: 0 },
  provinceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f5f5f5',
  },
  provinceRowActive: { backgroundColor: '#f0f7ff' },
  provinceLabel: { fontSize: 14.5, color: colors.text, fontWeight: '500' },
  provinceLabelActive: { color: colors.primary, fontWeight: '700' },

  // Detail modal
  detailBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22,
  },
  detailCard: {
    width: '100%', maxWidth: 370, backgroundColor: '#fff',
    borderRadius: 22, overflow: 'hidden', ...shadow,
  },
  detailImgWrap: { position: 'relative' },
  detailImg: { width: '100%', height: 220, backgroundColor: '#eee' },
  detailClose: {
    position: 'absolute', top: 12, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.48)',
    alignItems: 'center', justifyContent: 'center',
  },
  detailTag: {
    position: 'absolute', bottom: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20,
  },
  detailTagText: { color: '#fff', fontWeight: '700', fontSize: 12.5 },
  detailBody: { padding: 18 },
  detailTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  detailSub: { fontSize: 14.5, color: colors.sub, marginTop: 4 },
  detailTime: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  detailTimeText: { fontSize: 12, color: colors.sub },

  rewardBadge: {
    backgroundColor: '#fffbeb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    marginTop: 10, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: '#fde68a',
  },
  rewardText: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  matchText: { fontSize: 13.5, fontWeight: '700', color: colors.home, marginTop: 8 },
  noteText: { fontSize: 13.5, color: colors.sub, marginTop: 8, lineHeight: 20 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnCall: {
    flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: colors.primary, height: 50, borderRadius: 14,
  },
  btnCallText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
  btnNav: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 50, borderRadius: 14, borderWidth: 1,
  },
  btnNavText: { fontWeight: '800', fontSize: 13.5 },
  btnDelete: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 44, borderRadius: 12, marginTop: 8,
    backgroundColor: colors.lostSoft,
  },
  btnDeleteText: { color: colors.lost, fontWeight: '800', fontSize: 14 },
});