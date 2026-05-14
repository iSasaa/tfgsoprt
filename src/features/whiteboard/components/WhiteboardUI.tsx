import React, { useState, useRef } from "react";

export function SidebarBtn({ children, active, onClick, title, danger, disabled }: {
  children: React.ReactNode; active?: boolean; onClick: () => void;
  title?: string; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button 
      onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }} 
      title={title} 
      disabled={disabled}
      className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-all disabled:opacity-30 select-auto ${danger && active ? "bg-red-600 shadow-lg shadow-red-900/60" :
        active ? "bg-blue-600 shadow-lg shadow-blue-900/60" : "text-white/50 hover:bg-white/10 hover:text-white"}`}>
      {children}
    </button>
  );
}

export function HeaderCtrlBtn({ children, active, onClick, title, danger, disabled }: {
  children: React.ReactNode; active?: boolean; onClick: () => void;
  title?: string; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button 
      onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }} 
      title={title} 
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-sm transition-all disabled:opacity-30 select-auto ${danger && active ? "bg-red-600 shadow shadow-red-900/60 text-white" :
        active ? "bg-blue-600 shadow shadow-blue-900/60 text-white" : "border border-white/10 bg-gray-800 text-white/60 hover:border-white/30 hover:text-white"}`}>
      {children}
    </button>
  );
}

export function SidebarDivider() {
  return <div className="my-0.5 h-px w-10 bg-white/10" />;
}

export function BarSep() {
  return <div className="mx-1 h-10 w-px flex-shrink-0 bg-white/10" />;
}

export function ElementGroup({ label, color, onColorChange, disableColorPicker, presetColors, children }: {
  label: string; color: string; onColorChange: (c: string) => void; disableColorPicker?: boolean; presetColors?: string[]; children: React.ReactNode;
}) {
  const PRESET_COLORS = presetColors || ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ffffff", "#000000"];
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="flex flex-shrink-0 flex-col items-center gap-1 relative outline-none"
      tabIndex={-1}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsOpen(false);
        }
      }}
    >
      <div className="flex gap-1">{children}</div>
      <button
        className="flex items-center gap-1 h-3 cursor-pointer outline-none"
        onPointerUp={(e) => {
          e.preventDefault(); e.stopPropagation();
          if (!disableColorPicker) setIsOpen(!isOpen);
        }}
      >
        {!disableColorPicker && (
          <div className="h-2.5 w-2.5 rounded-full border border-white/30" style={{ background: color }} />
        )}
        <span className="text-[9px] text-white/40 hover:text-white/80 transition-colors">{label}</span>
      </button>

      {isOpen && !disableColorPicker && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg border border-white/10 bg-gray-900 p-1.5 shadow-xl transition-all">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onPointerUp={(e) => {
                e.preventDefault(); e.stopPropagation();
                onColorChange(c);
                setIsOpen(false);
              }}
              className="h-4 w-4 rounded-full border border-white/20 transition-transform hover:scale-125 focus:scale-125 focus:outline-none"
              style={{ background: c }}
            />
          ))}
          <div className="w-px h-4 bg-white/10 mx-0.5" />
          <label className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 transition-transform hover:scale-125">
            <input type="color" value={color} onChange={e => onColorChange(e.target.value)}
              onBlur={() => setIsOpen(false)}
              className="sr-only" />
          </label>
        </div>
      )}
    </div>
  );
}

export function ElementBtn({ onClick, onDragStart, onTouchStart, onTouchMove, onTouchEnd, style, children }: {
  onClick: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const pointerStartRef = useRef<{ x: number, y: number, time: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    e.stopPropagation();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    const { x, y, time } = pointerStartRef.current;
    pointerStartRef.current = null;

    const dist = Math.sqrt(Math.pow(e.clientX - x, 2) + Math.pow(e.clientY - y, 2));
    const duration = Date.now() - time;

    if (dist < 10 && duration < 300) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };
  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onDragStart={onDragStart}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      draggable={!!onDragStart}
      style={{ touchAction: 'none', pointerEvents: 'auto', ...style }}
      className={`flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${onDragStart ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {children}
    </button>
  );
}
