import { useState } from 'react';
import SeatingChart from './SeatingChart';
import { exportSingleSessionPdf, exportAllSessionsPdf } from '../utils/exportAttendancePdf';

const STATUS_CONFIG = {
  present: { label: 'Present', short: 'P', active: 'bg-emerald-500 text-white border-emerald-500', text: 'text-emerald-600' },
  absent:  { label: 'Absent',  short: 'A', active: 'bg-red-500 text-white border-red-500',         text: 'text-red-600' },
  late:    { label: 'Late',    short: 'L', active: 'bg-amber-500 text-white border-amber-500',     text: 'text-amber-600' },
  excused: { label: 'Excused', short: 'E', active: 'bg-sky-500 text-white border-sky-500',         text: 'text-sky-600' },
};

const PART_COLORS = {
  Soprano: 'bg-pink-100 text-pink-700',
  Alto:    'bg-orange-100 text-orange-700',
  Tenor:   'bg-sky-100 text-sky-700',
  Bass:    'bg-emerald-100 text-emerald-700',
};

const PART_ORDER = ['Soprano', 'Alto', 'Tenor', 'Bass'];

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

// For saved sessions (records has explicit status per singer)
function countSavedStatuses(records) {
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const r of Object.values(records)) {
    if (r.status && r.status in counts) counts[r.status]++;
  }
  return counts;
}

// For the active session (statuses only stores exceptions; missing = present)
function computeLiveCounts(singers, statuses) {
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const singer of singers) {
    const s = statuses?.[singer.id] ?? 'present';
    if (s in counts) counts[s]++;
  }
  return counts;
}

// ─── Session setup form ────────────────────────────────────────────────────

function SessionSetupForm({ singers, onStart }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ eventName: '', eventType: 'Rehearsal', date: today, notes: '' });
  const [error, setError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.eventName.trim()) { setError('Event name is required.'); return; }
    if (!form.date) { setError('Date is required.'); return; }
    if (singers.length === 0) {
      setError('Add singers to the roster before starting attendance.');
      return;
    }
    setError('');
    onStart({ ...form, eventName: form.eventName.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">New Attendance Session</h2>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Event Name <span className="text-red-500">*</span>
          </label>
          <input
            name="eventName"
            value={form.eventName}
            onChange={handleChange}
            placeholder="e.g. Tuesday Rehearsal, Spring Concert"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
          <select name="eventType" value={form.eventType} onChange={handleChange} className={`${INPUT_CLASS} bg-white`}>
            <option>Rehearsal</option>
            <option>Concert</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input type="date" name="date" value={form.date} onChange={handleChange} className={INPUT_CLASS} />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="e.g. Focus on Act II, outdoor venue"
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
      >
        Start Attendance
      </button>
    </form>
  );
}

// ─── Active session ────────────────────────────────────────────────────────

function ActiveSession({ session, singers, chart, displayUnit, onMark, onSave, onReset, onCancel }) {
  const counts = computeLiveCounts(singers, session.statuses);

  return (
    <div className="space-y-4">
      {/* Session header + summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                session.eventType === 'Concert' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {session.eventType}
              </span>
              <span className="text-xs text-slate-400">{formatDate(session.date)}</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">{session.eventName}</h2>
            {session.notes && <p className="text-xs text-slate-400 mt-0.5">{session.notes}</p>}
          </div>
          <button
            onClick={onCancel}
            className="flex-shrink-0 text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            Cancel session
          </button>
        </div>

        {/* Live summary counts */}
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <span
              key={key}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                counts[key] > 0 ? cfg.active : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              {cfg.label}: {counts[key]}
            </span>
          ))}
        </div>
      </div>

      {/* Seating chart or prompt */}
      {chart ? (
        <SeatingChart
          chart={chart}
          displayUnit={displayUnit}
          attendanceMode={true}
          attendanceStatuses={session.statuses ?? {}}
          onAttendanceStatusChange={onMark}
          onChartChange={() => {}}
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[320px] text-center p-8">
          <div className="text-5xl mb-4 opacity-20">🗺️</div>
          <p className="font-medium text-slate-600">No seating chart yet</p>
          <p className="text-sm text-slate-400 mt-2 max-w-xs">
            Switch to the Seating Chart tab and click Generate Seating Chart to create a layout first.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onSave}
          className="flex-1 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-violet-200 transition-all hover:shadow-violet-300 hover:-translate-y-0.5 active:translate-y-0"
        >
          Save Attendance
        </button>
        <button
          onClick={onReset}
          className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// ─── History ───────────────────────────────────────────────────────────────

function HistoryCard({ session, choirName }) {
  const [expanded, setExpanded] = useState(false);
  const counts = countSavedStatuses(session.records ?? {});
  const records = Object.values(session.records ?? {}).sort((a, b) => {
    const pi = PART_ORDER.indexOf(a.singerVoicePart);
    const pj = PART_ORDER.indexOf(b.singerVoicePart);
    if (pi !== pj) return pi - pj;
    return a.singerName.localeCompare(b.singerName);
  });

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-start gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
              session.eventType === 'Concert' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {session.eventType}
            </span>
            <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(session.date)}</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">{session.eventName}</p>
          <div className="flex flex-wrap gap-x-3 mt-0.5">
            <span className="text-xs text-emerald-600">P: {counts.present}</span>
            <span className="text-xs text-red-600">A: {counts.absent}</span>
            <span className="text-xs text-amber-600">L: {counts.late}</span>
            <span className="text-xs text-sky-600">E: {counts.excused}</span>
          </div>
          {session.notes && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{session.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); exportSingleSessionPdf(session, choirName); }}
            className="text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors px-2 py-0.5 rounded border border-violet-200 hover:border-violet-400 bg-white"
            title="Export this session as PDF"
          >
            PDF
          </button>
          <span className={`text-slate-400 transition-transform mt-0.5 ${expanded ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {records.map((record) => (
            <div key={record.singerId} className="px-4 py-2 flex items-center gap-3">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                PART_COLORS[record.singerVoicePart] ?? 'bg-slate-100 text-slate-600'
              }`}>
                {record.singerVoicePart}
              </span>
              <span className="text-sm text-slate-800 flex-1 min-w-0 truncate">{record.singerName}</span>
              {record.status && STATUS_CONFIG[record.status] ? (
                <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_CONFIG[record.status].active}`}>
                  {STATUS_CONFIG[record.status].label}
                </span>
              ) : (
                <span className="flex-shrink-0 text-xs text-slate-400">—</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AttendanceHistory({ sessions, choirName }) {
  if (!sessions || sessions.length === 0) return null;
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-800">
          Attendance History
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({sessions.length} session{sessions.length !== 1 ? 's' : ''})
          </span>
        </h2>
        <button
          onClick={() => exportAllSessionsPdf(sessions, choirName)}
          className="flex-shrink-0 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors px-3 py-1.5 rounded-lg border border-violet-200 hover:border-violet-400 bg-white"
        >
          Export All PDF
        </button>
      </div>
      <div className="p-4 space-y-2">
        {sorted.map((session) => (
          <HistoryCard key={session.id} session={session} choirName={choirName} />
        ))}
      </div>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────

export default function AttendancePanel({ choir, chart, displayUnit, onStart, onMark, onSave, onReset, onCancel }) {
  if (choir.currentAttendance) {
    return (
      <ActiveSession
        session={choir.currentAttendance}
        singers={choir.singers}
        chart={chart}
        displayUnit={displayUnit}
        onMark={onMark}
        onSave={onSave}
        onReset={onReset}
        onCancel={onCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SessionSetupForm singers={choir.singers} onStart={onStart} />
      <AttendanceHistory sessions={choir.attendanceSessions ?? []} choirName={choir.name} />
    </div>
  );
}
