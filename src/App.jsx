import { useState, useEffect } from 'react';
import SingerForm from './components/SingerForm';
import SingerTable from './components/SingerTable';
import SeatingChart from './components/SeatingChart';
import EditSingerModal from './components/EditSingerModal';
import ChoirSelector from './components/ChoirSelector';
import AttendancePanel from './components/AttendancePanel';
import { generateSeatingChart, findBestPlacementForSinger } from './utils/generateSeatingChart';

const SAMPLE_SINGERS = [
  { id: '1',  name: 'Alice Monroe',   voicePart: 'Soprano', vocalStrength: 5, heightCm: 162, notes: 'Section lead' },
  { id: '2',  name: 'Beth Carter',    voicePart: 'Soprano', vocalStrength: 3, heightCm: 158, notes: '' },
  { id: '3',  name: 'Clara Singh',    voicePart: 'Soprano', vocalStrength: 4, heightCm: 165, notes: 'Soloist' },
  { id: '4',  name: 'Diana Lopez',    voicePart: 'Soprano', vocalStrength: 2, heightCm: 155, notes: '' },
  { id: '5',  name: 'Emma Johansson', voicePart: 'Alto',    vocalStrength: 4, heightCm: 170, notes: '' },
  { id: '6',  name: 'Fiona Walsh',    voicePart: 'Alto',    vocalStrength: 5, heightCm: 168, notes: 'Section lead' },
  { id: '7',  name: 'Grace Kim',      voicePart: 'Alto',    vocalStrength: 2, heightCm: 160, notes: 'New member' },
  { id: '8',  name: 'Hannah Brown',   voicePart: 'Alto',    vocalStrength: 3, heightCm: 163, notes: '' },
  { id: '9',  name: 'Ivan Torres',    voicePart: 'Tenor',   vocalStrength: 5, heightCm: 178, notes: 'Soloist' },
  { id: '10', name: 'James Patel',    voicePart: 'Tenor',   vocalStrength: 3, heightCm: 175, notes: '' },
  { id: '11', name: 'Kyle Nguyen',    voicePart: 'Tenor',   vocalStrength: 2, heightCm: 172, notes: '' },
  { id: '12', name: 'Leo Fischer',    voicePart: 'Tenor',   vocalStrength: 4, heightCm: 180, notes: '' },
  { id: '13', name: 'Marco Ricci',    voicePart: 'Bass',    vocalStrength: 5, heightCm: 185, notes: 'Section lead' },
  { id: '14', name: 'Nathan Black',   voicePart: 'Bass',    vocalStrength: 4, heightCm: 183, notes: '' },
  { id: '15', name: 'Owen Clarke',    voicePart: 'Bass',    vocalStrength: 2, heightCm: 179, notes: 'New member' },
  { id: '16', name: 'Paul Müller',    voicePart: 'Bass',    vocalStrength: 3, heightCm: 177, notes: '' },
];

function makeChoir(name, singers = []) {
  return {
    id: crypto.randomUUID(),
    name,
    singers,
    chart: null,
    attendanceSessions: [],
    currentAttendance: null,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem('choir-map-ai');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.choirs) && parsed.choirs.length > 0) {
        const validId = parsed.choirs.some((c) => c.id === parsed.activeChoirId)
          ? parsed.activeChoirId
          : parsed.choirs[0].id;
        return { choirs: parsed.choirs, activeChoirId: validId };
      }
    }
  } catch {}
  const defaultChoir = makeChoir('My Choir', SAMPLE_SINGERS);
  return { choirs: [defaultChoir], activeChoirId: defaultChoir.id };
}

export default function App() {
  const [{ choirs, activeChoirId }, setState] = useState(loadState);
  const [displayUnit, setDisplayUnit] = useState('cm');
  const [selectedSinger, setSelectedSinger] = useState(null);
  const [view, setView] = useState('seating');

  useEffect(() => {
    localStorage.setItem('choir-map-ai', JSON.stringify({ choirs, activeChoirId }));
  }, [choirs, activeChoirId]);

  const activeChoir = choirs.find((c) => c.id === activeChoirId) ?? choirs[0];
  const singers = activeChoir.singers;
  const chart = activeChoir.chart;

  // Updates only the currently active choir inside the choirs array.
  function updateActiveChoir(updater) {
    setState((prev) => ({
      ...prev,
      choirs: prev.choirs.map((c) =>
        c.id === prev.activeChoirId ? { ...c, ...updater(c) } : c
      ),
    }));
  }

  // ── Singer handlers ──────────────────────────────────────────────────────

  function handleAdd(singer) {
    updateActiveChoir((c) => ({
      singers: [...c.singers, singer],
      chart: c.chart ? findBestPlacementForSinger(singer, c.chart) : null,
    }));
  }

  function handleRemove(id) {
    updateActiveChoir((c) => ({
      singers: c.singers.filter((s) => s.id !== id),
      chart: c.chart
        ? c.chart.map((row) => ({ ...row, singers: row.singers.filter((s) => s.id !== id) }))
        : null,
    }));
  }

  function handleEdit(updatedSinger) {
    updateActiveChoir((c) => ({
      singers: c.singers.map((s) => s.id === updatedSinger.id ? updatedSinger : s),
      chart: c.chart
        ? c.chart.map((row) => ({
            ...row,
            singers: row.singers.map((s) => s.id === updatedSinger.id ? updatedSinger : s),
          }))
        : null,
    }));
    setSelectedSinger(null);
  }

  function handleChartChange(newChart) {
    updateActiveChoir(() => ({ chart: newChart }));
  }

  function handleGenerate() {
    updateActiveChoir((c) => ({ chart: generateSeatingChart(c.singers) }));
  }

  // ── Choir management ─────────────────────────────────────────────────────

  function handleCreateChoir() {
    const choir = makeChoir(`Choir ${choirs.length + 1}`);
    setState((prev) => ({ choirs: [...prev.choirs, choir], activeChoirId: choir.id }));
    setSelectedSinger(null);
  }

  function handleRenameChoir(id, name) {
    setState((prev) => ({
      ...prev,
      choirs: prev.choirs.map((c) => c.id === id ? { ...c, name } : c),
    }));
  }

  function handleDeleteChoir(id) {
    setState((prev) => {
      const remaining = prev.choirs.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        const fallback = makeChoir('My Choir');
        return { choirs: [fallback], activeChoirId: fallback.id };
      }
      const nextId = prev.activeChoirId === id ? remaining[0].id : prev.activeChoirId;
      return { choirs: remaining, activeChoirId: nextId };
    });
    setSelectedSinger(null);
  }

  function handleSwitchChoir(id) {
    setState((prev) => ({ ...prev, activeChoirId: id }));
    setSelectedSinger(null);
  }

  // ── Attendance handlers ──────────────────────────────────────────────────

  function handleStartAttendance({ eventName, eventType, date, notes }) {
    // Only store exceptions from "present"; missing entry = present by default
    updateActiveChoir(() => ({
      currentAttendance: { eventName, eventType, date, notes, statuses: {} },
    }));
  }

  function handleMarkAttendance(singerId, status) {
    // null means "present" — clears any stored exception
    updateActiveChoir((c) => {
      if (!c.currentAttendance) return {};
      const newStatuses = { ...c.currentAttendance.statuses };
      if (status === null || newStatuses[singerId] === status) {
        delete newStatuses[singerId];
      } else {
        newStatuses[singerId] = status;
      }
      return { currentAttendance: { ...c.currentAttendance, statuses: newStatuses } };
    });
  }

  function handleSaveAttendance() {
    // Snapshot all current singers with resolved statuses at save time
    updateActiveChoir((c) => {
      if (!c.currentAttendance) return {};
      const { statuses = {} } = c.currentAttendance;
      const records = {};
      for (const singer of c.singers) {
        records[singer.id] = {
          singerId: singer.id,
          singerName: singer.name,
          singerVoicePart: singer.voicePart,
          status: statuses[singer.id] ?? 'present',
        };
      }
      const saved = {
        ...c.currentAttendance,
        id: crypto.randomUUID(),
        savedAt: new Date().toISOString(),
        records,
      };
      return {
        attendanceSessions: [...(c.attendanceSessions ?? []), saved],
        currentAttendance: null,
      };
    });
  }

  function handleResetAttendance() {
    updateActiveChoir((c) => {
      if (!c.currentAttendance) return {};
      return { currentAttendance: { ...c.currentAttendance, statuses: {} } };
    });
  }

  function handleCancelAttendance() {
    updateActiveChoir(() => ({ currentAttendance: null }));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-2xl">🎵</span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-none">Choir Map AI</h1>
              <p className="text-xs text-slate-400 mt-0.5">Smart seating chart generator</p>
            </div>
          </div>

          <ChoirSelector
            choirs={choirs}
            activeChoirId={activeChoirId}
            onSwitch={handleSwitchChoir}
            onCreate={handleCreateChoir}
            onRename={handleRenameChoir}
            onDelete={handleDeleteChoir}
          />

          <div className="hidden sm:flex items-center gap-3 ml-auto flex-shrink-0">
            <span className="text-xs text-slate-400">
              {singers.length} singer{singers.length !== 1 ? 's' : ''}
              {chart ? ` • ${chart.length} rows` : ''}
            </span>
            {/* Display unit toggle */}
            <div className="flex rounded-md overflow-hidden border border-slate-200 text-xs">
              {[['cm', 'cm'], ['ftin', 'ft/in']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setDisplayUnit(val)}
                  className={`px-2.5 py-1 font-medium transition-colors ${
                    displayUnit === val
                      ? 'bg-violet-600 text-white'
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">

          {/* Left sidebar: form + roster + generate */}
          <div className="flex flex-col gap-4">
            <SingerForm onAdd={handleAdd} />
            <SingerTable singers={singers} onRemove={handleRemove} onEditRequest={setSelectedSinger} displayUnit={displayUnit} />
            <button
              onClick={handleGenerate}
              disabled={singers.length === 0}
              className="w-full bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-violet-200 transition-all hover:shadow-violet-300 hover:-translate-y-0.5 active:translate-y-0"
            >
              Generate Seating Chart
            </button>
          </div>

          {/* Right main area: view tabs + content */}
          <div>
            {/* View tabs */}
            <div className="flex border-b border-slate-200 mb-5">
              {[
                { id: 'seating',    label: 'Seating Chart' },
                { id: 'attendance', label: 'Attendance' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                    view === id
                      ? 'border-violet-600 text-violet-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                  {id === 'attendance' && activeChoir.currentAttendance && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Seating chart view */}
            {view === 'seating' && (
              <>
                {chart && (
                  <SeatingChart
                    chart={chart}
                    displayUnit={displayUnit}
                    onChartChange={handleChartChange}
                    onEditRequest={setSelectedSinger}
                  />
                )}
                {!chart && (
                  <div className="bg-white rounded-2xl shadow-sm border border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[480px] text-center p-8">
                    <div className="text-5xl mb-4 opacity-20">🎵</div>
                    <p className="font-medium text-slate-600">Your seating chart will appear here</p>
                    <p className="text-sm text-slate-400 mt-2 max-w-xs">
                      {singers.length === 0
                        ? 'Add singers using the form, then click Generate.'
                        : `${singers.length} singer${singers.length !== 1 ? 's' : ''} ready — click Generate to arrange them.`}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Attendance view */}
            {view === 'attendance' && (
              <AttendancePanel
                choir={activeChoir}
                chart={chart}
                displayUnit={displayUnit}
                onStart={handleStartAttendance}
                onMark={handleMarkAttendance}
                onSave={handleSaveAttendance}
                onReset={handleResetAttendance}
                onCancel={handleCancelAttendance}
              />
            )}
          </div>

        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-4 text-center text-xs text-slate-400 border-t border-slate-200 mt-6">
        Choir Map AI — MVP demo
      </footer>

      {selectedSinger && (
        <EditSingerModal
          singer={selectedSinger}
          onSave={handleEdit}
          onClose={() => setSelectedSinger(null)}
        />
      )}
    </div>
  );
}
