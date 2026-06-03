import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const YEARS = Array.from({ length: 26 }, (_, i) => CURRENT_YEAR - i); // ย้อนหลัง 25 ปี
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

// เลือกวันเกิด → ส่งกลับเป็นสตริง 'YYYY-MM-DD'
export default function DOBPicker({ visible, value, onCancel, onConfirm }) {
  const insets = useSafeAreaInsets();

  const makeInit = () => {
    if (value) {
      const d = new Date(`${value}T00:00:00`);
      if (!isNaN(d.getTime())) return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
    }
    return { y: CURRENT_YEAR - 1, m: NOW.getMonth(), d: 1 };
  };
  const [sel, setSel] = useState(makeInit);

  useEffect(() => { if (visible) setSel(makeInit()); }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxDay = daysInMonth(sel.y, sel.m);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  const setPart = (part, v) => {
    setSel((p) => {
      const next = { ...p, [part]: v };
      const md = daysInMonth(next.y, next.m);
      if (next.d > md) next.d = md;
      return next;
    });
  };

  const confirm = () => {
    const s = `${sel.y}-${String(sel.m + 1).padStart(2, '0')}-${String(sel.d).padStart(2, '0')}`;
    onConfirm?.(s);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]} onPress={() => {}}>
          <View style={styles.grabber} />
          <Text style={styles.title}>เลือกวันเกิดน้อง 🎂</Text>

          <View style={styles.cols}>
            <View style={styles.colWrap}>
              <Text style={styles.colHead}>วัน</Text>
              <ScrollView style={styles.col} showsVerticalScrollIndicator={false}>
                {days.map((d) => (
                  <TouchableOpacity key={d} style={[styles.row, sel.d === d && styles.rowActive]} onPress={() => setPart('d', d)}>
                    <Text style={[styles.rowText, sel.d === d && styles.rowTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.colWrap}>
              <Text style={styles.colHead}>เดือน</Text>
              <ScrollView style={styles.col} showsVerticalScrollIndicator={false}>
                {TH_MONTHS.map((nm, i) => (
                  <TouchableOpacity key={nm} style={[styles.row, sel.m === i && styles.rowActive]} onPress={() => setPart('m', i)}>
                    <Text style={[styles.rowText, sel.m === i && styles.rowTextActive]}>{nm}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.colWrap}>
              <Text style={styles.colHead}>ปี (พ.ศ.)</Text>
              <ScrollView style={styles.col} showsVerticalScrollIndicator={false}>
                {YEARS.map((y) => (
                  <TouchableOpacity key={y} style={[styles.row, sel.y === y && styles.rowActive]} onPress={() => setPart('y', y)}>
                    <Text style={[styles.rowText, sel.y === y && styles.rowTextActive]}>{y + 543}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={onCancel}>
              <Text style={styles.cancelText}>ยกเลิก</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.ok]} onPress={confirm}>
              <Text style={styles.okText}>ยืนยัน</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: 18, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 14 },

  cols: { flexDirection: 'row', gap: 10 },
  colWrap: { flex: 1 },
  colHead: { fontSize: 12.5, fontWeight: '700', color: colors.sub, textAlign: 'center', marginBottom: 8 },
  col: { height: 220, backgroundColor: colors.bg, borderRadius: radius.md },
  row: { height: 44, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6, borderRadius: radius.sm },
  rowActive: { backgroundColor: colors.primary },
  rowText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  rowTextActive: { color: '#fff', fontWeight: '800' },

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: { flex: 1, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cancel: { backgroundColor: colors.bg },
  cancelText: { color: colors.sub, fontWeight: '800', fontSize: 16 },
  ok: { backgroundColor: colors.primary },
  okText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});