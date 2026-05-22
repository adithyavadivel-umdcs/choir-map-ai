import { useState, useEffect, useRef } from 'react';

export default function ChoirSelector({ choirs, activeChoirId, onSwitch, onCreate, onRename, onDelete }) {
  const [open, setOpen] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const containerRef = useRef(null);
  const renameInputRef = useRef(null);

  const activeChoir = choirs.find((c) => c.id === activeChoirId) ?? choirs[0];

  useEffect(() => {
    if (!open) {
      setRenamingId(null);
      setDeleteConfirmId(null);
      return;
    }
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) renameInputRef.current.focus();
  }, [renamingId]);

  function startRename(choir, e) {
    e.stopPropagation();
    setRenamingId(choir.id);
    setRenameValue(choir.name);
    setDeleteConfirmId(null);
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) onRename(renamingId, renameValue.trim());
    setRenamingId(null);
  }

  function handleRenameKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') setRenamingId(null);
  }

  function startDeleteConfirm(id, e) {
    e.stopPropagation();
    setDeleteConfirmId(id);
    setRenamingId(null);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-colors text-sm font-semibold text-slate-800 max-w-[220px]"
      >
        <span className="truncate">{activeChoir.name}</span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-20 bg-white rounded-xl shadow-lg border border-slate-200 w-72 py-1 overflow-hidden">
          <p className="px-3 pt-2 pb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Your Choirs
          </p>

          {choirs.map((choir) => {
            if (renamingId === choir.id) {
              return (
                <div key={choir.id} className="px-3 py-2 flex items-center gap-2">
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={handleRenameKey}
                    onBlur={commitRename}
                    className="flex-1 min-w-0 rounded-md border border-violet-400 px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                  <button
                    onMouseDown={(e) => { e.preventDefault(); commitRename(); }}
                    className="flex-shrink-0 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                  >
                    Save
                  </button>
                </div>
              );
            }

            if (deleteConfirmId === choir.id) {
              return (
                <div key={choir.id} className="px-3 py-2.5 bg-red-50">
                  <p className="text-xs text-slate-700 font-medium mb-2">
                    Delete "{choir.name}"? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onDelete(choir.id); setDeleteConfirmId(null); setOpen(false); }}
                      className="flex-1 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-md px-2 py-1.5 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="flex-1 text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-white rounded-md px-2 py-1.5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            const isActive = choir.id === activeChoirId;
            return (
              <div
                key={choir.id}
                className={`flex items-center gap-1 px-3 py-2 group cursor-pointer transition-colors ${
                  isActive ? 'bg-violet-50' : 'hover:bg-slate-50'
                }`}
                onClick={() => { if (!isActive) onSwitch(choir.id); setOpen(false); }}
              >
                <span className={`w-4 flex-shrink-0 text-violet-500 text-sm ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                  ✓
                </span>
                <span className="flex-1 text-sm font-medium text-slate-800 truncate">{choir.name}</span>
                <span className="text-xs text-slate-400 flex-shrink-0 mr-1">{choir.singers.length}</span>
                <button
                  onClick={(e) => startRename(choir, e)}
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
                  title="Rename choir"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => startDeleteConfirm(choir.id, e)}
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete choir"
                >
                  ✕
                </button>
              </div>
            );
          })}

          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              onClick={() => { onCreate(); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm font-semibold text-violet-600 hover:bg-violet-50 transition-colors flex items-center gap-2"
            >
              <span className="text-base leading-none font-normal">+</span>
              New Choir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
