import React, { useState, useRef, memo } from "react";
import { createPortal } from "react-dom";
import { BarSep, ElementGroup, ElementBtn } from "./WhiteboardUI";
import { type ElementType } from "../hooks/useBoardState";
import { ELEMENT_RADIUS } from "./WhiteboardShape";

interface CanvasFooterProps {
  sport: string;
  elementColors: Record<ElementType, string>;
  setElementColors: React.Dispatch<React.SetStateAction<Record<ElementType, string>>>;
  setShapes: React.Dispatch<React.SetStateAction<any[]>>;
  addElement: (type: ElementType, x?: number, y?: number) => void;
  trashZoneRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  uiScale: number;
}

export const CanvasFooter = memo(({
  sport, elementColors, setElementColors, setShapes, addElement,
  trashZoneRef, canvasRef, uiScale
}: CanvasFooterProps) => {
  const [touchDraggingType, setTouchDraggingType] = useState<ElementType | null>(null);
  const [extraTeams, setExtraTeams] = useState(0);
  const touchGhostRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (type: ElementType, e: React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];
    if (touch) {
      setTouchDraggingType(type);
      requestAnimationFrame(() => {
        if (touchGhostRef.current) {
          touchGhostRef.current.style.left = `${touch.clientX}px`;
          touchGhostRef.current.style.top = `${touch.clientY}px`;
          touchGhostRef.current.style.display = 'block';
        }
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDraggingType) return;
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];
    if (touch && touchGhostRef.current) {
      touchGhostRef.current.style.left = `${touch.clientX}px`;
      touchGhostRef.current.style.top = `${touch.clientY}px`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchDraggingType) return;
    const touch = e.changedTouches[0];
    if (touch && canvasRef?.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const { clientX, clientY } = touch;

      if (
        clientX >= rect.left && clientX <= rect.right &&
        clientY >= rect.top && clientY <= rect.bottom
      ) {
        const dropX = (clientX - rect.left) / uiScale;
        const dropY = (clientY - rect.top) / uiScale;
        addElement(touchDraggingType, dropX, dropY);
      }
    }
    setTouchDraggingType(null);
    if (touchGhostRef.current) touchGhostRef.current.style.display = 'none';
  };

  const handleDragStart = (type: ElementType, e: React.DragEvent) => {
    e.dataTransfer.setData("type", type);

    if (uiScale < 0.99) {
      const btn = e.currentTarget as HTMLElement;
      const originalVisual = btn.querySelector('div, svg');
      if (originalVisual) {
        const ghost = originalVisual.cloneNode(true) as HTMLElement;
        let baseSize = 34;
        let baseFontSize = 13;
        let offsetX = baseSize / 2;
        let offsetY = baseSize / 2;

        if (type === "ball") {
          baseSize = 20;
          offsetX = baseSize / 2;
          offsetY = baseSize / 2;
        } else if (type === "cone") {
          baseSize = 30;
          offsetX = 15;
          offsetY = 26;
        } else if (type === "goal") {
          baseSize = 40;
          offsetX = baseSize / 2;
          offsetY = 11;
        }

        const visualSize = baseSize * uiScale;
        const visualFontSize = baseFontSize * uiScale;

        if (ghost instanceof HTMLDivElement) {
          ghost.style.width = `${visualSize}px`;
          ghost.style.height = `${visualSize}px`;
          ghost.style.fontSize = `${visualFontSize}px`;
        } else if (ghost instanceof SVGElement) {
          ghost.style.width = `${visualSize}px`;
          ghost.style.height = `${visualSize}px`;
        }

        ghost.style.position = 'absolute';
        ghost.style.top = '-1000px';
        ghost.style.left = '-1000px';
        ghost.style.transform = 'none';

        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, offsetX * uiScale, offsetY * uiScale);
        setTimeout(() => { if (document.body.contains(ghost)) document.body.removeChild(ghost); }, 0);
      }
    }
  };

  return (
    <div className="flex h-20 flex-shrink-0 items-center gap-1 overflow-visible relative z-10 border-t border-white/10 bg-gray-900/95 px-4 backdrop-blur">
      {touchDraggingType && typeof document !== 'undefined' && createPortal(
        <div
          ref={touchGhostRef}
          className="fixed pointer-events-none"
          style={{
            zIndex: 999999,
            transform: 'translate(-50%, -50%) translateZ(0)',
            display: 'none'
          }}
        >
          {(() => {
            const r = ELEMENT_RADIUS[touchDraggingType];
            const size = r * 2;
            const color = elementColors[touchDraggingType];
            if (touchDraggingType.startsWith("player-")) {
              return (
                <div style={{ width: size, height: size, backgroundColor: color, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.5)' }} />
              );
            } else if (touchDraggingType === "ball") {
              return <div style={{ width: size, height: size, backgroundColor: color, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.5)' }} />;
            } else if (touchDraggingType === "cone") {
              return (
                <div style={{
                  width: 0, height: 0,
                  borderLeft: `${r}px solid transparent`,
                  borderRight: `${r}px solid transparent`,
                  borderBottom: `${r * 1.732}px solid ${color}`,
                }} />
              );
            } else if (touchDraggingType === "goal") {
              const sLow = sport?.toLowerCase();
              if (sLow === "hockey") {
                return (
                  <svg viewBox="0 0 40 22" fill="none" style={{ width: 40, height: 22 }}>
                    <path d="M5,21 C5,5 35,5 35,21" stroke="black" strokeWidth="5" fill="none" />
                    <path d="M5,21 C5,5 35,5 35,21" stroke="white" strokeWidth="3" fill="none" />
                  </svg>
                );
              } else if (sLow === "basketball") {
                return (
                  <svg viewBox="0 0 40 40" fill="none" style={{ width: 40, height: 40 }}>
                    <rect x="0" y="10" width="40" height="4" fill="black" />
                    <circle cx="20" cy="22" r="8" stroke="#f97316" strokeWidth="2" />
                  </svg>
                );
              } else {
                return (
                  <svg viewBox="0 0 40 22" fill="none" style={{ width: 40, height: 22 }}>
                    <polyline points="1,21 1,1 39,1 39,21" stroke="black" strokeWidth="5" fill="none" />
                    <polyline points="1,21 1,1 39,1 39,21" stroke="white" strokeWidth="3" fill="none" />
                  </svg>
                );
              }
            }
            return null;
          })()}
        </div>,
        document.body
      )}

      <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-white/30">Elements</span>
      <BarSep />


      {Array.from({ length: 2 + extraTeams }).map((_, i) => {
        const typeKeys: ElementType[] = [
          "player-home", "player-away", "player-third", "player-fourth",
          "player-5", "player-6", "player-7", "player-8"
        ];
        const labels = ["Home", "Away", "Team 3", "Team 4", "Team 5", "Team 6", "Team 7", "Team 8"];
        const t = typeKeys[i]!;
        const lbl = labels[i]!;
        return (
          <React.Fragment key={t}>
            {i > 0 && <BarSep />}
            <ElementGroup label={lbl} color={elementColors[t]}
              onColorChange={c => {
                setElementColors(prev => ({ ...prev, [t]: c }));
                setShapes(prev => prev.map(s => s.type === t ? { ...s, fill: c } : s));
              }}>
              <ElementBtn
                onClick={() => addElement(t)}
                onDragStart={(e) => handleDragStart(t, e)}
                onTouchStart={(e) => handleTouchStart(t, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: elementColors[t], border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
              </ElementBtn>
            </ElementGroup>
          </React.Fragment>
        );
      })}

      {extraTeams < 6 && (
        <>
          <BarSep />
          <ElementGroup label="Add" color="transparent" onColorChange={() => { }} disableColorPicker>
            <ElementBtn onClick={() => setExtraTeams(e => e + 1)}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'transparent',
                  border: '2px dashed rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,0.5)',
                  fontWeight: 'bold',
                  fontSize: 18,
                  fontFamily: 'Arial'
                }}
                className="hover:border-white hover:text-white transition-all"
              >
                +
              </div>
            </ElementBtn>
          </ElementGroup>
        </>
      )}

      <BarSep />

      <ElementGroup label="Ball" color={elementColors.ball}
        presetColors={["#111111", "#ffffff", "#f97316"]}
        onColorChange={c => setElementColors(prev => ({ ...prev, ball: c }))}>
        <ElementBtn
          onClick={() => addElement("ball")}
          onDragStart={(e) => handleDragStart("ball", e)}
          onTouchStart={(e) => handleTouchStart("ball", e)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {sport?.toLowerCase() === "basketball" ? (
            <svg viewBox="0 0 24 24" fill="none" className="h-[28px] w-[28px]">
              <circle cx="12" cy="12" r="10" fill="#e26914" stroke="#111" strokeWidth="1" />
              <path d="M12 2 Q16 6 16 12 Q16 18 12 22" stroke="#111" strokeWidth="1" fill="none" />
              <path d="M12 2 Q8 6 8 12 Q8 18 12 22" stroke="#111" strokeWidth="1" fill="none" />
              <path d="M2 12 h20" stroke="#111" strokeWidth="1" />
            </svg>
          ) : sport?.toLowerCase() === "hockey" ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6">
              <circle cx="12" cy="12" r="10" fill="#111" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-[28px] w-[28px]">
              <circle cx="12" cy="12" r="10" fill="white" stroke="#222" strokeWidth="1" />
              <polygon points="12,6.5 15,8.5 13.5,12 10.5,12 9,8.5" fill="#222" />
              <polygon points="3.5,14 7,12 8,14.5 6,18.5" fill="#222" />
              <polygon points="20.5,14 17,12 16,14.5 18,18.5" fill="#222" />
              <polygon points="5,4 8,7 10,4.5 8,2" fill="#222" />
              <polygon points="19,4 16,7 14,4.5 16,2" fill="#222" />
              <line x1="9" y1="8.5" x2="8" y2="7" stroke="#222" strokeWidth="1" />
              <line x1="15" y1="8.5" x2="16" y2="7" stroke="#222" strokeWidth="1" />
              <line x1="10.5" y1="12" x2="8" y2="14.5" stroke="#222" strokeWidth="1" />
              <line x1="13.5" y1="12" x2="16" y2="14.5" stroke="#222" strokeWidth="1" />
              <line x1="7" y1="12" x2="3.5" y2="10" stroke="#222" strokeWidth="1" />
              <line x1="17" y1="12" x2="20.5" y2="10" stroke="#222" strokeWidth="1" />
            </svg>
          )}
        </ElementBtn>
      </ElementGroup>

      <BarSep />

      <ElementGroup label="Cone" color={elementColors.cone} onColorChange={c => setElementColors(prev => ({ ...prev, cone: c }))}>
        <ElementBtn
          onClick={() => addElement("cone")}
          onDragStart={(e) => handleDragStart("cone", e)}
          onTouchStart={(e) => handleTouchStart("cone", e)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <svg viewBox="0 0 24 28" fill="none" className="h-8 w-7"><path d="M12 3 L22 24 H2 Z" fill={elementColors.cone} opacity="0.95" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" /><ellipse cx="12" cy="24" rx="10" ry="2.5" fill="rgba(0,0,0,0.25)" /></svg>
        </ElementBtn>
      </ElementGroup>

      <BarSep />

      <ElementGroup label="Goal" disableColorPicker color="#ffffff" onColorChange={() => { }}>
        <ElementBtn
          onClick={() => addElement("goal")}
          onDragStart={(e) => handleDragStart("goal", e)}
          onTouchStart={(e) => handleTouchStart("goal", e)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {sport?.toLowerCase() === "hockey" ? (
            <svg viewBox="0 0 40 22" fill="none" className="h-6 w-10">
              <path d="M5,21 C5,5 35,5 35,21" stroke="black" strokeWidth="5" fill="none" />
              <path d="M5,21 C5,5 35,5 35,21" stroke="white" strokeWidth="3" fill="none" />
              <line x1="5" y1="21" x2="35" y2="21" stroke="black" strokeWidth="3" opacity="0.3" />
            </svg>
          ) : sport?.toLowerCase() === "basketball" ? (
            <svg viewBox="0 0 40 40" fill="none" className="h-8 w-10">
              <rect x="0" y="10" width="40" height="4" fill="black" />
              <circle cx="20" cy="22" r="8" stroke="#f97316" strokeWidth="2" />
            </svg>
          ) : (
            <svg viewBox="0 0 40 22" fill="none" className="h-6 w-10">
              <polyline points="1,21 1,1 39,1 39,21" stroke="black" strokeWidth="5" fill="none" />
              <polyline points="1,21 1,1 39,1 39,21" stroke="white" strokeWidth="3" fill="none" />
            </svg>
          )}
        </ElementBtn>
      </ElementGroup>

      <BarSep />

      <div className="ml-auto flex items-center gap-3 pr-2">
        <div ref={trashZoneRef} className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-red-500/40 bg-red-500/10 text-red-400 transition-all hover:scale-105 hover:border-red-500 hover:bg-red-500/20 hover:text-red-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7"><path d="M4 7h12M5 7l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9M8 7V4a1 1 0 011-1h2a1 1 0 011 1v3" strokeLinecap="round" /></svg>
        </div>
      </div>
    </div>
  );
});
