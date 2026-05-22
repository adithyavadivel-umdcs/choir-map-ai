export function feetInchesToCm(feet, inches) {
  const totalInches = (Number(feet) || 0) * 12 + (Number(inches) || 0);
  return Math.round(totalInches * 2.54);
}

export function cmToFeetInches(cm) {
  const totalInches = Math.round(Number(cm) / 2.54);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

// Returns a formatted string, or null if no height provided.
export function formatHeight(cm, unit) {
  if (!cm) return null;
  if (unit === 'ftin') {
    const { feet, inches } = cmToFeetInches(cm);
    return `${feet}'${inches}"`;
  }
  return `${cm} cm`;
}
