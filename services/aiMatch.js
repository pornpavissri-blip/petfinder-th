import { HF_TOKEN } from '../aiConfig';

const MODEL = 'openai/clip-vit-base-patch32';
const API_URL = `https://api-inference.huggingface.co/models/${MODEL}`;

export async function getCatEmbedding(imageUri) {
  console.log('🚀 Calling HF API:', API_URL);
  console.log('🔑 Token preview:', HF_TOKEN?.substring(0, 8) + '...');

  if (!HF_TOKEN || HF_TOKEN.startsWith('hf_xxxx')) {
    throw new Error('HF_TOKEN ไม่ได้ตั้งค่าใน aiConfig.js');
  }

  // อ่านไฟล์รูปเป็น Blob
  console.log('📥 Reading image from:', imageUri);
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

    console.log('📡 HF response status:', response.status);

    const responseText = await response.text();
    console.log('📄 Response preview:', responseText.substring(0, 200));

    if (!response.ok) {
      throw new Error(`HF ${response.status}: ${responseText.substring(0, 150)}`);
    }

    const data = JSON.parse(responseText);

    if (data.error && data.estimated_time) {
      console.log(`⏳ Model loading, wait ${data.estimated_time}s...`);
      await new Promise(r => setTimeout(r, (data.estimated_time + 2) * 1000));
      return getCatEmbedding(imageUri);
    }

    if (data.error) throw new Error(`HF: ${data.error}`);

    return data;
  } catch (err) {
    console.log('❌ Full error:', err.message);
    throw err;
  }
}

export function cosineSimilarity(vec1, vec2) {
  if (!Array.isArray(vec1) || !Array.isArray(vec2)) return 0;
  if (vec1.length !== vec2.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    normA += vec1[i] * vec1[i];
    normB += vec2[i] * vec2[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function findTopMatches(queryEmbedding, cats, n = 5) {
  const scored = cats
    .filter(cat => cat.imageEmbedding && cat.imageEmbedding.length > 0)
    .map(cat => ({
      ...cat,
      similarity: cosineSimilarity(queryEmbedding, cat.imageEmbedding),
    }))
    .sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, n);
}