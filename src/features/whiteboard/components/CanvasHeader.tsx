import React, { memo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { HeaderCtrlBtn } from "./WhiteboardUI";

interface CanvasHeaderProps {
  mode: "step" | "freesteps";
  setMode: (m: "step" | "freesteps") => void;
  pendingModeSwitch: "step" | "freesteps" | null;
  setPendingModeSwitch: (m: "step" | "freesteps" | null) => void;
  confirmSwitchToStep: () => void;
  confirmSwitchToFreeSteps: () => void;
  steps: any[];
  freeSteps: any[];
  currentStep: number;
  currentFreeStep: number;
  goToStep: (i: number) => void;
  setCurrentFreeStep: (i: number) => void;
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
  addNextStep: () => void;
  addFreeStep: () => void;
  removeLastStep: () => void;
  detenerStepPlay: () => void;
  isLooping: boolean;
  setIsLooping: React.Dispatch<React.SetStateAction<boolean>>;
  showPath: boolean;
  setShowPath: React.Dispatch<React.SetStateAction<boolean>>;
  showTrail: boolean;
  setShowTrail: React.Dispatch<React.SetStateAction<boolean>>;
  isRecording: boolean;
  showVoronoi: boolean;
  setShowVoronoi: React.Dispatch<React.SetStateAction<boolean>>;
  selectedShapeId: string | null;
  shapes: any[];
  setShapes: React.Dispatch<React.SetStateAction<any[]>>;
  deleteSelected: () => void;
  handleSaveBoard: (lines: any[]) => void;
  isSaving: boolean;
  drawLines: any[];
  playbackSpeed: number;
  setPlaybackSpeed: (s: number) => void;
  stepPlaybackProgress: number;
  setStepPlaybackProgress: (p: number) => void;
  isSession?: boolean;
  hasUnsavedChanges: boolean;
}

export const CanvasHeader = memo(({
  mode, confirmSwitchToStep, confirmSwitchToFreeSteps, setPendingModeSwitch,
  steps, freeSteps, currentStep, currentFreeStep, goToStep, setCurrentFreeStep,
  isPlaying, setIsPlaying, addNextStep, addFreeStep, removeLastStep,
  detenerStepPlay, isLooping, setIsLooping,
  showPath, setShowPath, showTrail, setShowTrail, isRecording,
  showVoronoi, setShowVoronoi, selectedShapeId, shapes, setShapes,
  deleteSelected, handleSaveBoard, isSaving, drawLines,
  playbackSpeed, setPlaybackSpeed, stepPlaybackProgress, setStepPlaybackProgress,
  isSession, hasUnsavedChanges
}: CanvasHeaderProps) => {
  const router = useRouter();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const returnTo = searchParams?.get("returnTo");
  const [showExitConfirm, setShowExitConfirm] = React.useState(false);

  const handleBack = (e?: React.PointerEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
      return;
    }

    executeBack();
  };

  const executeBack = () => {
    if (returnTo) {
      window.location.assign(returnTo);
    } else {
      router.back();
    }
  };

  return (
    <div className="flex-shrink-0 border-b border-white/10 bg-gray-900/95 backdrop-blur">
      {showExitConfirm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ touchAction: 'none' }}>
          <div className="rounded-xl border border-white/10 bg-gray-900 p-6 shadow-2xl w-[400px]"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-lg font-bold text-white">⚠️ Unsaved Changes</h3>
            <p className="mb-6 text-sm text-white/70 text-balance">
              You have unsaved changes. Are you sure you want to leave without saving?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); setShowExitConfirm(false); }}
                onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); setShowExitConfirm(false); }}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); executeBack(); }}
                onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); executeBack(); }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors shadow-lg">
                Leave
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="flex h-12 items-center gap-3 px-3">
        <button
          onClick={(e) => handleBack(e)}
          onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); handleBack(); }}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <div className="h-4 w-px bg-white/10" />

        <div className="flex rounded-lg bg-gray-800 p-0.5">
          <button onClick={() => {
            if (mode === "step") return;
            if (freeSteps.length > 1) setPendingModeSwitch("step");
            else confirmSwitchToStep();
          }}
            onPointerUp={(e) => {
              e.preventDefault(); e.stopPropagation();
              if (mode === "step") return;
              if (freeSteps.length > 1) setPendingModeSwitch("step");
              else confirmSwitchToStep();
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-colors ${mode === "step" ? "bg-purple-600 text-white shadow" : "text-white/50 hover:text-white"}`}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path d="M4 3h2v10H4zM10 3h2v10h-2z" /></svg>
            Steps
          </button>
          <button onClick={() => {
            if (mode === "freesteps") return;
            if (steps.length > 1) setPendingModeSwitch("freesteps");
            else confirmSwitchToFreeSteps();
          }}
            onPointerUp={(e) => {
              e.preventDefault(); e.stopPropagation();
              if (mode === "freesteps") return;
              if (steps.length > 1) setPendingModeSwitch("freesteps");
              else confirmSwitchToFreeSteps();
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-colors ${mode === "freesteps" ? "bg-blue-600 text-white shadow" : "text-white/50 hover:text-white"}`}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path d="M4 3l9 5-9 5V3z" /></svg>
            FreeSteps
          </button>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto overflow-y-hidden min-w-0" style={{ maxWidth: '420px', scrollbarWidth: 'none' }}>
          <div className="h-4 w-px bg-white/10 flex-shrink-0 mr-1" />
          {(mode === "step" ? steps : freeSteps).map((_, idx) => (
            <button
              key={idx}
              onPointerUp={(e) => {
                e.preventDefault(); e.stopPropagation();
                if (mode === "step") { goToStep(idx); }
                else { if (!isPlaying) setCurrentFreeStep(idx); }
              }}
              disabled={isPlaying}
              className={`flex-shrink-0 flex h-6 w-7 items-center justify-center rounded text-[11px] font-bold border transition-all
              ${(mode === "step" ? currentStep : currentFreeStep) === idx
                  ? 'border-purple-500 bg-purple-700/80 text-white shadow shadow-purple-900/50'
                  : 'border-white/10 bg-gray-800 text-white/50 hover:border-purple-400/50 hover:text-white'
                } disabled:cursor-not-allowed`}
            >
              {idx + 1}
            </button>
          ))}
          <button
            onPointerUp={(e) => {
              e.preventDefault(); e.stopPropagation();
              if (!isPlaying) { if (mode === "step") addNextStep(); else addFreeStep(); }
            }}
            disabled={isPlaying}
            className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded border border-dashed border-white/20 text-white/30 hover:border-purple-400/60 hover:text-purple-400 disabled:opacity-30 transition-all text-xs font-bold"
          >
            +
          </button>
          {(mode === "step" ? steps.length : freeSteps.length) > 1 && (
            <button
              onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); if (!isPlaying) removeLastStep(); }}
              disabled={isPlaying}
              title="Eliminar último step"
              className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-gray-800 text-white/20 hover:border-orange-500/50 hover:text-orange-400 disabled:opacity-30 transition-all text-[10px]"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path d="M14 13L8 8L14 3V13ZM7 13L1 8L7 3V13Z" />
              </svg>
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1 border-r border-white/10 pr-3">
            {mode === "freesteps" && (
              <>
                <HeaderCtrlBtn 
                  active={isPlaying && !isRecording} 
                  onClick={() => {
                    setCurrentFreeStep(0);
                    setIsPlaying(true);
                  }} 
                  disabled={isPlaying || isRecording} 
                  title="Play"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path d="M3 2.5l10 5.5-10 5.5V2.5z" /></svg>
                </HeaderCtrlBtn>
                <HeaderCtrlBtn active={false} onClick={() => setIsPlaying(false)} disabled={!isPlaying || isRecording} title="Pause">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>
                </HeaderCtrlBtn>
                <HeaderCtrlBtn active={false} onClick={() => { setIsPlaying(false); setCurrentFreeStep(0); }} disabled={isRecording} title="Stop">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><rect x="3" y="3" width="10" height="10" rx="1.5" /></svg>
                </HeaderCtrlBtn>
                <HeaderCtrlBtn active={isLooping} onClick={() => setIsLooping(l => !l)} title="Loop">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5"><path d="M2 8a6 6 0 016-6 6 6 0 015.5 3.5M14 8a6 6 0 01-6 6 6 6 0 01-5.5-3.5" strokeLinecap="round" /></svg>
                </HeaderCtrlBtn>
                <div className="mx-1 h-4 w-px bg-white/10" />
                <HeaderCtrlBtn active={showPath} onClick={() => setShowPath(p => !p)} title="Show path">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5" strokeLinecap="round"><path d="M2 12 C5 12 5 4 8 4 C11 4 11 12 14 12" /></svg>
                </HeaderCtrlBtn>
                <HeaderCtrlBtn active={showTrail} onClick={() => setShowTrail(t => !t)} title="Show trail">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><circle cx="8" cy="8" r="2.5" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" /></svg>
                </HeaderCtrlBtn>
              </>
            )}
            {mode === "step" && (
              <>
                <HeaderCtrlBtn active={isPlaying} onClick={() => setIsPlaying(true)} disabled={isPlaying} title="Play">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path d="M3 2.5l10 5.5-10 5.5V2.5z" /></svg>
                </HeaderCtrlBtn>
                <HeaderCtrlBtn active={false} onClick={() => setIsPlaying(false)} disabled={!isPlaying} title="Pause">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>
                </HeaderCtrlBtn>
                <HeaderCtrlBtn active={false} onClick={detenerStepPlay} title="Stop">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><rect x="3" y="3" width="10" height="10" rx="1.5" /></svg>
                </HeaderCtrlBtn>
                
                <div className="mx-1 h-4 w-px bg-white/10" />

                <div className="flex items-center gap-1 rounded bg-gray-800 p-0.5">
                  {[1, 1.5, 2].map(speed => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); setPlaybackSpeed(speed); }}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors ${playbackSpeed === speed ? "bg-purple-600 text-white" : "text-white/40 hover:text-white"}`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
                <div className="mx-1.5 h-4 w-px bg-white/10" />
              </>
            )}
            <div className="mx-1 h-4 w-px bg-white/10" />
            <HeaderCtrlBtn active={showVoronoi} onClick={() => setShowVoronoi(v => !v)} title="Voronoi diagram">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5"><polygon points="8,2 14,5.5 14,10.5 8,14 2,10.5 2,5.5" /></svg>
            </HeaderCtrlBtn>
          </div>

          {selectedShapeId && (
            <div className="flex items-center gap-2">
              {(() => {
                const selShape = shapes.find(s => s.id === selectedShapeId);
                if (selShape?.type?.startsWith("player-")) {
                  return (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10">
                      <span className="text-[10px] uppercase font-bold text-white/40">Label</span>
                      <input type="text" maxLength={3} className="w-10 rounded border border-white/20 bg-gray-950 px-1 py-0.5 text-center text-xs font-bold text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={selShape.label ?? ""} onChange={(e) => setShapes(prev => prev.map(s => s.id === selectedShapeId ? { ...s, label: e.target.value } : s))} />
                    </div>
                  );
                }
                return null;
              })()}
              <button 
                onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); deleteSelected(); }}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs bg-red-800 hover:bg-red-700 transition-colors">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path d="M6 3h4a1 1 0 00-4 0zm-2 0a3 3 0 016 0h3a.5.5 0 010 1h-.5l-.8 8.4A2 2 0 0110.2 14H5.8a2 2 0 01-2-1.6L3 4H2.5a.5.5 0 010-1H4zm1.5 3a.5.5 0 011 0v5a.5.5 0 01-1 0V6zm3 0a.5.5 0 011 0v5a.5.5 0 01-1 0V6z" /></svg>
                Del
              </button>
            </div>
          )}
        <button 
          onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); handleSaveBoard(drawLines); }}
          disabled={isSaving} 
          className="flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-1.5 text-xs font-bold hover:bg-green-600 disabled:opacity-50 transition-colors shadow-sm">
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path d="M2 3a1 1 0 011-1h8l3 3v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm5 8a2 2 0 104 0 2 2 0 00-4 0zM4 4h6V2H4v2z" /></svg>
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  </div>
  );
});
