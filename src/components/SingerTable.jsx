import { useState, useEffect } from 'react';
import { formatHeight } from '../utils/heightUtils';

const PART_COLORS = {
  Soprano: 'bg-pink-100 text-pink-700',
  Alto:    'bg-orange-100 text-orange-700',
  Tenor:   'bg-sky-100 text-sky-700',
  Bass:    'bg-emerald-100 text-emerald-700',
};

const PART_DOT = {
  Soprano: 'bg-pink-400',
  Alto:    'bg-orange-400',
  Tenor:   'bg-sky-400',
  Bass:    'bg-emerald-400',
};

const VOICE_PARTS = ['Soprano', 'Alto', 'Tenor', 'Bass'];

const PREVIEW_LIMIT = 7;

function StrengthDots({ value, small = false }) {
  const sz = small ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5';
  return (
    <div className={`flex ${small ? 'gap-0.5' : 'gap-1'}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`${sz} rounded-full ${i <= value ? 'bg-violet-500' : 'bg-slate-200'}`}
        />
      ))}
    </div>
  );
}

function RosterModal({ singers, onRemove, onClose, displayUnit }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-800">
            Full Roster{' '}
            <span className="text-sm font-normal text-slate-400">({singers.length} singers)</span>
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-lg leading-none"
            aria-label="Close roster"
          >
            ✕
          </button>
        </div>

        {/* Scrollable table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 text-slate-500 text-left">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Part</th>
                <th className="px-4 py-3 font-medium">Strength</th>
                <th className="px-4 py-3 font-medium">Height</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium sr-only">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {singers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${PART_COLORS[s.voicePart] ?? 'bg-slate-100 text-slate-600'}`}>
                      {s.voicePart}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StrengthDots value={s.vocalStrength} /></td>
                  <td className="px-4 py-3 text-slate-500">{formatHeight(s.heightCm, displayUnit) ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-[180px] truncate">{s.notes || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onRemove(s.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors text-xs font-medium"
                      title="Remove singer"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function SingerTable({ singers, onRemove, displayUnit }) {
  const [modalOpen, setModalOpen] = useState(false);

  if (singers.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center text-slate-400 text-sm">
        No singers added yet.
      </div>
    );
  }

  const partCounts = Object.fromEntries(
    VOICE_PARTS.map((p) => [p, singers.filter((s) => s.voicePart === p).length])
  );
  const preview  = singers.slice(0, PREVIEW_LIMIT);
  const overflow = singers.length - PREVIEW_LIMIT;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Card header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            Singers <span className="font-normal text-slate-400">({singers.length})</span>
          </h2>
          <button
            onClick={() => setModalOpen(true)}
            className="text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
          >
            View Full Roster →
          </button>
        </div>

        {/* Part-count summary */}
        <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
          {VOICE_PARTS.map((part) => (
            <div key={part} className="py-2.5 text-center">
              <div className="text-base font-semibold text-slate-700">{partCounts[part]}</div>
              <div className="text-xs text-slate-400">{part}</div>
            </div>
          ))}
        </div>

        {/* Singer preview list */}
        <div className="divide-y divide-slate-100">
          {preview.map((s) => (
            <div key={s.id} className="px-4 py-2 flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PART_DOT[s.voicePart] ?? 'bg-slate-400'}`} />
              <span className="text-sm text-slate-800 truncate flex-1 min-w-0">{s.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${PART_COLORS[s.voicePart] ?? 'bg-slate-100 text-slate-600'}`}>
                {s.voicePart}
              </span>
              <StrengthDots value={s.vocalStrength} small />
            </div>
          ))}
          {overflow > 0 && (
            <button
              onClick={() => setModalOpen(true)}
              className="w-full px-4 py-2.5 text-xs text-slate-400 hover:text-violet-600 hover:bg-slate-50 transition-colors text-left"
            >
              + {overflow} more singer{overflow !== 1 ? 's' : ''} — view all
            </button>
          )}
        </div>
      </div>

      {modalOpen && (
        <RosterModal
          singers={singers}
          onRemove={onRemove}
          onClose={() => setModalOpen(false)}
          displayUnit={displayUnit}
        />
      )}
    </>
  );
}
