const PART_COLORS = {
  Soprano: 'bg-pink-100 text-pink-700',
  Alto: 'bg-orange-100 text-orange-700',
  Tenor: 'bg-sky-100 text-sky-700',
  Bass: 'bg-emerald-100 text-emerald-700',
};

function StrengthDots({ value }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-2.5 h-2.5 rounded-full ${
            i <= value ? 'bg-violet-500' : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

export default function SingerTable({ singers, onRemove }) {
  if (singers.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-400 text-sm">
        No singers added yet. Use the form above to add choir members.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          Singers{' '}
          <span className="text-sm font-normal text-slate-400">({singers.length})</span>
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
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
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                      PART_COLORS[s.voicePart] ?? 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {s.voicePart}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StrengthDots value={s.vocalStrength} />
                </td>
                <td className="px-4 py-3 text-slate-500">{s.height ? `${s.height} cm` : '—'}</td>
                <td className="px-4 py-3 text-slate-400 max-w-[180px] truncate">
                  {s.notes || '—'}
                </td>
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
  );
}
