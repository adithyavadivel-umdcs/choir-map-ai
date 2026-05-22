import { useState } from 'react';

const VOICE_PARTS = ['Soprano', 'Alto', 'Tenor', 'Bass'];

const emptyForm = {
  name: '',
  voicePart: 'Soprano',
  vocalStrength: 3,
  height: '',
  notes: '',
};

export default function SingerForm({ onAdd }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setError('');
    onAdd({ ...form, id: crypto.randomUUID(), vocalStrength: Number(form.vocalStrength), height: form.height ? Number(form.height) : '' });
    setForm(emptyForm);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
    >
      <h2 className="text-lg font-semibold text-slate-800">Add Singer</h2>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Jane Smith"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
          />
        </div>

        {/* Voice Part */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Voice Part</label>
          <select
            name="voicePart"
            value={form.voicePart}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
          >
            {VOICE_PARTS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Vocal Strength */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Vocal Strength — <span className="text-violet-600 font-semibold">{form.vocalStrength}</span>
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

        {/* Height */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Height <span className="text-slate-400 font-normal">(cm, optional)</span>
          </label>
          <input
            type="number"
            name="height"
            value={form.height}
            onChange={handleChange}
            placeholder="e.g. 170"
            min={100}
            max={220}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="e.g. soloist, new member…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
      >
        + Add Singer
      </button>
    </form>
  );
}
