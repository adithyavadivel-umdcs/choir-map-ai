import { useState, useEffect } from 'react';
import { feetInchesToCm, cmToFeetInches } from '../utils/heightUtils';

const VOICE_PARTS = ['Soprano', 'Alto', 'Tenor', 'Bass'];

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent';

export default function EditSingerModal({ singer, onSave, onClose }) {
  const [form, setForm] = useState({
    name: singer.name,
    voicePart: singer.voicePart,
    vocalStrength: singer.vocalStrength,
    heightCm: singer.heightCm ? String(singer.heightCm) : '',
    notes: singer.notes || '',
  });
  const [inputUnit, setInputUnit] = useState('cm');
  const [ftIn, setFtIn] = useState(() => {
    if (singer.heightCm) {
      const { feet, inches } = cmToFeetInches(singer.heightCm);
      return { feet: String(feet), inches: String(inches) };
    }
    return { feet: '', inches: '' };
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleFtInChange(e) {
    const { name, value } = e.target;
    setFtIn((prev) => ({ ...prev, [name]: value }));
  }

  function switchUnit(next) {
    if (next === inputUnit) return;
    if (next === 'ftin' && form.heightCm) {
      const { feet, inches } = cmToFeetInches(Number(form.heightCm));
      setFtIn({ feet: String(feet), inches: String(inches) });
    } else if (next === 'cm' && (ftIn.feet || ftIn.inches)) {
      const cm = feetInchesToCm(ftIn.feet, ftIn.inches);
      setForm((prev) => ({ ...prev, heightCm: cm > 0 ? String(cm) : '' }));
    }
    setInputUnit(next);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    const heightCm =
      inputUnit === 'cm'
        ? form.heightCm ? Number(form.heightCm) : ''
        : ftIn.feet || ftIn.inches ? feetInchesToCm(ftIn.feet, ftIn.inches) : '';

    onSave({
      ...singer,
      name: form.name.trim(),
      voicePart: form.voicePart,
      vocalStrength: Number(form.vocalStrength),
      heightCm,
      notes: form.notes,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-800">Edit Singer</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Voice Part</label>
              <select
                name="voicePart"
                value={form.voicePart}
                onChange={handleChange}
                className={`${INPUT_CLASS} bg-white`}
              >
                {VOICE_PARTS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Vocal Strength —{' '}
                <span className="text-violet-600 font-semibold">{form.vocalStrength}</span>
              </label>
              <input
                type="range"
                name="vocalStrength"
                min={1}
                max={5}
                value={form.vocalStrength}
                onChange={handleChange}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span>Soft (1)</span>
                <span>Loud (5)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-slate-700">
                  Height <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="flex rounded-md overflow-hidden border border-slate-200 text-xs">
                  {[['cm', 'cm'], ['ftin', 'ft/in']].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => switchUnit(val)}
                      className={`px-2 py-0.5 font-medium transition-colors ${
                        inputUnit === val
                          ? 'bg-violet-600 text-white'
                          : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {inputUnit === 'cm' ? (
                <input
                  type="number"
                  name="heightCm"
                  value={form.heightCm}
                  onChange={handleChange}
                  placeholder="e.g. 170"
                  min={100}
                  max={250}
                  className={INPUT_CLASS}
                />
              ) : (
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="feet"
                    value={ftIn.feet}
                    onChange={handleFtInChange}
                    placeholder="ft"
                    min={3}
                    max={7}
                    className={`${INPUT_CLASS} w-1/2`}
                  />
                  <input
                    type="number"
                    name="inches"
                    value={ftIn.inches}
                    onChange={handleFtInChange}
                    placeholder="in"
                    min={0}
                    max={11}
                    className={`${INPUT_CLASS} w-1/2`}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="e.g. soloist, new member…"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
