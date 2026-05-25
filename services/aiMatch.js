import { HF_TOKEN } from '../aiConfig';

const MODEL = 'microsoft/resnet-50';
const API_URL = `https://router.huggingface.co/hf-inference/models/${MODEL}`;

export async function getCatEmbedding(imageUri) {
  console.log('🚀 Calling HF:', API_URL);
  console.log('🔑 Token:', HF_TOKEN?.substring(0, 8) + '...');

  if (!HF_TOKEN || HF_TOKEN.startsWith('hf_xxxx')) {
    throw new Error('HF_TOKEN ไม่ได้ตั้งค่า');
  }

  console.log('📥 Reading image:', imageUri);
  const fileResponse = await fetch(imageUri);
  const blob = await fileResponse.blob();
  console.log('📦 Blob size:', blob.size);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'image/jpeg',
      },
      body: blob,
    });

    console.log('📡 Status:', response.status);
    const responseText = await response.text();
    console.log('📄 Preview:', responseText.substring(0, 200));

    if (response.status === 503) {
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.estimated_time) {
          console.log(`⏳ Wait ${errorData.estimated_time}s...`);
          await new Promise(r => setTimeout(r, (errorData.estimated_time + 2) * 1000));
          return getCatEmbedding(imageUri);
        }
      } catch (e) {}
    }

    if (!response.ok) {
      throw new Error(`HF ${response.status}: ${responseText.substring(0, 200)}`);
    }

    const data = JSON.parse(responseText);
    console.log('✅ Got', data.length, 'labels:', data.slice(0, 2).map(d => d.label));
    return data;
  } catch (err) {
    console.log('❌ Error:', err.message);
    throw err;
  }
}

// คำนวณความเหมือนระหว่าง 2 รายการ (รองรับทั้ง vector ตัวเลข + label array)
export function cosineSimilarity(labels1, labels2) {
  if (!Array.isArray(labels1) || !Array.isArray(labels2)) return 0;
  if (labels1.length === 0 || labels2.length === 0) return 0;

  // ถ้าเป็น vector ตัวเลข (กรณีเก่า)
  if (typeof labels1[0] === 'number') {
    if (labels1.length !== labels2.length) return 0;
    let d = 0, a = 0, b = 0;
    for (let i = 0; i < labels1.length; i++) {
      d += labels1[i] * labels2[i];
      a += labels1[i] * labels1[i];
      b += labels2[i] * labels2[i];
    }
    return d / (Math.sqrt(a) * Math.sqrt(b));
  }

  // กรณี label array {label, score}
  const dict1 = {};
  const dict2 = {};
  labels1.forEach(l => { if (l.label) dict1[l.label] = l.score; });
  labels2.forEach(l => { if (l.label) dict2[l.label] = l.score; });

  const allLabels = new Set([...Object.keys(dict1), ...Object.keys(dict2)]);
  const vec1 = [], vec2 = [];
  allLabels.forEach(label => {
    vec1.push(dict1[label] || 0);
    vec2.push(dict2[label] || 0);
  });

  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < vec1.length; i++) {
    dot += vec1[i] * vec2[i];
    na += vec1[i] * vec1[i];
    nb += vec2[i] * vec2[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// หา Top N matches + ใช้สีเป็นตัวคูณช่วยแยกแมว
export function findTopMatches(queryEmbedding, cats, queryColor = null, n = 5) {
  const scored = cats
    .filter(cat => cat.imageEmbedding && cat.imageEmbedding.length > 0)
    .map(cat => {
      let similarity = cosineSimilarity(queryEmbedding, cat.imageEmbedding);

      if (queryColor && cat.color) {
        const sameColor = colorGroupMatch(queryColor, cat.color);
        if (sameColor) {
          similarity = Math.min(similarity * 1.2, 1.0); // boost สี match
        } else {
          similarity *= 0.4; // penalty สีต่าง
        }
      }

      return { ...cat, similarity };
    })
    .sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, n);
}

// helper: เปรียบสี โดยจัดกลุ่มสี
function colorGroupMatch(c1, c2) {
  const groups = [
    ['ส้ม', 'เหลือง', 'น้ำตาล', 'orange', 'yellow', 'brown'],
    ['เทา', 'ดำ', 'gray', 'grey', 'black'],
    ['ขาว', 'white'],
    ['สามสี', 'calico'],
    ['ลาย', 'tabby'],
  ];
  const findGroup = (color) => {
    const lower = color.toLowerCase();
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].some(w => lower.includes(w))) return i;
    }
    return -1;
  };
  const g1 = findGroup(c1);
  const g2 = findGroup(c2);
  return g1 !== -1 && g1 === g2;
}