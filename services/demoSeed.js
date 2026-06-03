// 🧪 services/demoSeed.js — สร้าง/ล้างข้อมูลแมวหายจำลอง สำหรับเดโม่
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentCoords } from './location';

const CENTER = { lat: 14.9799, lng: 102.0978 }; // นครราชสีมา (fallback)

const NAMES = [
  'มะลิ', 'ส้มจี๊ด', 'เหมียว', 'ดำดี', 'ขาวมณี', 'เจ้าด่าง', 'น้ำตาล', 'ครีม',
  'ตาล', 'โกโก้', 'นมเย็น', 'ฟ้าใส', 'ขนมปัง', 'เมฆ', 'ลูกชิ้น', 'ส้มโอ',
  'ทองคำ', 'มุก', 'ข้าวปุ้น', 'ไข่มุก', 'สี่ขา', 'พุดดิ้ง', 'โอวัลติน', 'แป้ง',
];
const COLORS = ['ส้ม', 'ขาว', 'ดำ', 'เทา', 'น้ำตาล', 'ลายเสือ', 'สามสี', 'ขาวดำ'];
const SEXES = ['ผู้', 'เมีย'];
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

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// สุ่มสี โดยให้ "ส้ม" ออกบ่อยขึ้น (~40%) ที่เหลือสุ่มปกติ
function randColor() {
  return Math.random() < 0.4 ? 'ส้ม' : rand(COLORS);
}

// สุ่มวันเกิดย้อนหลัง ~6 ปี → 'YYYY-MM-DD'
function randomBirth() {
  const ago = randInt(60, 6 * 365);
  const d = new Date(Date.now() - ago * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// สร้าง object หมุด "คนเจอแมว (อาจเป็นจร/หาย)"
function makeSighting(lat, lng, img) {
  return {
    finderPhone: fakePhone(),
    imageBase64: img,
    color: randColor(),
    confidence: 'maybe', // อาจเป็นจร/หาย → หมุดสีเหลือง
    matchedCatId: null,
    matchedCatName: null,
    matchedOwnerPhone: null,
    createdAt: serverTimestamp(),
    foundLat: lat,
    foundLng: lng,
    demo: true,
  };
}

// ดึงรูปแมวจริงจากเว็บแมวฟรี → base64
async function fetchCatBase64(size = 400) {
  const res = await fetch(`https://cataas.com/cat?width=${size}&height=${size}&t=${Math.random()}`);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// สร้างแมวหายจำลอง count ตัว กระจายรอบตำแหน่งคุณ + หมุดคนเจอ 2 จุด
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
      color: randColor(),
      sex: rand(SEXES),
      breed: '',
      birthDate: randomBirth(),
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

  // + หมุด "คนเจอแมว (อาจเป็นจร/หาย)" 2 จุด รอบตัวคุณ
  for (let i = 0; i < 2; i++) {
    let img = null;
    try { img = await fetchCatBase64(); } catch (e) { /* ข้าม */ }
    if (!img) continue;
    const lat = base.lat + (Math.random() - 0.5) * 0.04;
    const lng = base.lng + (Math.random() - 0.5) * 0.04;
    try { await addDoc(collection(db, 'sightings'), makeSighting(lat, lng, img)); } catch (e) { /* ข้าม */ }
  }

  return created;
}

// ---------------------------------------------------------------------------
// 🇹🇭 เจนแมวทั้งประเทศ — จังหวัดละ 2-3 ตัว, โคราช 10 ตัว + หมุดคนเจอ (อาจเป็นจร/หาย)
// ---------------------------------------------------------------------------

const KORAT = 'นครราชสีมา';

// พิกัดศูนย์กลางจังหวัด (โดยประมาณ) ครบ 77 จังหวัด
const PROVINCES = [
  // ภาคกลาง
  { name: 'กรุงเทพมหานคร', lat: 13.7563, lng: 100.5018 },
  { name: 'สมุทรปราการ', lat: 13.5991, lng: 100.5998 },
  { name: 'นนทบุรี', lat: 13.8591, lng: 100.5217 },
  { name: 'ปทุมธานี', lat: 14.0208, lng: 100.5250 },
  { name: 'พระนครศรีอยุธยา', lat: 14.3692, lng: 100.5877 },
  { name: 'อ่างทอง', lat: 14.5896, lng: 100.4550 },
  { name: 'ลพบุรี', lat: 14.7995, lng: 100.6534 },
  { name: 'สิงห์บุรี', lat: 14.8907, lng: 100.3967 },
  { name: 'ชัยนาท', lat: 15.1851, lng: 100.1251 },
  { name: 'สระบุรี', lat: 14.5289, lng: 100.9108 },
  { name: 'นครนายก', lat: 14.2069, lng: 101.2130 },
  { name: 'สมุทรสาคร', lat: 13.5475, lng: 100.2745 },
  { name: 'สมุทรสงคราม', lat: 13.4098, lng: 100.0023 },
  { name: 'นครปฐม', lat: 13.8199, lng: 100.0621 },
  { name: 'สุพรรณบุรี', lat: 14.4745, lng: 100.1177 },
  { name: 'กาญจนบุรี', lat: 14.0227, lng: 99.5328 },
  { name: 'ราชบุรี', lat: 13.5283, lng: 99.8134 },
  { name: 'เพชรบุรี', lat: 13.1119, lng: 99.9399 },
  { name: 'ประจวบคีรีขันธ์', lat: 11.8126, lng: 99.7957 },
  // ภาคตะวันออก
  { name: 'ชลบุรี', lat: 13.3611, lng: 100.9847 },
  { name: 'ระยอง', lat: 12.6814, lng: 101.2789 },
  { name: 'จันทบุรี', lat: 12.6113, lng: 102.1035 },
  { name: 'ตราด', lat: 12.2428, lng: 102.5177 },
  { name: 'ฉะเชิงเทรา', lat: 13.6904, lng: 101.0779 },
  { name: 'ปราจีนบุรี', lat: 14.0509, lng: 101.3700 },
  { name: 'สระแก้ว', lat: 13.8240, lng: 102.0645 },
  // ภาคอีสาน
  { name: KORAT, lat: 14.9799, lng: 102.0978 },
  { name: 'บุรีรัมย์', lat: 14.9930, lng: 103.1029 },
  { name: 'สุรินทร์', lat: 14.8820, lng: 103.4960 },
  { name: 'ศรีสะเกษ', lat: 15.1186, lng: 104.3220 },
  { name: 'อุบลราชธานี', lat: 15.2448, lng: 104.8473 },
  { name: 'ยโสธร', lat: 15.7921, lng: 104.1452 },
  { name: 'ชัยภูมิ', lat: 15.8068, lng: 102.0317 },
  { name: 'อำนาจเจริญ', lat: 15.8657, lng: 104.6259 },
  { name: 'หนองบัวลำภู', lat: 17.2046, lng: 102.4264 },
  { name: 'ขอนแก่น', lat: 16.4419, lng: 102.8360 },
  { name: 'อุดรธานี', lat: 17.4138, lng: 102.7870 },
  { name: 'เลย', lat: 17.4860, lng: 101.7223 },
  { name: 'หนองคาย', lat: 17.8783, lng: 102.7470 },
  { name: 'มหาสารคาม', lat: 16.1850, lng: 103.3029 },
  { name: 'ร้อยเอ็ด', lat: 16.0538, lng: 103.6520 },
  { name: 'กาฬสินธุ์', lat: 16.4315, lng: 103.5059 },
  { name: 'สกลนคร', lat: 17.1545, lng: 104.1348 },
  { name: 'นครพนม', lat: 17.4080, lng: 104.7780 },
  { name: 'มุกดาหาร', lat: 16.5420, lng: 104.7210 },
  { name: 'บึงกาฬ', lat: 18.3609, lng: 103.6466 },
  // ภาคเหนือ
  { name: 'เชียงใหม่', lat: 18.7883, lng: 98.9853 },
  { name: 'ลำพูน', lat: 18.5743, lng: 99.0087 },
  { name: 'ลำปาง', lat: 18.2888, lng: 99.4909 },
  { name: 'อุตรดิตถ์', lat: 17.6200, lng: 100.0993 },
  { name: 'แพร่', lat: 18.1445, lng: 100.1405 },
  { name: 'น่าน', lat: 18.7756, lng: 100.7730 },
  { name: 'พะเยา', lat: 19.2147, lng: 99.9018 },
  { name: 'เชียงราย', lat: 19.9105, lng: 99.8406 },
  { name: 'แม่ฮ่องสอน', lat: 19.3020, lng: 97.9654 },
  { name: 'นครสวรรค์', lat: 15.7030, lng: 100.1372 },
  { name: 'อุทัยธานี', lat: 15.3790, lng: 100.0246 },
  { name: 'กำแพงเพชร', lat: 16.4828, lng: 99.5226 },
  { name: 'ตาก', lat: 16.8839, lng: 99.1258 },
  { name: 'สุโขทัย', lat: 17.0078, lng: 99.8237 },
  { name: 'พิษณุโลก', lat: 16.8211, lng: 100.2659 },
  { name: 'พิจิตร', lat: 16.4429, lng: 100.3487 },
  { name: 'เพชรบูรณ์', lat: 16.4190, lng: 101.1591 },
  // ภาคใต้
  { name: 'นครศรีธรรมราช', lat: 8.4304, lng: 99.9631 },
  { name: 'กระบี่', lat: 8.0863, lng: 98.9063 },
  { name: 'พังงา', lat: 8.4510, lng: 98.5298 },
  { name: 'ภูเก็ต', lat: 7.8804, lng: 98.3923 },
  { name: 'สุราษฎร์ธานี', lat: 9.1382, lng: 99.3215 },
  { name: 'ระนอง', lat: 9.9529, lng: 98.6085 },
  { name: 'ชุมพร', lat: 10.4930, lng: 99.1800 },
  { name: 'สงขลา', lat: 7.1756, lng: 100.6142 },
  { name: 'สตูล', lat: 6.6238, lng: 100.0673 },
  { name: 'ตรัง', lat: 7.5645, lng: 99.6239 },
  { name: 'พัทลุง', lat: 7.6167, lng: 100.0742 },
  { name: 'ปัตตานี', lat: 6.8692, lng: 101.2550 },
  { name: 'ยะลา', lat: 6.5410, lng: 101.2800 },
  { name: 'นราธิวาส', lat: 6.4254, lng: 101.8253 },
];

// โหลดรูปแมวมาเป็น "พูล" จำนวนหนึ่ง แล้วหมุนเวียนใช้ (เร็ว + ไม่ยิงเน็ตเป็นร้อยครั้ง)
async function fetchCatPool(size = 14) {
  const tasks = Array.from({ length: size }, () => fetchCatBase64(320).catch(() => null));
  const results = await Promise.all(tasks);
  return results.filter(Boolean);
}

// สร้างแมวจำลองทั่วประเทศ — คืน { cats, found }
//  - cats  = โพสต์แมวหาย (หมุดแดง)
//  - found = หมุด "คนเจอแมว (อาจเป็นจร/หาย)" (หมุดเหลือง)
export async function seedCountryCats(ownerPhone) {
  const pool = await fetchCatPool(14);
  if (pool.length === 0) return { cats: 0, found: 0 }; // โหลดรูปไม่ได้เลย

  let imgIdx = 0;

  // 1) แมวหาย (จังหวัดละ 2-3, โคราช 10)
  const catJobs = [];
  for (const p of PROVINCES) {
    const count = p.name === KORAT ? 10 : randInt(2, 3);
    for (let i = 0; i < count; i++) {
      const img = pool[imgIdx % pool.length];
      imgIdx++;
      const lat = p.lat + (Math.random() - 0.5) * 0.06; // ±~3 กม. รอบตัวเมือง
      const lng = p.lng + (Math.random() - 0.5) * 0.06;
      catJobs.push({
        ownerPhone: fakePhone(),
        name: rand(NAMES),
        color: randColor(),
        sex: rand(SEXES),
        breed: '',
        birthDate: randomBirth(),
        age: '',
        notes: rand(NOTES),
        imageBase64: img,
        status: 'lost',
        createdAt: serverTimestamp(),
        lostAt: serverTimestamp(),
        lostLat: lat,
        lostLng: lng,
        reward: rand(REWARDS),
        lostNote: rand(NOTES),
        province: p.name,
        demo: true,
      });
    }
  }

  // 2) หมุดคนเจอแมว (อาจเป็นจร/หาย) — โคราช 3 จุด, จังหวัดอื่นสุ่ม ~ครึ่งหนึ่งจังหวัดละ 1 จุด
  const sightingJobs = [];
  for (const p of PROVINCES) {
    const sCount = p.name === KORAT ? 3 : (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < sCount; i++) {
      const img = pool[imgIdx % pool.length];
      imgIdx++;
      const lat = p.lat + (Math.random() - 0.5) * 0.06;
      const lng = p.lng + (Math.random() - 0.5) * 0.06;
      sightingJobs.push(makeSighting(lat, lng, img));
    }
  }

  // เขียนทีละก้อน (chunk) พร้อมกันทีละ 12 ให้เร็วขึ้น แต่ไม่ถล่ม Firestore
  const CHUNK = 12;
  let cats = 0;
  for (let i = 0; i < catJobs.length; i += CHUNK) {
    const slice = catJobs.slice(i, i + CHUNK);
    await Promise.all(slice.map((d) => addDoc(collection(db, 'cats'), d)));
    cats += slice.length;
  }
  let found = 0;
  for (let i = 0; i < sightingJobs.length; i += CHUNK) {
    const slice = sightingJobs.slice(i, i + CHUNK);
    await Promise.all(slice.map((d) => addDoc(collection(db, 'sightings'), d)));
    found += slice.length;
  }

  return { cats, found };
}

// ล้างเฉพาะข้อมูลจำลอง (demo:true) ทั้งแมวหาย + หมุดคนเจอ — คืนจำนวนรวมที่ลบ
export async function clearDemoCats() {
  let n = 0;
  const catSnap = await getDocs(query(collection(db, 'cats'), where('demo', '==', true)));
  for (const d of catSnap.docs) { await deleteDoc(doc(db, 'cats', d.id)); n++; }
  const sightSnap = await getDocs(query(collection(db, 'sightings'), where('demo', '==', true)));
  for (const d of sightSnap.docs) { await deleteDoc(doc(db, 'sightings', d.id)); n++; }
  return n;
}