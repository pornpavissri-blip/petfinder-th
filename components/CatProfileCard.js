import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, shadowSoft, statusInfo, daysAgo, ageText, formatBirthDate } from '../theme';

export default function CatProfileCard({ cat, onEdit, onReportLost, onMarkHome, onDelete }) {
  const s = statusInfo(cat.status);
  const isLost = cat.status === 'lost';

  const age = ageText(cat.birthDate);     // คำนวณจากวันเกิด
  const birth = formatBirthDate(cat.birthDate);
  const ageDisplay = age || cat.age || null; // เผื่อข้อมูลเก่าที่ยังเป็นข้อความอายุ
  const sexLabel = cat.sex === 'ผู้' ? '♂ ผู้' : cat.sex === 'เมีย' ? '♀ เมีย' : 'ไม่ระบุเพศ';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* รูปใหญ่ + สถานะ */}
      <View style={styles.hero}>
        <Image source={{ uri: `data:image/jpeg;base64,${cat.imageBase64}` }} style={styles.heroImg} />
        <View style={[styles.statusPill, { backgroundColor: s.color }]}>
          <Ionicons name={s.icon} size={14} color="#fff" />
          <Text style={styles.statusPillText}>{s.label}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.name}>{cat.name}</Text>
        <Text style={styles.meta}>{sexLabel} • สี{cat.color}</Text>

        {/* อายุของน้อง (อิงจากวันเกิด) */}
        <View style={styles.ageCard}>
          <View style={styles.ageCircle}><Ionicons name="calendar" size={22} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ageLabel}>อายุของน้อง</Text>
            <Text style={styles.ageValue}>{ageDisplay || 'ยังไม่ระบุ'}</Text>
            <Text style={styles.ageSince}>
              {birth ? `เกิดวันที่ ${birth}` : 'แตะ "แก้ไขข้อมูล" เพื่อใส่วันเกิดน้อง'}
            </Text>
          </View>
        </View>

        {/* ข้อมูลย่อ เพศ / สี / พันธุ์ */}
        <View style={styles.tiles}>
          <View style={styles.tile}>
            <Ionicons name={cat.sex === 'ผู้' ? 'male' : cat.sex === 'เมีย' ? 'female' : 'help'} size={18} color={colors.primary} />
            <Text style={styles.tileValue}>{sexLabel}</Text>
            <Text style={styles.tileLabel}>เพศ</Text>
          </View>
          <View style={styles.tile}>
            <Ionicons name="color-palette" size={18} color={colors.primary} />
            <Text style={styles.tileValue}>{cat.color}</Text>
            <Text style={styles.tileLabel}>สี</Text>
          </View>
          <View style={styles.tile}>
            <Ionicons name="paw" size={18} color={colors.primary} />
            <Text style={styles.tileValue}>{cat.breed || '-'}</Text>
            <Text style={styles.tileLabel}>พันธุ์</Text>
          </View>
        </View>

        {/* ลักษณะเด่น */}
        {cat.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🐱 ลักษณะเด่น</Text>
            <Text style={styles.sectionText}>{cat.notes}</Text>
          </View>
        ) : null}

        {/* ข้อมูลตอนหาย */}
        {isLost && (
          <View style={styles.lostBox}>
            <Text style={styles.lostTitle}>🔴 กำลังตามหา</Text>
            <Text style={styles.lostText}>แจ้งหายเมื่อ {daysAgo(cat.lostAt)}</Text>
            {cat.reward > 0 && <Text style={styles.lostText}>💰 รางวัล {Number(cat.reward).toLocaleString()} บาท</Text>}
            {cat.lostNote ? <Text style={styles.lostText}>📍 {cat.lostNote}</Text> : null}
          </View>
        )}

        {/* ปุ่มหลัก: สลับสถานะ */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: isLost ? colors.home : colors.lost }]}
          onPress={() => (isLost ? onMarkHome(cat) : onReportLost(cat))}
          activeOpacity={0.85}
        >
          <Ionicons name={isLost ? 'home' : 'megaphone'} size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>{isLost ? 'น้องกลับบ้านแล้ว' : 'แจ้งว่าน้องหาย'}</Text>
        </TouchableOpacity>

        {/* แก้ไข / ลบ */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(cat)} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={styles.editBtnText}>แก้ไขข้อมูล</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  hero: { position: 'relative' },
  heroImg: { width: '100%', height: 300, backgroundColor: '#eee' },
  statusPill: { position: 'absolute', bottom: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full },
  statusPillText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },

  body: { padding: 20 },
  name: { fontSize: 30, fontWeight: '800', color: colors.text },
  meta: { fontSize: 15, color: colors.sub, marginTop: 6 },

  ageCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: 18, marginTop: 20 },
  ageCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  ageLabel: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  ageValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 2 },
  ageSince: { fontSize: 12.5, color: colors.sub, marginTop: 4 },

  tiles: { flexDirection: 'row', gap: 12, marginTop: 16 },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: 16, paddingHorizontal: 6, alignItems: 'center', gap: 6, ...shadowSoft },
  tileValue: { fontSize: 15, fontWeight: '800', color: colors.text, textAlign: 'center' },
  tileLabel: { fontSize: 12, color: colors.sub },

  section: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginTop: 16, ...shadowSoft },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 8 },
  sectionText: { fontSize: 15, color: colors.sub, lineHeight: 23 },

  lostBox: { backgroundColor: colors.lostSoft, borderRadius: radius.lg, padding: 16, marginTop: 16, gap: 5 },
  lostTitle: { fontSize: 15, fontWeight: '800', color: colors.lost, marginBottom: 3 },
  lostText: { fontSize: 14, color: colors.text, lineHeight: 21 },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: radius.md, marginTop: 24 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 50, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  editBtnText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  deleteBtn: { width: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 50, borderRadius: radius.md, backgroundColor: colors.lostSoft },
  deleteBtnText: { color: colors.lost, fontWeight: '800', fontSize: 15 },
});