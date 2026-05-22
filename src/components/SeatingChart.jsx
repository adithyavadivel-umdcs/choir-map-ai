import { formatHeight } from '../utils/heightUtils';

const PART_COLORS = {
  Soprano: {
    card: 'bg-pink-50 border-pink-200',
    badge: 'bg-pink-100 text-pink-600',
    dot: 'bg-pink-400',
  },
  Alto: {
    card: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-600',
    dot: 'bg-orange-400',
  },
  Tenor: {
    card: 'bg-sky-50 border-sky-200',
    badge: 'bg-sky-100 text-sky-600',
    dot: 'bg-sky-400',
  },
  Bass: {
    card: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-600',
    dot: 'bg-emerald-400',
  },
};

const ROW_BG = ['bg-white', 'bg-slate-50', 'bg-slate-100'];

function cardScale(n) {
  if (n <= 5)  return { px: 12, py: 10, nameFz: 14, badgeFz: 12, notesFz: 12, dotSz: 6, badgePx: 6, badgePy: 2, gap: 8 };
  if (n <= 8)  return { px: 10, py: 8,  nameFz: 12, badgeFz: 11, notesFz: 11, dotSz: 5, badgePx: 5, badgePy: 1, gap: 6 };
  if (n <= 11) return { px: 7,  py: 5,  nameFz: 11, badgeFz: 10, notesFz: 10, dotSz: 4, badgePx: 4, badgePy: 1, gap: 4 };
  return         { px: 5,  py: 4,  nameFz: 10, badgeFz: 9,  notesFz: 9,  dotSz: 3, badgePx: 3, badgePy: 1, gap: 3 };
}

function SingerCard({ singer, singerCount, displayUnit }) {
  const colors = PART_COLORS[singer.voicePart] ?? {
    card: 'bg-slate-50 border-slate-200',
    badge: 'bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
  };
  const s = cardScale(singerCount);
  const heightStr = formatHeight(singer.heightCm, displayUnit);

  return (
    <div
      className={`border rounded-xl text-left flex-1 min-w-0 ${colors.card}`}
      style={{ padding: `${s.py}px ${s.px}px` }}
    >
      <div className="flex items-center mb-1" style={{ gap: 6 }}>
        <span
          className={`rounded-full flex-shrink-0 ${colors.dot}`}
          style={{ width: s.dotSz, height: s.dotSz }}
        />
        <span
          className="font-semibold text-slate-800 truncate"
          style={{ fontSize: s.nameFz }}
        >
          {singer.name}
        </span>
      </div>
      <div className="flex items-center flex-wrap mb-1" style={{ gap: 4 }}>
        <span
          className={`inline-block font-medium rounded-full ${colors.badge}`}
          style={{ fontSize: s.badgeFz, padding: `${s.badgePy}px ${s.badgePx}px` }}
        >
          {singer.voicePart}
        </span>
        {heightStr && (
          <span className="text-slate-400" style={{ fontSize: s.notesFz }}>
            {heightStr}
          </span>
        )}
      </div>
      <div className="flex" style={{ gap: 2 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`rounded-full ${i <= singer.vocalStrength ? 'bg-violet-400' : 'bg-slate-200'}`}
            style={{ width: s.dotSz, height: s.dotSz }}
          />
        ))}
      </div>
      {singer.notes && (
        <p
          className="text-slate-400 mt-1 truncate"
          style={{ fontSize: s.notesFz }}
          title={singer.notes}
        >
          {singer.notes}
        </p>
      )}
    </div>
  );
}

export default function SeatingChart({ chart, displayUnit }) {
  if (!chart || chart.length === 0) return null;

  const totalSingers = chart.reduce((sum, row) => sum + row.singers.length, 0);

  const partCounts = {};
  chart.forEach((row) => {
    row.singers.forEach((s) => {
      partCounts[s.voicePart] = (partCounts[s.voicePart] || 0) + 1;
    });
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Seating Chart</h2>
          <p className="text-xs text-slate-400 mt-0.5">{totalSingers} singers across {chart.length} rows</p>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(PART_COLORS).map(([part, colors]) =>
            partCounts[part] ? (
              <span
                key={part}
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors.card} ${colors.badge}`}
              >
                {part} ({partCounts[part]})
              </span>
            ) : null
          )}
        </div>
      </div>

      {/* Stage indicator */}
      <div className="mx-6 mt-4 rounded-lg bg-slate-800 text-white text-xs font-semibold tracking-widest text-center py-2 uppercase">
        Stage / Audience
      </div>

      {/* Rows */}
      <div className="p-6 space-y-4">
        {chart.map((row, idx) => (
          <div key={idx} className={`rounded-xl p-4 ${ROW_BG[idx]}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {row.label}
              </span>
              <span className="text-xs text-slate-400">— {row.singers.length} singers</span>
            </div>
            <div className="flex flex-nowrap" style={{ gap: cardScale(row.singers.length).gap }}>
              {row.singers.map((singer) => (
                <SingerCard
                  key={singer.id}
                  singer={singer}
                  singerCount={row.singers.length}
                  displayUnit={displayUnit}
                />
              ))}
              {row.singers.length === 0 && (
                <span className="text-xs text-slate-400 italic">Empty row</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="px-6 pb-4 text-xs text-slate-400 text-center">
        Vocal strength dots (violet) indicate volume level. Tall singers placed toward back rows.
      </div>
    </div>
  );
}
