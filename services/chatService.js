/**
 * chatService.js
 * 
 * Helper สำหรับสร้าง/ดึง chat room ระหว่างผู้ใช้สองคน
 * ใช้กับ PostDetail และ SightingDetail
 */
import {
  collection, query, where, getDocs, addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * หรือสร้าง chat room ใหม่
 * @param {string} myPhone    — เบอร์โทรของเรา
 * @param {string} otherPhone — เบอร์โทรอีกฝ่าย
 * @param {object} meta       — { catName, myLabel, otherLabel }
 * @returns {string} chatId
 */
export async function getOrCreateChat(myPhone, otherPhone, meta = {}) {
  if (!myPhone || !otherPhone) throw new Error('ต้องระบุเบอร์โทร');
  if (myPhone === otherPhone) throw new Error('ไม่สามารถแชทกับตัวเองได้');

  // ค้นหา chat ที่มีอยู่แล้วระหว่างสองคนนี้
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', myPhone),
  );
  const snap = await getDocs(q);
  const existing = snap.docs.find(d => {
    const parts = d.data().participants || [];
    return parts.includes(otherPhone);
  });

  if (existing) return existing.id;

  // สร้างใหม่
  const ref = await addDoc(collection(db, 'chats'), {
    participants: [myPhone, otherPhone],
    catName: meta.catName || '',
    [`label_${myPhone}`]: meta.myLabel || myPhone,
    [`label_${otherPhone}`]: meta.otherLabel || otherPhone,
    lastMsg: '',
    lastAt: serverTimestamp(),
    [`unread_${myPhone}`]: 0,
    [`unread_${otherPhone}`]: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
