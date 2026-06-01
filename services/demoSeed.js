// 🧪 services/demoSeed.js — สร้าง/ล้างข้อมูลแมวหายจำลอง สำหรับเดโม่
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentCoords } from './location';

const CENTER = { lat: 14.9799, lng: 102.0978 }; // นครราชสีมา (fallback)

const NAMES = ['มะลิ', 'ส้มจี๊ด', 'เหมียว', 'ดำดี', 'ขาวมณี', 'เจ้าด่าง', 'น้ำตาล', 'ครีม'];
const COLORS = ['ส้ม', 'ขาว', 'ดำ', 'เทา', 'น้ำตาล', 'ลายเสือ', 'สามสี', 'ขาวดำ'];
const NOTES = [
  'หายแถวตลาด ใส่ปลอกคอแดง ตกใจง่าย',
  'หลุดออกจากบ้าน เห็นล่าสุดใกล้วัด',
  'ขี้อ้อน เข้าหาคน มีจุดขาวที่อก',
  'หายตอนกลางคืน ชอบนอนใต้รถ',
  'ใส่ปลอกคอสีฟ้า มีกระดิ่ง',
  'กลัวคนแปลกหน้า ชอบหลบ',
];
const REWARDS = [0, 0, 200, 300, 500, 1000];

// เบอร์เจ้าของสมมุติ (กดโทรจะเปิด dialer เฉย ๆ ไม่ได้โทรจริง)
function fakePhone() {
  let n = '08';
  for (let i = 0; i < 8; i++) n += Math.floor(Math.random() * 10);
  return n;
}

// ดึงรูปแมวจริงจากเว็บแมวฟรี → base64
async function fetchCatBase64() {
  const res = await fetch(`https://cataas.com/cat?width=400&height=400&t=${Math.random()}`);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// สร้างแมวหายจำลอง count ตัว กระจายรอบตำแหน่งคุณ
export async function seedDemoCats(ownerPhone, count = 6) {
  const base = (await getCurrentCoords()) || CENTER;
  let created = 0;
  for (let i = 0; i < count; i++) {
    let img = null;
    try { img = await fetchCatBase64(); } catch (e) { /* ข้ามตัวที่โหลดรูปไม่ได้ */ }
    if (!img) continue;

    const lat = base.lat + (Math.random() - 0.5) * 0.04; // ±~2.2 กม.
    const lng = base.lng + (Math.random() - 0.5) * 0.04;

    await addDoc(collection(db, 'cats'), {
      ownerPhone: fakePhone(),
      name: NAMES[i % NAMES.length],
      color: COLORS[i % COLORS.length],
      breed: '',
      age: '',
      notes: NOTES[i % NOTES.length],
      imageBase64: img,
      status: 'lost',
      createdAt: serverTimestamp(),
      lostAt: serverTimestamp(),
      lostLat: lat,
      lostLng: lng,
      reward: REWARDS[Math.floor(Math.random() * REWARDS.length)],
      lostNote: NOTES[i % NOTES.length],
      demo: true,
    });
    created++;
  }
  return created;
}

// ล้างเฉพาะข้อมูลจำลอง (demo:true)
export async function clearDemoCats() {
  const snap = await getDocs(query(collection(db, 'cats'), where('demo', '==', true)));
  let n = 0;
  for (const d of snap.docs) { await deleteDoc(doc(db, 'cats', d.id)); n++; }
  return n;
}
