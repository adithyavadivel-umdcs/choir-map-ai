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

const ROW_BG = ['bg-white', 'bg-slate-50', 'bg-slate-100'];

function cardScale(n) {
  if (n <= 5)  return { px: 12, py: 10, nameFz: 14, badgeFz: 12, notesFz: 12, dotSz: 6, badgePx: 6, badgePy: 2, gap: 8 };
  if (n <= 8)  return { px: 10, py: 8,  nameFz: 12, badgeFz: 11, notesFz: 11, dotSz: 5, badgePx: 5, badgePy: 1, gap: 6 };
  if (n <= 11) return { px: 7,  py: 5,  nameFz: 11, badgeFz: 10, notesFz: 10, dotSz: 4, badgePx: 4, badgePy: 1, gap: 4 };
  return         { px: 5,  py: 4,  nameFz: 10, badgeFz: 9,  notesFz: 9,  dotSz: 3, badgePx: 3, badgePy: 1, gap: 3 };
}

// Returns the row index containing singerId, or -1.
function findSingerRow(chart, singerId) {
  for (let r = 0; r < chart.length; r++) {
    if (chart[r].singers.some((s) => s.id === singerId)) return r;
  }
  return -1;
}

// Returns a new chart with activeId moved next to overId (same or different row).
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
    dstIdx = chart[dstRow].singers.length; // append to end of target row
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

  // Cross-row move
  const next = chart.map((row) => ({ ...row, singers: [...row.singers] }));
  const [moved] = next[srcRow].singers.splice(srcIdx, 1);
  next[dstRow].singers.splice(dstIdx, 0, moved);
  return next;
}

// Pure display card — no DnD concerns.
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
      className={`border rounded-xl text-left w-full ${colors.card}`}
      style={{ padding: `${s.py}px ${s.px}px` }}
    >
      <div className="flex items-center mb-1" style={{ gap: 6 }}>
        <span
          className={`rounded-full flex-shrink-0 ${colors.dot}`}
          style={{ width: s.dotSz, height: s.dotSz }}
        />
        <span className="font-semibold text-slate-800 truncate" style={{ fontSize: s.nameFz }}>
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
          <span className="text-slate-400" style={{ fontSize: s.notesFz }}>{heightStr}</span>
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
        <p className="text-slate-400 mt-1 truncate" style={{ fontSize: s.notesFz }} title={singer.notes}>
          {singer.notes}
        </p>
      )}
    </div>
  );
}

// Draggable wrapper around SingerCard.
function SortableSingerCard({ singer, singerCount, displayUnit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: singer.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, flex: '1 1 0', minWidth: 0 }}
      className={`touch-none select-none cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-0' : ''}`}
      {...attributes}
      {...listeners}
    >
      <SingerCard singer={singer} singerCount={singerCount} displayUnit={displayUnit} />
    </div>
  );
}

// Row container registered as a droppable so empty rows (and row backgrounds) accept drops.
function DroppableRow({ id, style, children }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={style} className="flex flex-nowrap min-h-[56px]">
      {children}
    </div>
  );
}

export default function SeatingChart({ chart, displayUnit, onChartChange = () => {} }) {
  const [localChart, setLocalChart] = useState(chart);
  const [activeId, setActiveId]     = useState(null);
  const [overRowIdx, setOverRowIdx] = useState(null);

  // Keep localChart in sync when a new chart is generated.
  useEffect(() => { setLocalChart(chart); }, [chart]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Singer being dragged — used for the DragOverlay.
  const activeSinger = activeId
    ? localChart.flatMap((r) => r.singers).find((s) => s.id === activeId) ?? null
    : null;

  function handleDragStart({ active }) {
    setActiveId(active.id);
  }

  function handleDragOver({ active, over }) {
    if (!over) { setOverRowIdx(null); return; }
    const srcRow = findSingerRow(localChart, active.id);
    const overId = over.id;
    const dstRow = typeof overId === 'string' && overId.startsWith('row-')
      ? parseInt(overId.split('-')[1])
      : findSingerRow(localChart, overId);
    // Only highlight the destination row when it differs from the source.
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

  function handleDragCancel() {
    setActiveId(null);
    setOverRowIdx(null);
  }

  const totalSingers = localChart.reduce((sum, row) => sum + row.singers.length, 0);
  const partCounts = {};
  localChart.forEach((row) =>
    row.singers.forEach((s) => {
      partCounts[s.voicePart] = (partCounts[s.voicePart] || 0) + 1;
    })
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Seating Chart</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalSingers} singers across {localChart.length} rows
          </p>
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

      {/* Rows — wrapped in a single DndContext */}
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
                overRowIdx === idx ? 'ring-2 ring-violet-300 bg-violet-50/40' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {row.label}
                </span>
                <span className="text-xs text-slate-400">— {row.singers.length} singers</span>
              </div>
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
                    />
                  ))}
                  {row.singers.length === 0 && (
                    <span className="text-xs text-slate-400 italic self-center px-2">
                      Drop singers here
                    </span>
                  )}
                </DroppableRow>
              </SortableContext>
            </div>
          ))}
        </div>

        {/* Ghost card that follows the cursor during drag */}
        <DragOverlay>
          {activeSinger ? (
            <div style={{ width: 148 }} className="rotate-1 scale-105 shadow-2xl opacity-90">
              <SingerCard singer={activeSinger} singerCount={1} displayUnit={displayUnit} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="px-6 pb-4 text-xs text-slate-400 text-center">
        Drag cards to rearrange. Vocal strength dots (violet) indicate volume level.
      </div>
    </div>
  );
}
