// 🧠 services/aiMatch.js
// ----------------------------------------------------------------------------
// PROTOTYPE NOTE:
// This is a SIMULATED matching engine for the hackathon prototype/demo.
// It does NOT call any external AI — so the demo is fast and never fails.
//
// Roadmap (v2): replace findMatches() with the trained model from the
// research paper (YOLOv5Face + EfficientNetV2S + Triplet Loss + FAISS, ~89%
// Top-5 accuracy). The rest of the app (UI, data, flow) stays the same —
// only this one file gets swapped.
// ----------------------------------------------------------------------------

// Simulate a realistic "thinking" delay so the UI feels like real processing.
function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// Deterministic-ish pseudo score from a string (keeps the same cat stable-ish)
function seedFromId(id = '') {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000;
  return h / 1000; // 0..1
}

/**
 * Simulated cat-face match.
 * @param {string} foundColor  - color the finder selected for the stray
 * @param {Array}  candidates  - registered cats to match against
 * @returns {Array} top 3 cats, each with a `similarity` (0..1)
 */
export async function findMatches(foundColor, candidates = []) {
  await delay(1400); // feel of real inference

  const scored = candidates.map((cat) => {
    const seed = seedFromId(cat.id);
    let score;
    if (cat.color && foundColor && cat.color === foundColor) {
      // same color → high, believable range 0.74 - 0.96
      score = 0.74 + seed * 0.22;
    } else {
      // different color → low range 0.22 - 0.46
      score = 0.22 + seed * 0.24;
    }
    return { ...cat, similarity: Math.min(0.98, score) };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, 3);
}