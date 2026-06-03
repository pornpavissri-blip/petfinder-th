import { useState, useEffect } from 'react'; // 1. เพิ่ม useState และ useEffect
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 2. นำเข้า AsyncStorage เพื่อดึงชื่อผู้ใช้
import { colors, radius, shadow, shadowSoft, statusInfo, daysAgo, displayAge, formatBirthDate } from '../theme';

export default function CatProfileCard({ cat, onEdit, onReportLost, onMarkHome, onDelete }) {
  const s = statusInfo(cat.status);
  const isLost = cat.status === 'lost';

  const birth = formatBirthDate(cat.birthDate);
  const ageDisplay = displayAge(cat);
  const sexLabel = cat.sex === 'ผู้' ? '♂ ผู้ / Male' : cat.sex === 'เมีย' ? '♀ เมีย / Female' : 'ไม่ระบุเพศ';

  // 3. เพิ่ม State สำหรับเก็บชื่อของ User ปัจจุบัน
  const [currentUserName, setCurrentUserName] = useState('กำลังโหลด...');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // ดึงชื่อผู้ใช้จาก AsyncStorage (ปรับ Key เช่น 'userName' หรือ 'name' ตามระบบของคุณ)
        const storedName = await AsyncStorage.getItem('userName'); 
        if (storedName) {
          setCurrentUserName(storedName);
        } else {
          setCurrentUserName('คุณ (เจ้าของระบบ)');
        }
      } catch (error) {
        console.log('Error fetching user data in card:', error);
        setCurrentUserName('ไม่สามารถดึงข้อมูลได้');
      }
    };

    fetchUserData();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      
      {/* 💳 บัตรประชาชนแมว (Cat ID Card Component) */}
      <View style={styles.idCard}>
        {/* หัวบัตร */}
        <View style={styles.cardHeader}>
          <Ionicons name="paw" size={18} color="#fff" />
          <Text style={styles.cardHeaderTitle}>บัตรประจำตัวประชากรแมว</Text>
        </View>

        {/* เนื้อหาภายในบัตร */}
        <View style={styles.cardBody}>
          
          {/* ฝั่งซ้าย: รูปถ่ายน้องแมว + ป้ายสถานะ */}
          <View style={styles.leftColumn}>
            <View style={styles.photoFrame}>
              <Image source={{ uri: `data:image/jpeg;base64,${cat.imageBase64}` }} style={styles.catPhoto} />
            </View>
            <View style={[styles.statusTag, { backgroundColor: s.color }]}>
              <Ionicons name={s.icon} size={11} color="#fff" />
              <Text style={styles.statusTagText}>{s.label}</Text>
            </View>
          </View>

          {/* ฝั่งขวา: รายละเอียดระบุตัวตน */}
          <View style={styles.rightColumn}>
            
            <View style={styles.infoRow}>
              <Text style={styles.labelTh}>ชื่อภาษาไทย:</Text>
              <Text style={styles.valueTh}>{cat.name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.labelTh}>สายพันธุ์:</Text>
              <Text style={styles.valueEn}>{cat.breed || 'พันธุ์ทาง (Domestic)'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.labelTh}>เพศ:</Text>
              <Text style={styles.valueEn}>{sexLabel}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.labelTh}>สีขน:</Text>
              <Text style={styles.valueEn}>{cat.color}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.labelTh}>วันเกิด / อายุ:</Text>
              <Text style={styles.valueEn}>{birth || 'ไม่ระบุ'} ({ageDisplay || 'ไม่ทราบอายุ'})</Text>
            </View>

            {/* 👤 ข้อมูลเจ้าของแมว (อัปเดตดึงจากสถานะล็อกอินปัจจุบัน) */}
            <View style={styles.ownerDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.labelOwner}>ชื่อเจ้าของแมว:</Text>
              <Text style={styles.valueOwner}>{currentUserName}</Text>
            </View>
            {cat.ownerPhone && (
              <View style={styles.infoRow}>
                <Text style={styles.labelTh}>ติดต่อ:</Text>
                <Text style={styles.valueEn}>{cat.ownerPhone}</Text>
              </View>
            )}

          </View>
        </View>

        {/* ลายเซ็นต์/ตราประทับตกแต่งท้ายบัตร */}
        <View style={styles.cardFooter}>
          
          <View style={styles.signatureBox}>
            <Text style={styles.signatureText}>สมาคมทาสแมวแห่งประเทศไทย</Text>
          </View>
        </View>
        
        {/* ลายน้ำรูปอุ้งเท้าพื้นหลังเพิ่มความสมจริง */}
        <View style={styles.watermark}>
          <Ionicons name="paw" size={140} color="rgba(74, 144, 226, 0.04)" />
        </View>
      </View>

      {/* 📋 รายละเอียดเพิ่มเติมด้านล่างบัตร */}
      <View style={styles.lowerContent}>
        {/* ลักษณะเด่น */}
        {cat.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🐱 ตำหนิ / ลักษณะเด่นพิเศษ</Text>
            <Text style={styles.sectionText}>{cat.notes}</Text>
          </View>
        ) : null}

        {/* ข้อมูลตอนหาย */}
        {isLost && (
          <View style={styles.lostBox}>
            <Text style={styles.lostTitle}>🔴 สถานะประกาศจับ/ตามหา</Text>
            <Text style={styles.lostText}>📢 หายออกจากบ้านเมื่อ {daysAgo(cat.lostAt)}</Text>
            {cat.reward > 0 && <Text style={styles.rewardText}>💰 เงินรางวัลนำส่ง: {Number(cat.reward).toLocaleString()} บาท</Text>}
            {cat.lostNote ? <Text style={styles.lostText}>📍 พิกัดสุดท้าย: {cat.lostNote}</Text> : null}
          </View>
        )}

        {/* ปุ่มหลัก: สลับสถานะ */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: isLost ? colors.home : colors.lost }]}
          onPress={() => (isLost ? onMarkHome(cat) : onReportLost(cat))}
          activeOpacity={0.85}
        >
          <Ionicons name={isLost ? 'home' : 'megaphone'} size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>{isLost ? 'พาน้องกลับบ้าน (เจอตัวแล้ว)' : 'ประกาศตามหา (แจ้งแมวหาย)'}</Text>
        </TouchableOpacity>

        {/* ปุ่มแก้ไข / ลบ */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(cat)} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={styles.editBtnText}>แก้ไขข้อมูลบัตร</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(cat)} activeOpacity={0.85}>
            <Ionicons name="trash-outline" size={18} color={colors.lost} />
            <Text style={styles.deleteBtnText}>ลบ</Text>
          </TouchableOpacity>
        </View>
      </View>

    </ScrollView>
  );
}

// ... คงส่วน styles ของคุณไว้เหมือนเดิมทุกประการ ...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  idCard: { backgroundColor: '#F0F5FA', borderWidth: 2, borderColor: '#B8D0EB', borderRadius: 16, margin: 16, overflow: 'hidden', position: 'relative', ...shadow },
  cardHeader: { backgroundColor: '#4A90E2', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 },
  cardHeaderTitle: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  cardBody: { flexDirection: 'row', padding: 14, gap: 14, zIndex: 2 },
  leftColumn: { alignItems: 'center', width: 110 },
  photoFrame: { width: 110, height: 135, borderRadius: 8, borderWidth: 3, borderColor: '#fff', backgroundColor: '#eee', ...shadowSoft, overflow: 'hidden' },
  catPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  statusTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, marginTop: 10, width: '100%', justifyContent: 'center', ...shadowSoft },
  statusTagText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  rightColumn: { flex: 1, gap: 5 },
  infoRow: { flexDirection: 'row', alignItems: 'baseline' },
  labelTh: { fontSize: 11, color: '#7B8EA5', width: 75, fontWeight: '600' },
  valueTh: { fontSize: 18, fontWeight: '800', color: '#2C3E50' },
  valueEn: { fontSize: 13, fontWeight: '700', color: '#34495E' },
  ownerDivider: { height: 1, backgroundColor: '#D6E4F0', marginVertical: 4 },
  labelOwner: { fontSize: 11, color: '#4A90E2', width: 75, fontWeight: '700' },
  valueOwner: { fontSize: 13, fontWeight: '800', color: '#2C3E50' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10, zIndex: 2 },
  cardSerial: { fontSize: 11, fontFamily: 'Courier', fontWeight: '700', color: '#7B8EA5' },
  signatureBox: { borderTopWidth: 1, borderTopColor: '#A0BCCF', paddingTop: 2 },
  signatureText: { fontSize: 9, color: '#7B8EA5', fontStyle: 'italic' },
  watermark: { position: 'absolute', bottom: -20, right: -20, zIndex: 1 },
  lowerContent: { paddingHorizontal: 16 },
  section: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginTop: 4, ...shadowSoft },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 8 },
  sectionText: { fontSize: 14, color: colors.sub, lineHeight: 22 },
  lostBox: { backgroundColor: colors.lostSoft, borderRadius: radius.lg, padding: 16, marginTop: 14, gap: 5, borderLeftWidth: 4, borderColor: colors.lost },
  lostTitle: { fontSize: 15, fontWeight: '800', color: colors.lost, marginBottom: 2 },
  lostText: { fontSize: 13.5, color: colors.text, lineHeight: 20 },
  rewardText: { fontSize: 14, fontWeight: '800', color: colors.lost, marginTop: 2 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: radius.md, marginTop: 20, ...shadow },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 48, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  editBtnText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  deleteBtn: { width: 85, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: radius.md, backgroundColor: colors.lostSoft },
  deleteBtnText: { color: colors.lost, fontWeight: '800', fontSize: 14 },
});
