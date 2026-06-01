# 🐱 PetFinder Thailand — คู่มือติดตั้ง (Prototype v1.0)

แอปตามหาแมวหาย + ระบบจำลองการรู้จำใบหน้าแมว (สำหรับ hackathon)

---

## 📂 ไฟล์ในชุดนี้ (วางทับของเดิมในโปรเจ็ก)

```
petfinder-th/
├── App.js                      ← แทนที่ของเดิม
├── theme.js                    ← ไฟล์ใหม่ (สี/ดีไซน์ส่วนกลาง)
├── components/
│   ├── GradientHeader.js       ← ไฟล์ใหม่
│   ├── PhoneEntry.js           ← แทนที่
│   ├── MainTabs.js             ← แทนที่ (เพิ่มแท็บแผนที่)
│   └── AddCatForm.js           ← แทนที่ (เพิ่มเก็บตำแหน่ง)
├── screens/
│   ├── MyCatsScreen.js         ← แทนที่
│   ├── SearchScreen.js         ← แทนที่ (AI จำลอง)
│   ├── MapScreen.js            ← ไฟล์ใหม่
│   └── ProfileScreen.js        ← แทนที่
└── services/
    └── aiMatch.js              ← แทนที่ (จำลอง ไม่เรียก HuggingFace แล้ว)
```

> ⚠️ **ห้ามแตะ** `firebase.js` — เก็บของเดิมไว้ (มี config ของคุณอยู่)
> ไฟล์ `index.js`, `app.json`, `package.json` ก็เก็บของเดิม

---

## 📦 ขั้นที่ 1: ลงไลบรารีเพิ่ม 3 ตัว

เปิด terminal ในโฟลเดอร์โปรเจ็ก แล้วรัน:

```bash
npx expo install react-native-maps expo-location expo-linear-gradient
```

(ที่เหลือใช้ของเดิมที่ลงไว้แล้ว — navigation, firebase, image-picker ฯลฯ)

---

## ▶️ ขั้นที่ 2: รันแอป

```bash
npx expo start -c
```

(`-c` = ล้าง cache กันพัง) แล้วสแกน QR ด้วยแอป **Expo Go**

---

## 🗺️ เรื่องแผนที่ (อ่านสักนิด)

- **iPhone (Expo Go)** → ใช้ได้เลย ไม่ต้องตั้งอะไร (ใช้ Apple Maps)
- **Android (Expo Go)** → ถ้าแผนที่ขึ้นจอขาว ต้องใส่ Google Maps API key ใน `app.json`:

```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": { "apiKey": "ใส่_KEY_ของคุณ" }
      }
    }
  }
}
```

> 💡 **ตอน demo แนะนำใช้ iPhone** จะง่ายสุด ไม่ต้องขอ key
> ถ้าไม่มี iPhone และไม่อยากตั้ง key → แค่ลบแท็บ Map ออกจาก `MainTabs.js` ก็ได้ (ลบบรรทัด `<Tab.Screen name="Map" .../>`)

---

## 🎬 เตรียมก่อน demo (สำคัญ!)

ระบบ match จะดูดี **ถ้ามีแมวในฐานข้อมูล** → ลงทะเบียนแมวเด่น ๆ ไว้ก่อน:

1. ลงทะเบียนแมว **สีต่างกัน** 4-5 ตัว (ส้ม/ดำ/ขาว/เทา) แต่ละตัวคนละรูป
2. แจ้งหาย 1-2 ตัว (ให้มีของโชว์ในหน้า "ตามหา")
3. ตอน demo: กด "เจอแมวจร" → อัปรูปแมว**สีส้ม** → เลือกสีส้ม
   → ระบบจะจับคู่แมวสีส้มที่ลงทะเบียนไว้ขึ้นอันดับ 1 (~80-95%)

---

## 🧠 เรื่อง AI (พูดในพิชได้เลย)

ไฟล์ `services/aiMatch.js` ตอนนี้เป็น **ระบบจำลอง** — เร็ว ไม่พัง เหมาะกับ demo

ในพิชพูดแบบนี้:
> "v1 เป็น prototype ที่จำลองการจับคู่ — สถาปัตยกรรมจริง (v2) จะใช้
> YOLOv5Face + EfficientNetV2S + Triplet Loss + FAISS ตามงานวิจัย
> ที่ทำความแม่นยำได้ 89% โดยสลับแค่ไฟล์เดียวคือ aiMatch.js"

→ ตรงกับเกณฑ์ "เข้าใจข้อจำกัดของ solution" = ได้คะแนน Q&A

---

จบ! มีปัญหาตรงไหนหรือ error อะไร ส่งมาได้เลย 🐾
