import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

// Attendance mode card styles — keyed by status (null = default present)
const ATTENDANCE_STYLE = {
  null:    { card: 'border-slate-200 bg-white hover:border-violet-300',         badge: 'bg-slate-100 text-slate-600',   short: null },
  present: { card: 'border-emerald-300 bg-emerald-50 hover:border-emerald-400', badge: 'bg-emerald-100 text-emerald-700', short: 'P' },
  absent:  { card: 'border-red-300 bg-red-50 hover:border-red-400',             badge: 'bg-red-100 text-red-700',        short: 'A' },
  late:    { card: 'border-amber-300 bg-amber-50 hover:border-amber-400',       badge: 'bg-amber-100 text-amber-700',    short: 'L' },
  excused: { card: 'border-sky-300 bg-sky-50 hover:border-sky-400',             badge: 'bg-sky-100 text-sky-700',        short: 'E' },
};

const POPOVER_OPTIONS = [
  { status: null,      label: 'Present',      color: 'text-emerald-600' },
  { status: 'absent',  label: 'Absent',       color: 'text-red-600' },
  { status: 'late',    label: 'Late / Tardy', color: 'text-amber-600' },
  { status: 'excused', label: 'Excused',      color: 'text-sky-600' },
];

const ROW_BG = ['bg-white', 'bg-slate-50', 'bg-slate-100'];

function cardScale(n) {
  if (n <= 5)  return { px: 12, py: 10, nameFz: 14, badgeFz: 12, notesFz: 12, dotSz: 6, badgePx: 6, badgePy: 2, gap: 8 };
  if (n <= 8)  return { px: 10, py: 8,  nameFz: 12, badgeFz: 11, notesFz: 11, dotSz: 5, badgePx: 5, badgePy: 1, gap: 6 };
  if (n <= 11) return { px: 7,  py: 5,  nameFz: 11, badgeFz: 10, notesFz: 10, dotSz: 4, badgePx: 4, badgePy: 1, gap: 4 };
  return         { px: 5,  py: 4,  nameFz: 10, badgeFz: 9,  notesFz: 9,  dotSz: 3, badgePx: 3, badgePy: 1, gap: 3 };
}

function findSingerRow(chart, singerId) {
  for (let r = 0; r < chart.length; r++) {
    if (chart[r].singers.some((s) => s.id === singerId)) return r;
  }
  return -1;
}

function computeNewChart(chart, activeId, overId) {
  let srcRow = -1, srcIdx = -1;
  for (let r = 0; r < chart.length; r++) {
    const idx = chart[r].singers.findIndex((s) => s.id === activeId);
    if (idx !== -1) { srcRow = r; srcIdx = idx; break; }
  }
  if (srcRow === -1) return chart;

  let dstRow = -1, dstIdx = -1;
  if (typeof overId === 'string' && overId.startsWith('row-')) {
    dstRow = parseInt(overId.split('-')[1]);
    dstIdx = chart[dstRow].singers.length;
  } else {
    for (let r = 0; r < chart.length; r++) {
      const idx = chart[r].singers.findIndex((s) => s.id === overId);
      if (idx !== -1) { dstRow = r; dstIdx = idx; break; }
    }
  }
  if (dstRow === -1) return chart;

  if (srcRow === dstRow) {
    return chart.map((row, i) =>
      i === srcRow ? { ...row, singers: arrayMove(row.singers, srcIdx, dstIdx) } : row
    );
  }

  const next = chart.map((row) => ({ ...row, singers: [...row.singers] }));
  const [moved] = next[srcRow].singers.splice(srcIdx, 1);
  next[dstRow].singers.splice(dstIdx, 0, moved);
  return next;
}

// ── Normal (drag-and-drop) singer card ─────────────────────────────────────

function SingerCard({ singer, singerCount, displayUnit, onEdit }) {
  const colors = PART_COLORS[singer.voicePart] ?? {
    card: 'bg-slate-50 border-slate-200',
    badge: 'bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
  };
  const s = cardScale(singerCount);
  const heightStr = formatHeight(singer.heightCm, displayUnit);

  return (
    <div
      className={`group border rounded-xl text-left flex-1 flex flex-col overflow-hidden ${colors.card}`}
      style={{ padding: `${s.py}px ${s.px}px` }}
    >
      <div className="flex items-center mb-1" style={{ gap: 6 }}>
        <span className={`rounded-full flex-shrink-0 ${colors.dot}`} style={{ width: s.dotSz, height: s.dotSz }} />
        <span className="font-semibold text-slate-800 truncate flex-1 min-w-0" style={{ fontSize: s.nameFz }}>
          {singer.name}
        </span>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-shrink-0 text-slate-300 hover:text-violet-500 transition-colors opacity-0 group-hover:opacity-100 leading-none"
            style={{ fontSize: s.nameFz }}
            title="Edit singer"
          >
            ✎
          </button>
        )}
      </div>
      <div className="flex items-center flex-nowrap mb-1 overflow-hidden" style={{ gap: 4 }}>
        <span
          className={`inline-block font-medium rounded-full flex-shrink-0 ${colors.badge}`}
          style={{ fontSize: s.badgeFz, padding: `${s.badgePy}px ${s.badgePx}px` }}
        >
          {singer.voicePart}
        </span>
        {heightStr && (
          <span className="text-slate-400 truncate min-w-0" style={{ fontSize: s.notesFz }}>{heightStr}</span>
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
        <p className="text-slate-400 mt-auto pt-1 truncate" style={{ fontSize: s.notesFz }} title={singer.notes}>
          {singer.notes}
        </p>
      )}
    </div>
  );
}

function SortableSingerCard({ singer, singerCount, displayUnit, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: singer.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}
      className={`touch-none select-none cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-0' : ''}`}
      {...attributes}
      {...listeners}
    >
      <SingerCard singer={singer} singerCount={singerCount} displayUnit={displayUnit} onEdit={onEdit} />
    </div>
  );
}

// ── Attendance mode singer card ─────────────────────────────────────────────

function AttendanceSingerCard({ singer, singerCount, displayUnit, status, onClick }) {
  const colors = PART_COLORS[singer.voicePart] ?? {
    badge: 'bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
  };
  const s = cardScale(singerCount);
  const heightStr = formatHeight(singer.heightCm, displayUnit);
  const atStyle = ATTENDANCE_STYLE[status] ?? ATTENDANCE_STYLE.null;

  return (
    <div
      className={`border-2 rounded-xl text-left flex-1 flex flex-col overflow-hidden cursor-pointer select-none transition-colors ${atStyle.card}`}
      style={{ flex: '1 1 0', minWidth: 0, padding: `${s.py}px ${s.px}px` }}
      onClick={onClick}
    >
      <div className="flex items-center mb-1" style={{ gap: 6 }}>
        <span className={`rounded-full flex-shrink-0 ${colors.dot}`} style={{ width: s.dotSz, height: s.dotSz }} />
        <span className="font-semibold text-slate-800 truncate flex-1 min-w-0" style={{ fontSize: s.nameFz }}>
          {singer.name}
        </span>
        {atStyle.short && (
          <span
            className={`flex-shrink-0 font-bold rounded-full ${atStyle.badge}`}
            style={{ fontSize: Math.max(9, s.badgeFz - 1), padding: `${s.badgePy}px ${s.badgePx}px` }}
          >
            {atStyle.short}
          </span>
        )}
      </div>
      <div className="flex items-center flex-nowrap mb-1 overflow-hidden" style={{ gap: 4 }}>
        <span
          className={`inline-block font-medium rounded-full flex-shrink-0 ${colors.badge}`}
          style={{ fontSize: s.badgeFz, padding: `${s.badgePy}px ${s.badgePx}px` }}
        >
          {singer.voicePart}
        </span>
        {heightStr && (
          <span className="text-slate-400 truncate min-w-0" style={{ fontSize: s.notesFz }}>{heightStr}</span>
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
        <p className="text-slate-400 mt-auto pt-1 truncate" style={{ fontSize: s.notesFz }} title={singer.notes}>
          {singer.notes}
        </p>
      )}
    </div>
  );
}

function DroppableRow({ id, style, children }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={style} className="flex flex-nowrap items-stretch min-h-[56px]">
      {children}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function SeatingChart({
  chart,
  displayUnit,
  onChartChange = () => {},
  onEditRequest,
  attendanceMode = false,
  attendanceStatuses = {},
  onAttendanceStatusChange,
}) {
  const [localChart, setLocalChart] = useState(chart);
  const [activeId, setActiveId]     = useState(null);
  const [overRowIdx, setOverRowIdx] = useState(null);
  const [attendancePopover, setAttendancePopover] = useState(null);
  // attendancePopover: { singerId, singerName, x, y } | null

  useEffect(() => { setLocalChart(chart); }, [chart]);

  // Close attendance popover on outside click
  useEffect(() => {
    if (!attendancePopover) return;
    function handleOutside() { setAttendancePopover(null); }
    function handleEsc(e) { if (e.key === 'Escape') setAttendancePopover(null); }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [attendancePopover]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeSinger = activeId
    ? localChart.flatMap((r) => r.singers).find((s) => s.id === activeId) ?? null
    : null;

  function handleDragStart({ active }) { setActiveId(active.id); }

  function handleDragOver({ active, over }) {
    if (!over) { setOverRowIdx(null); return; }
    const srcRow = findSingerRow(localChart, active.id);
    const overId = over.id;
    const dstRow = typeof overId === 'string' && overId.startsWith('row-')
      ? parseInt(overId.split('-')[1])
      : findSingerRow(localChart, overId);
    setOverRowIdx(dstRow !== -1 && dstRow !== srcRow ? dstRow : null);
  }

  function handleDragEnd({ active, over }) {
    setActiveId(null);
    setOverRowIdx(null);
    if (!over || active.id === over.id) return;
    const next = computeNewChart(localChart, active.id, over.id);
    setLocalChart(next);
    onChartChange(next);
  }

  function handleDragCancel() { setActiveId(null); setOverRowIdx(null); }

  function handleAttendanceCardClick(e, singer) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();

    // Toggle: clicking the same card again closes the popover
    if (attendancePopover?.singerId === singer.id) {
      setAttendancePopover(null);
      return;
    }

    // Position: prefer below card, flip above if near bottom of viewport
    const spaceBelow = window.innerHeight - rect.bottom;
    const popoverH = 168; // approximate height of popover
    const top = spaceBelow > popoverH + 10 ? rect.bottom + 6 : rect.top - popoverH - 6;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 184));

    setAttendancePopover({ singerId: singer.id, singerName: singer.name, top, left });
  }

  const totalSingers = localChart.reduce((sum, row) => sum + row.singers.length, 0);
  const partCounts = {};
  localChart.forEach((row) =>
    row.singers.forEach((s) => { partCounts[s.voicePart] = (partCounts[s.voicePart] || 0) + 1; })
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Seating Chart</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {totalSingers} singers across {localChart.length} rows
            </p>
          </div>
          {attendanceMode && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              Attendance Mode
            </span>
          )}
        </div>
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="p-6 space-y-4">
          {localChart.map((row, idx) => (
            <div
              key={idx}
              className={`rounded-xl p-4 transition-all ${ROW_BG[idx]} ${
                !attendanceMode && overRowIdx === idx ? 'ring-2 ring-violet-300 bg-violet-50/40' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {row.label}
                </span>
                <span className="text-xs text-slate-400">— {row.singers.length} singers</span>
              </div>

              {attendanceMode ? (
                // Attendance: plain clickable cards, no dnd
                <div
                  className="flex flex-nowrap items-stretch min-h-[56px]"
                  style={{ gap: cardScale(Math.max(1, row.singers.length)).gap }}
                >
                  {row.singers.map((singer) => (
                    <AttendanceSingerCard
                      key={singer.id}
                      singer={singer}
                      singerCount={row.singers.length}
                      displayUnit={displayUnit}
                      status={attendanceStatuses[singer.id] ?? null}
                      onClick={(e) => handleAttendanceCardClick(e, singer)}
                    />
                  ))}
                  {row.singers.length === 0 && (
                    <span className="text-xs text-slate-400 italic self-center px-2">Empty row</span>
                  )}
                </div>
              ) : (
                // Normal: sortable dnd cards
                <SortableContext
                  items={row.singers.map((s) => s.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <DroppableRow
                    id={`row-${idx}`}
                    style={{ gap: cardScale(Math.max(1, row.singers.length)).gap }}
                  >
                    {row.singers.map((singer) => (
                      <SortableSingerCard
                        key={singer.id}
                        singer={singer}
                        singerCount={row.singers.length}
                        displayUnit={displayUnit}
                        onEdit={onEditRequest ? () => onEditRequest(singer) : undefined}
                      />
                    ))}
                    {row.singers.length === 0 && (
                      <span className="text-xs text-slate-400 italic self-center px-2">
                        Drop singers here
                      </span>
                    )}
                  </DroppableRow>
                </SortableContext>
              )}
            </div>
          ))}
        </div>

        {!attendanceMode && (
          <DragOverlay>
            {activeSinger ? (
              <div style={{ width: 148 }} className="rotate-1 scale-105 shadow-2xl opacity-90">
                <SingerCard singer={activeSinger} singerCount={1} displayUnit={displayUnit} />
              </div>
            ) : null}
          </DragOverlay>
        )}
      </DndContext>

      <div className="px-6 pb-4 text-xs text-slate-400 text-center">
        {attendanceMode
          ? 'Click a singer card to mark attendance. Everyone is Present by default.'
          : 'Drag cards to rearrange. Vocal strength dots (violet) indicate volume level.'}
      </div>

      {/* Attendance status popover — fixed position, not clipped by overflow */}
      {attendancePopover && (
        <div
          style={{ position: 'fixed', top: attendancePopover.top, left: attendancePopover.left, zIndex: 200, width: 176 }}
          className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 truncate">{attendancePopover.singerName}</p>
          </div>
          {POPOVER_OPTIONS.map(({ status, label, color }) => {
            const currentStatus = attendanceStatuses[attendancePopover.singerId] ?? null;
            const isSelected = currentStatus === status;
            return (
              <button
                key={label}
                onClick={() => {
                  onAttendanceStatusChange?.(attendancePopover.singerId, status);
                  setAttendancePopover(null);
                }}
                className={`w-full text-left px-3 py-2.5 text-sm font-medium flex items-center gap-2.5 transition-colors ${
                  isSelected ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
                }`}
              >
                <span className={`text-base leading-none flex-shrink-0 ${color}`}>
                  {isSelected ? '●' : '○'}
                </span>
                <span className={isSelected ? color : 'text-slate-700'}>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
