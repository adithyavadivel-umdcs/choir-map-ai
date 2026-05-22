/**
 * Rule-based seating chart generator.
 *
 * Rules:
 * 1. Group singers by voice part.
 * 2. Distribute voice parts evenly across 3 rows.
 * 3. Within each row/section, interleave strong and weak singers so
 *    loud singers are never bunched together.
 * 4. Taller singers go to back rows, shorter to front.
 */

const VOICE_PART_ORDER = ['Bass', 'Tenor', 'Alto', 'Soprano'];
const ROW_LABELS = ['Row 1 (Front)', 'Row 2 (Middle)', 'Row 3 (Back)'];
const NUM_ROWS = 3;

/**
 * Interleave an array so high and low values alternate.
 * Sorts descending by strength, then zips first-half and second-half.
 */
function interleaveByStrength(singers) {
  const sorted = [...singers].sort((a, b) => b.vocalStrength - a.vocalStrength);
  const half = Math.ceil(sorted.length / 2);
  const strong = sorted.slice(0, half);
  const weak = sorted.slice(half).reverse();
  const result = [];
  for (let i = 0; i < strong.length; i++) {
    result.push(strong[i]);
    if (weak[i]) result.push(weak[i]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Incremental placement — mirrors the full algorithm's scoring priorities
// ---------------------------------------------------------------------------

// Weights reflect the algorithm's rule priorities (higher = more important).
const W = {
  VOICE_PART:  4,  // keep voice parts distributed across rows
  ROW_BALANCE: 3,  // keep row sizes roughly equal
  HEIGHT:      3,  // shorter singers toward front, taller toward back
  NEIGHBOR:    2,  // reward strength contrast with immediate neighbours
  CLUSTER:     2,  // penalise consecutive same-strength-tier pairs
};

/**
 * Score inserting newSinger at insertIdx inside trialSingers (the target row
 * as it would look after insertion). Higher is better.
 */
function scoreInsertion(newSinger, rowIdx, insertIdx, trialSingers, currentChart) {
  const numRows = currentChart.length;
  const totalAfter = currentChart.reduce((sum, r) => sum + r.singers.length, 0) + 1;
  const idealSize = totalAfter / numRows;

  // 1. Row size balance — penalise rows that are already over-populated.
  const sizePenalty = Math.max(0, trialSingers.length - idealSize) * W.ROW_BALANCE;

  // 2. Voice part balance — penalise rows heavy with the singer's own part.
  const samePartCount = trialSingers.filter(
    (s) => s.id !== newSinger.id && s.voicePart === newSinger.voicePart,
  ).length;
  const partPenalty = samePartCount * W.VOICE_PART;

  // 3. Height-to-row fit — row 0 expects shorter singers, last row expects taller.
  let heightBonus = 0;
  if (newSinger.heightCm) {
    const allHeights = currentChart
      .flatMap((r) => r.singers)
      .map((s) => s.heightCm)
      .filter(Boolean);
    if (allHeights.length > 0) {
      const minH = Math.min(...allHeights);
      const maxH = Math.max(...allHeights);
      const range = maxH - minH || 1;
      const normalized    = (newSinger.heightCm - minH) / range;   // 0=shortest, 1=tallest
      const expectedTier  = rowIdx / Math.max(1, numRows - 1);     // 0=front,   1=back
      heightBonus = (1 - Math.abs(normalized - expectedTier)) * W.HEIGHT;
    }
  }

  // 4. Neighbour strength contrast — reward placing next to a singer of
  //    opposite strength tendency (mirrors interleaveByStrength).
  const left  = insertIdx > 0                       ? trialSingers[insertIdx - 1] : null;
  const right = insertIdx < trialSingers.length - 1 ? trialSingers[insertIdx + 1] : null;
  let neighborBonus = 0;
  if (left)  neighborBonus += Math.abs(left.vocalStrength  - newSinger.vocalStrength) * W.NEIGHBOR;
  if (right) neighborBonus += Math.abs(right.vocalStrength - newSinger.vocalStrength) * W.NEIGHBOR;

  // 5. Cluster penalty — penalise consecutive pairs that are both strong (≥4)
  //    or both weak (≤2) anywhere in the row after insertion.
  let clusterPenalty = 0;
  for (let i = 0; i < trialSingers.length - 1; i++) {
    const a = trialSingers[i].vocalStrength;
    const b = trialSingers[i + 1].vocalStrength;
    if (a >= 4 && b >= 4) clusterPenalty += W.CLUSTER;
    if (a <= 2 && b <= 2) clusterPenalty += W.CLUSTER * 0.5;
  }

  return heightBonus + neighborBonus - sizePenalty - partPenalty - clusterPenalty;
}

/**
 * Find the best row and insertion index for newSinger in the existing chart.
 * Evaluates every (row, index) candidate and returns a new chart with the
 * singer inserted — all other singers stay in place.
 *
 * Returns null if currentChart is empty/missing.
 */
export function findBestPlacementForSinger(newSinger, currentChart) {
  if (!currentChart || currentChart.length === 0) return null;

  let bestScore = -Infinity;
  let bestRow   = 0;
  let bestIdx   = 0;

  for (let rowIdx = 0; rowIdx < currentChart.length; rowIdx++) {
    const row = currentChart[rowIdx];
    for (let insertIdx = 0; insertIdx <= row.singers.length; insertIdx++) {
      const trialSingers = [
        ...row.singers.slice(0, insertIdx),
        newSinger,
        ...row.singers.slice(insertIdx),
      ];
      const score = scoreInsertion(newSinger, rowIdx, insertIdx, trialSingers, currentChart);
      if (score > bestScore) {
        bestScore = score;
        bestRow   = rowIdx;
        bestIdx   = insertIdx;
      }
    }
  }

  return currentChart.map((row, i) => {
    if (i !== bestRow) return row;
    return {
      ...row,
      singers: [
        ...row.singers.slice(0, bestIdx),
        newSinger,
        ...row.singers.slice(bestIdx),
      ],
    };
  });
}

export function generateSeatingChart(singers) {
  if (singers.length === 0) return [];

  // Group by voice part in preferred order
  const byPart = {};
  for (const part of VOICE_PART_ORDER) {
    byPart[part] = singers.filter((s) => s.voicePart === part);
  }

  // For each part, sort taller singers toward the back (higher row index)
  for (const part of VOICE_PART_ORDER) {
    byPart[part].sort((a, b) => (Number(a.heightCm) || 0) - (Number(b.heightCm) || 0));
  }

  // Build rows: assign voice parts to rows in a round-robin so each row has
  // a mix of parts. Parts are ordered BASS → TENOR → ALTO → SOPRANO so
  // traditionally low voices sit on one side and high on the other.
  // Strategy: spread each part's singers across rows proportionally.
  const rows = [[], [], []];

  for (const part of VOICE_PART_ORDER) {
    const partSingers = [...byPart[part]];
    if (partSingers.length === 0) continue;

    // Interleave by vocal strength within this part
    const interleaved = interleaveByStrength(partSingers);

    // Distribute round-robin across rows
    interleaved.forEach((singer, idx) => {
      rows[idx % NUM_ROWS].push(singer);
    });
  }

  // Within each row, do a final interleave pass by vocal strength
  // to prevent all strong singers clustering at the front
  const processedRows = rows.map((row) => interleaveByStrength(row));

  return processedRows.map((singers, i) => ({
    label: ROW_LABELS[i],
    singers,
  }));
}
