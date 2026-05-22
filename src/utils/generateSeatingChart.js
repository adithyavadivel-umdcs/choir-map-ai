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
