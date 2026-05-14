import React, { memo } from "react";
import { SidebarBtn, SidebarDivider } from "./WhiteboardUI";
import { type ToolType } from "../hooks/useDrawingTools";

interface CanvasSidebarProps {
  activeTool: string;
  setActiveTool: (t: ToolType) => void;
  setShowShapesPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showShapesPanel: boolean;
  setDrawLines: React.Dispatch<React.SetStateAction<any[]>>;
  isDrawTool: (t: string) => boolean;
  penColor: string;
  setPenColor: (c: string) => void;
  penSize: number;
  setPenSize: (s: number) => void;
  eraserSize: number;
  setEraserSize: (s: number) => void;
  isRecording: boolean;
  isPlaying: boolean;
  isStepPlaying: boolean;
  selectedShapeId: string | null;
  isGlobalMode: boolean;
  setIsGlobalMode: (val: boolean) => void;
}

export const CanvasSidebar = memo(({
  activeTool, setActiveTool, setShowShapesPanel, showShapesPanel,
  setDrawLines, isDrawTool, penColor, setPenColor, penSize, setPenSize,
  eraserSize, setEraserSize, isRecording, isPlaying, isStepPlaying,
  selectedShapeId, isGlobalMode, setIsGlobalMode
}: CanvasSidebarProps) => {
  return (
    <div className="relative flex w-14 flex-shrink-0 flex-col items-center border-r border-white/10 bg-gray-900/90 py-4">
      <div className="mb-4 flex flex-col items-center">
        <button
          onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); setIsGlobalMode(!isGlobalMode); }}
          className={`flex h-10 w-10 flex-col items-center justify-center rounded-xl border transition-all ${isGlobalMode ? 'bg-orange-600 border-orange-400 text-white shadow-lg shadow-orange-500/30' : 'bg-gray-800 border-white/10 text-gray-500 hover:text-white hover:bg-gray-700'}`}
          title={isGlobalMode ? "Global Mode: Elements persist across all steps" : "Step Mode: Elements are specific to this step"}
        >
          <div className="text-[8px] font-black uppercase tracking-tighter leading-none mb-0.5">
            {isGlobalMode ? "GLO" : "STEP"}
          </div>
          <div className={`h-1 w-4 rounded-full ${isGlobalMode ? 'bg-white' : 'bg-gray-600'} mt-1`} />
        </button>
        <div className="h-[1px] w-8 bg-white/10 mt-4" />
      </div>

      <div className="flex flex-col gap-2">
        <SidebarBtn active={activeTool === "select"} onClick={() => { setActiveTool("select"); setShowShapesPanel(false); }} title="Select">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M4 2l12 7.5L11 11l-2.5 6L4 2z" /></svg>
        </SidebarBtn>
        <SidebarBtn active={activeTool === "pen"} onClick={() => { setActiveTool("pen"); setShowShapesPanel(false); }} title="Draw">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-2.207 2.207L3 13.172V16h2.828l8.38-8.379-2.83-2.828z" /></svg>
        </SidebarBtn>
        <SidebarBtn active={activeTool === "eraser"} onClick={() => { setActiveTool("eraser"); setShowShapesPanel(false); }} title="Erase">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" strokeLinecap="round"><path d="M17 4.5a2.5 2.5 0 00-4.243-1.768l-7.5 7.5a1 1 0 000 1.414l3.6 3.6a1 1 0 001.414 0l7.5-7.5A2.5 2.5 0 0017 6.5V4.5zM3 15.5h5M2 17h6" /></svg>
        </SidebarBtn>
        <SidebarDivider />
        <SidebarBtn active={false} onClick={() => { setDrawLines([]); }} title="Clear all">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" strokeLinecap="round"><path d="M4 7h12M5 7l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9M8 7V4a1 1 0 011-1h2a1 1 0 011 1v3" /></svg>
        </SidebarBtn>
        <SidebarDivider />
        <div className="relative">
          <SidebarBtn active={showShapesPanel || ["line", "arrow", "rect", "circle"].includes(activeTool)} onClick={() => setShowShapesPanel(p => !p)} title="Shapes">
            {activeTool === "line" ? <svg viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><line x1="3" y1="17" x2="17" y2="3" /></svg> : activeTool === "arrow" ? <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><line x1="3" y1="17" x2="17" y2="3" /><polyline points="10,3 17,3 17,10" /></svg> : activeTool === "rect" ? <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><rect x="3" y="5" width="14" height="10" rx="1" /></svg> : activeTool === "circle" ? <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><ellipse cx="10" cy="10" rx="7" ry="7" /></svg> : <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><rect x="2" y="11" width="6" height="7" rx="1" /><ellipse cx="14" cy="7" rx="4" ry="4" /><line x1="2" y1="4" x2="9" y2="9" /></svg>}
          </SidebarBtn>
          {showShapesPanel && (
            <div className="absolute left-full top-0 ml-2 z-50 flex flex-col gap-1 rounded-xl border border-white/10 bg-gray-900 p-1.5 shadow-xl">
              {(["line", "arrow", "rect", "circle"] as ToolType[]).map(tool => (
                <button key={tool} 
                  onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTool(tool); setShowShapesPanel(false); }}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-all ${activeTool === tool ? "bg-blue-600 text-white shadow" : "text-white/60 hover:bg-gray-700 hover:text-white"}`}>
                  {tool === "line" ? "⎯" : tool === "arrow" ? "↗" : tool === "rect" ? "▭" : "◯"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {isDrawTool(activeTool) && (
        <>
          <SidebarDivider />
          {activeTool !== "eraser" && (
            <div className="flex flex-col items-center gap-1.5 mb-2 mt-2">
              {["#000000", "#ffffff", "#ef4444", "#3b82f6", "#22c55e"].map(color => (
                <button key={color} 
                  onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); setPenColor(color); }}
                  className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${penColor === color ? "border-white scale-110" : "border-white/20"}`} style={{ background: color }} />
              ))}
            </div>
          )}
          <div className="mt-1 flex flex-col gap-1">
            {([2, 4, 8] as const).map(s => (
              <button key={s} 
                onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); if (activeTool !== "eraser") setPenSize(s); else setEraserSize(s); }}
                className={`h-6 w-10 rounded text-[9px] font-bold transition-colors ${(activeTool !== "eraser" ? penSize : eraserSize) === s ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}`}>
                {s === 2 ? "S" : s === 4 ? "M" : "L"}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mt-auto flex flex-col items-center gap-1 pb-1">
        {isRecording && <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />}
        {isPlaying && !isRecording && <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />}
      </div>
    </div>
  );
});
