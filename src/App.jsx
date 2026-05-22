import { useState } from 'react';
import SingerForm from './components/SingerForm';
import SingerTable from './components/SingerTable';
import SeatingChart from './components/SeatingChart';
import { generateSeatingChart } from './utils/generateSeatingChart';

const SAMPLE_SINGERS = [
  { id: '1', name: 'Alice Monroe',   voicePart: 'Soprano', vocalStrength: 5, height: 162, notes: 'Section lead' },
  { id: '2', name: 'Beth Carter',    voicePart: 'Soprano', vocalStrength: 3, height: 158, notes: '' },
  { id: '3', name: 'Clara Singh',    voicePart: 'Soprano', vocalStrength: 4, height: 165, notes: 'Soloist' },
  { id: '4', name: 'Diana Lopez',    voicePart: 'Soprano', vocalStrength: 2, height: 155, notes: '' },
  { id: '5', name: 'Emma Johansson', voicePart: 'Alto',    vocalStrength: 4, height: 170, notes: '' },
  { id: '6', name: 'Fiona Walsh',    voicePart: 'Alto',    vocalStrength: 5, height: 168, notes: 'Section lead' },
  { id: '7', name: 'Grace Kim',      voicePart: 'Alto',    vocalStrength: 2, height: 160, notes: 'New member' },
  { id: '8', name: 'Hannah Brown',   voicePart: 'Alto',    vocalStrength: 3, height: 163, notes: '' },
  { id: '9', name: 'Ivan Torres',    voicePart: 'Tenor',   vocalStrength: 5, height: 178, notes: 'Soloist' },
  { id: '10', name: 'James Patel',   voicePart: 'Tenor',   vocalStrength: 3, height: 175, notes: '' },
  { id: '11', name: 'Kyle Nguyen',   voicePart: 'Tenor',   vocalStrength: 2, height: 172, notes: '' },
  { id: '12', name: 'Leo Fischer',   voicePart: 'Tenor',   vocalStrength: 4, height: 180, notes: '' },
  { id: '13', name: 'Marco Ricci',   voicePart: 'Bass',    vocalStrength: 5, height: 185, notes: 'Section lead' },
  { id: '14', name: 'Nathan Black',  voicePart: 'Bass',    vocalStrength: 4, height: 183, notes: '' },
  { id: '15', name: 'Owen Clarke',   voicePart: 'Bass',    vocalStrength: 2, height: 179, notes: 'New member' },
  { id: '16', name: 'Paul Müller',   voicePart: 'Bass',    vocalStrength: 3, height: 177, notes: '' },
];

export default function App() {
  const [singers, setSingers] = useState(SAMPLE_SINGERS);
  const [chart, setChart] = useState(null);

  function handleAdd(singer) {
    setSingers((prev) => [...prev, singer]);
    setChart(null);
  }

  function handleRemove(id) {
    setSingers((prev) => prev.filter((s) => s.id !== id));
    setChart(null);
  }

  function handleGenerate() {
    setChart(generateSeatingChart(singers));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎵</span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-none">Choir Map AI</h1>
              <p className="text-xs text-slate-400 mt-0.5">Smart seating chart generator</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 hidden sm:block">
            {singers.length} singer{singers.length !== 1 ? 's' : ''} • 3 rows
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Singer input form */}
        <SingerForm onAdd={handleAdd} />

        {/* Singer list */}
        <SingerTable singers={singers} onRemove={handleRemove} />

        {/* Generate button */}
        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={singers.length === 0}
            className="bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-violet-200 transition-all hover:shadow-violet-300 hover:-translate-y-0.5 active:translate-y-0 text-base"
          >
            Generate Seating Chart
          </button>
        </div>

        {/* Seating chart */}
        {chart && <SeatingChart chart={chart} />}

        {/* Empty chart prompt */}
        {!chart && singers.length > 0 && (
          <p className="text-center text-sm text-slate-400">
            Click "Generate Seating Chart" to arrange your singers.
          </p>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-6 text-center text-xs text-slate-400 border-t border-slate-200 mt-4">
        Choir Map AI — MVP demo
      </footer>
    </div>
  );
}
