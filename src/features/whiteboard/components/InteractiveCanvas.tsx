/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Image, Circle, Line, Text, Group, RegularPolygon, Shape, Rect, Arrow } from "react-konva";
import useImage from "use-image";
import Konva from "konva";
import { api } from "~/trpc/react";
import Link from "next/link";
import { useAnimationEngine } from "../hooks/useAnimationEngine";
import { useDrawingTools } from "../hooks/useDrawingTools";
import { useBoardState, type ShapeData, type StepSnapshot, type FreeStepSnapshot, type ElementType } from "../hooks/useBoardState";
import { type DrawLine, type ToolType } from "../hooks/useDrawingTools";

// ─── Voronoi helpers (outside component for zero-cost instantiation) ───────────────────────────
type VPt = { x: number; y: number };
function clipVCell(poly: VPt[], sx: number, sy: number, ox: number, oy: number): VPt[] {
  const mx = (sx + ox) / 2, my = (sy + oy) / 2, dx = ox - sx, dy = oy - sy;
  const inside = (p: VPt) => (p.x - mx) * dx + (p.y - my) * dy <= 0;
  const out: VPt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const c = poly[i]!, n = poly[(i + 1) % poly.length]!;
    const ci = inside(c), ni = inside(n);
    if (ci) out.push(c);
    if (ci !== ni) {
      const ex = n.x - c.x, ey = n.y - c.y, dn = ex * dx + ey * dy;
      if (Math.abs(dn) > 1e-10) {
        const t = ((mx - c.x) * dx + (my - c.y) * dy) / dn;
        out.push({ x: c.x + t * ex, y: c.y + t * ey });
      }
    }
  }
  return out;
}

// ─── Types ──────────────────────────────────────────────────────────────────
type Frame = { x: number; y: number; time: number };

const ELEMENT_RADIUS: Record<ElementType, number> = {
  "player-home": 18, "player-away": 18, "ball": 9, "cone": 13, "goal": 40,
};

const BackgroundImage = ({ width, height, sport }: { width: number; height: number; sport: string }) => {
  // Use a fallback to hockey if sport is missing or unrecognized, though it shouldn't be
  const validSports = ["hockey", "futsal", "football", "basketball", "handball"];
  const safeSport = validSports.includes(sport?.toLowerCase()) ? sport.toLowerCase() : "hockey";
  const imagePath = `/img/pitch_${safeSport}.svg`;

  const [image] = useImage(imagePath);
  if (!image) return null;
  return <Image image={image} width={width} height={height} alt="" />;
};

interface InteractiveCanvasProps { boardId: string; initialData: any; sport: string }

export const InteractiveCanvas = ({ boardId, initialData, sport }: InteractiveCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 500 });
  const [uiScale, setUiScale] = useState(() => typeof window !== 'undefined' ? Math.max(0.4, Math.min(1, window.innerWidth / 1100, window.innerHeight / 700)) : 1);
  const [windowSize, setWindowSize] = useState(() => typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : { w: 1100, h: 700 });

  // Consolidating all whiteboard state into custom hooks for modularity and maintainability
  const {
    activeTool, setActiveTool, penColor, setPenColor, penSize, setPenSize,
    eraserSize, setEraserSize, drawLines, setDrawLines, handleStagePointerDown,
    handleStagePointerMove, handleStagePointerUp, isDrawTool,
    isDrawing, currentLinePoints
  } = useDrawingTools({ initialDrawLines: initialData?.drawLines ?? [] });

  const [elementColors, setElementColors] = useState<Record<ElementType, string>>({
    "player-home": "#3b82f6", "player-away": "#ef4444",
    ball: sport === "hockey" ? "#111111" : sport === "basketball" ? "#f97316" : "#ffffff",
    cone: "#f97316", goal: "#ffffff",
  });

  const [mode, setMode] = useState<"freesteps" | "step">("step");
  const [isLooping, setIsLooping] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [stepPlaySpeed, setStepPlaySpeed] = useState(2);
  const autoAdvanceRef = useRef(autoAdvance);
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const isHoveringTrashRef = useRef(false);
  const trashZoneRef = useRef<HTMLDivElement>(null);
  const dragPointerRef = useRef<HTMLDivElement>(null);
  const [showPath, setShowPath] = useState(false);
  const [showTrail, setShowTrail] = useState(false);
  const [showVoronoi, setShowVoronoi] = useState(false);
  const [trailLines, setTrailLines] = useState<Record<string, number[]>>({});
  const [showShapesPanel, setShowShapesPanel] = useState(false);
  const [goalDragImage, setGoalDragImage] = useState<string | null>(null);
  const goalAnchorOffsetRef = useRef({ x: 0, y: 0 });
  const [pendingModeSwitch, setPendingModeSwitch] = useState<"freesteps" | "step" | null>(null);

  const layerRef = useRef<Konva.Layer>(null);
  const voronoiLayerRef = useRef<Konva.Layer>(null);
  const liveRecordingLineRef = useRef<Konva.Line>(null);
  const draggingShapeIdRef = useRef<string | null>(null);
  const showTrailRef = useRef(showTrail);
  const recordStartTimeRef = useRef<number>(0);
  const activeRecordingPathsRef = useRef<Record<string, Frame[]>>({});
  const lastTrailUpdateTimeRef = useRef<Record<string, number>>({});
  const lastDragUpdateRef = useRef<number>(0);
  const stepTransitionAnimRef = useRef<number | null>(null);
  const prevStageSizeRef = useRef<{ width: number; height: number } | null>(null);

  const {
    shapes, setShapes, shapesRef, steps, setSteps, stepsRef,
    currentStep, setCurrentStep, freeSteps, setFreeSteps,
    currentFreeStep, setCurrentFreeStep, isRecording, setIsRecording,
    isPlaying, setIsPlaying, selectedShapeId, setSelectedShapeId,
    handleSaveBoard, saveMutation, addElement, deleteSelected, rotateSelected,
    goToStep, addNextStep, removeLastStep, enterStepMode, saveCurrentStep,
    notification
  } = useBoardState({
    boardId, initialData, sport, stageSize, elementColors, voronoiLayerRef, mode, setMode
  });

  const {
    isStepPlaying, startStepPlay, stopStepPlay, pauseStepPlay,
    toggleStepPlay, animateStepTransition
  } = useAnimationEngine({
    layerRef, voronoiLayerRef, stepsRef, shapesRef, setShapes,
    setCurrentStep, stepPlaySpeed, isLooping, autoAdvanceRef
  });

  const freeStepsRef = useRef(freeSteps);
  const currentFreeStepRef = useRef(currentFreeStep);
  const isRecordingRef = useRef(isRecording);
  const selectedShapeIdRef = useRef(selectedShapeId);

  useEffect(() => {
    freeStepsRef.current = freeSteps;
    currentFreeStepRef.current = currentFreeStep;
    isRecordingRef.current = isRecording;
    selectedShapeIdRef.current = selectedShapeId;
    showTrailRef.current = showTrail;
    stepsRef.current = steps;
    shapesRef.current = shapes;
    autoAdvanceRef.current = autoAdvance;
  });

  // Keep raw initial data until the first real canvas measurement
  const rawInitialDataRef = useRef<any>(initialData);

  // ─── Window resize listener (uiScale + windowSize) ───────────────────────
  useEffect(() => {
    const onResize = () => {
      const scale = Math.max(0.4, Math.min(1, window.innerWidth / 1100, window.innerHeight / 700));
      setUiScale(scale);
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ─── Resize + Hydration via ResizeObserver ────────────────────────────────
  // IMPORTANT: All state setters are called at the TOP LEVEL of the observer callback
  // (never inside another setter's updater), which is the correct React pattern.
  useEffect(() => {
    const denX = (nx: number, w: number) => nx * w;
    const denY = (ny: number, h: number) => ny * h;
    const isNorm = (v: number) => v >= 0 && v <= 1;

    const denormShape = (s: any, w: number, h: number): ShapeData => ({
      ...s,
      x: isNorm(s.x) ? denX(s.x, w) : s.x,
      y: isNorm(s.y) ? denY(s.y, h) : s.y,
    });
    const denormSnap = (ss: any, w: number, h: number) => ({
      ...ss,
      x: isNorm(ss.x) ? denX(ss.x, w) : ss.x,
      y: isNorm(ss.y) ? denY(ss.y, h) : ss.y,
      wp1: ss.wp1 ? { x: isNorm(ss.wp1.x) ? denX(ss.wp1.x, w) : ss.wp1.x, y: isNorm(ss.wp1.y) ? denY(ss.wp1.y, h) : ss.wp1.y } : undefined,
      wp2: ss.wp2 ? { x: isNorm(ss.wp2.x) ? denX(ss.wp2.x, w) : ss.wp2.x, y: isNorm(ss.wp2.y) ? denY(ss.wp2.y, h) : ss.wp2.y } : undefined,
    });

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      if (w <= 0 || h <= 0) return;

      if (prevStageSizeRef.current === null) {
        // ── First real measurement: hydrate + denormalize with CORRECT size ──
        prevStageSizeRef.current = { width: w, height: h };
        const raw = rawInitialDataRef.current;
        if (raw?.shapes) {
          setShapes((raw.shapes as any[]).map((s: any) => denormShape(s, w, h)));
        }
        if (raw?.steps) {
          setSteps((raw.steps as any[]).map((step: any) =>
            (step as any[]).map((ss: any) => denormSnap(ss, w, h))
          ));
        }
        if (raw?.freeSteps) {
          setFreeSteps((raw.freeSteps as any[]).map((fs: any) => ({
            ...fs,
            initial: (fs.initial as any[]).map((ss: any) => denormSnap(ss, w, h)),
            recordings: Object.fromEntries(
              Object.entries(fs.recordings as Record<string, any[]>).map(([id, frames]) => [
                id, frames.map((f: any) => ({
                  ...f,
                  x: isNorm(f.x) ? denX(f.x, w) : f.x,
                  y: isNorm(f.y) ? denY(f.y, h) : f.y,
                })),
              ])
            ),
          })));
        }
        if (raw?.drawLines) {
          setDrawLines((raw.drawLines as any[]).map((dl: any) => ({
            ...dl,
            points: (dl.points as number[]).map((p: number, i: number) =>
              i % 2 === 0 ? (isNorm(p) ? denX(p, w) : p) : (isNorm(p) ? denY(p, h) : p)
            ),
          })));
        }
        setStageSize({ width: w, height: h });
      } else {
        // ── Subsequent resize: scale all current pixel positions ──────────────
        const prev = prevStageSizeRef.current;
        if (prev.width === w && prev.height === h) return;
        const scaleX = w / prev.width;
        const scaleY = h / prev.height;
        prevStageSizeRef.current = { width: w, height: h };

        setShapes(sh => sh.map(s => ({ ...s, x: s.x * scaleX, y: s.y * scaleY })));
        setSteps(sts => sts.map(step => step.map(ss => ({
          ...ss, x: ss.x * scaleX, y: ss.y * scaleY,
          wp1: ss.wp1 ? { x: ss.wp1.x * scaleX, y: ss.wp1.y * scaleY } : undefined,
          wp2: ss.wp2 ? { x: ss.wp2.x * scaleX, y: ss.wp2.y * scaleY } : undefined,
        }))));
        setFreeSteps(fss => fss.map(fs => ({
          ...fs,
          initial: fs.initial.map(ss => ({ ...ss, x: ss.x * scaleX, y: ss.y * scaleY })),
          recordings: Object.fromEntries(
            Object.entries(fs.recordings).map(([id, frames]) => [
              id, frames.map(f => ({ ...f, x: f.x * scaleX, y: f.y * scaleY })),
            ])
          ),
        })));
        setDrawLines(dls => dls.map(dl => ({
          ...dl,
          points: dl.points.map((p, i) => i % 2 === 0 ? p * scaleX : p * scaleY),
        })));
        setStageSize({ width: w, height: h });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animationRef = useRef<Konva.Animation | null>(null);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Drag handlers
  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    // In freesteps mode > step 0, dragging a player automatically starts recording and simultaneous playback
    const id = e.target.id();
    draggingShapeIdRef.current = id;
    setIsDraggingShape(true);


    const shapeData = shapesRef.current.find(s => s.id === id);

    // For goals: compute bbox offset BEFORE positioning the ghost so the transform is correct on the very first drag
    if (shapeData?.type === 'goal') {
      const node = e.target as Konva.Node;
      try {
        const bbox = node.getClientRect();
        goalAnchorOffsetRef.current = {
          x: node.x() - bbox.x,
          y: node.y() - bbox.y,
        };
        const dataUrl = node.toDataURL({ pixelRatio: 1 });
        setGoalDragImage(dataUrl);
      } catch {
        goalAnchorOffsetRef.current = { x: 0, y: 0 };
        setGoalDragImage(null);
      }
    }

    // Update ghost position via native DOM (zero React overhead)
    if (containerRef.current && dragPointerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (shapeData?.type === 'goal') {
        const ox = goalAnchorOffsetRef.current.x;
        const oy = goalAnchorOffsetRef.current.y;
        dragPointerRef.current.style.transform = `translate(-${ox}px, -${oy}px)`;
      } else {
        dragPointerRef.current.style.transform = 'translate(-50%, -50%)';
      }
      dragPointerRef.current.style.left = `${rect.left + e.target.x()}px`;
      dragPointerRef.current.style.top = `${rect.top + e.target.y()}px`;
      dragPointerRef.current.style.display = 'block';
    }
    const isRecordable = shapeData?.type === 'player-home' || shapeData?.type === 'player-away' || shapeData?.type === 'ball';

    if (mode === "freesteps" && currentFreeStepRef.current > 0 && isRecordable) {
      setIsRecording(true);
      setIsPlaying(true);
      recordStartTimeRef.current = Date.now();

      // Initialize the buffer ref for this recording session
      activeRecordingPathsRef.current = { [id]: [{ x: e.target.x(), y: e.target.y(), time: 0 }] };
      if (liveRecordingLineRef.current) {
        liveRecordingLineRef.current.points([e.target.x(), e.target.y()]);
        liveRecordingLineRef.current.stroke(shapeData?.fill ?? "white");
      }

      // If the dragged player owns a ball, also start recording the ball's path!
      const boundBalls = shapesRef.current.filter(s => s.type === 'ball' && s.ballOwner === id);
      for (const ball of boundBalls) {
        activeRecordingPathsRef.current[ball.id] = [{ x: e.target.x() + 12, y: e.target.y() + 12, time: 0 }];
      }
    }
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const id = e.target.id();

    // ZERO React state updates during drag for locked 60 FPS.
    // Ghost div position is updated via native DOM manipulation.
    if (containerRef.current && dragPointerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (draggingShapeIdRef.current && shapesRef.current.find(s => s.id === draggingShapeIdRef.current)?.type === 'goal') {
        dragPointerRef.current.style.left = `${rect.left + e.target.x()}px`;
        dragPointerRef.current.style.top = `${rect.top + e.target.y()}px`;
        // transform already set to anchor-offset in dragStart
      } else {
        dragPointerRef.current.style.left = `${rect.left + e.target.x()}px`;
        dragPointerRef.current.style.top = `${rect.top + e.target.y()}px`;
      }
    }

    // Trash hover check via ref (no setState) — supports both mouse and touch
    if (trashZoneRef.current) {
      const rect = trashZoneRef.current.getBoundingClientRect();
      const nativeEvt = e.evt as MouseEvent | TouchEvent;
      const touch = (nativeEvt as TouchEvent).changedTouches?.[0];
      const pointerX = touch ? touch.clientX : (nativeEvt as MouseEvent).clientX;
      const pointerY = touch ? touch.clientY : (nativeEvt as MouseEvent).clientY;
      isHoveringTrashRef.current = pointerX >= rect.left && pointerX <= rect.right && pointerY >= rect.top && pointerY <= rect.bottom;
    }

    // Redraw Voronoi layer to follow drag natively
    voronoiLayerRef.current?.batchDraw();

    // If dragging a player that owns a ball, move the ball along
    const draggedShape = shapesRef.current.find(s => s.id === id);
    if (draggedShape && (draggedShape.type === 'player-home' || draggedShape.type === 'player-away')) {
      const layer = layerRef.current;
      if (layer) {
        const boundBalls = shapesRef.current.filter(s => s.type === 'ball' && s.ballOwner === id);
        for (const ball of boundBalls) {
          const ballNode = layer.findOne(`#${ball.id}`);
          if (ballNode) {
            ballNode.position({ x: e.target.x() + 12, y: e.target.y() + 12 });
          }
        }
      }
    }

    // In step mode, throttle a lightweight React state update so the dashed path lines follow the drag
    if (mode === "step") {
      const now = performance.now();
      if (now - lastDragUpdateRef.current > 50) {
        setShapes(prev => prev.map(s => s.id === id ? { ...s, x: e.target.x(), y: e.target.y() } : s));
        lastDragUpdateRef.current = now;
      }
    }

    // OPTIMIZATION 2: Buffer recording geometry into a mutable Ref structure locally instead of flushing to React State deeply
    if (isRecordingRef.current && mode === "freesteps" && id === draggingShapeIdRef.current) {
      const timeNow = Date.now() - recordStartTimeRef.current;

      const pts = activeRecordingPathsRef.current[id] ?? [];
      const f: Frame = { x: e.target.x(), y: e.target.y(), time: timeNow };
      activeRecordingPathsRef.current[id] = [...pts, f];

      if (liveRecordingLineRef.current) {
        liveRecordingLineRef.current.points(activeRecordingPathsRef.current[id].flatMap(p => [p.x, p.y]));
        liveRecordingLineRef.current.getLayer()?.batchDraw();
      }

      // Also record the bound ball's position if there are any
      const boundBalls = shapesRef.current.filter(s => s.type === 'ball' && s.ballOwner === id);
      for (const ball of boundBalls) {
        const ballPts = activeRecordingPathsRef.current[ball.id] ?? [];
        activeRecordingPathsRef.current[ball.id] = [...ballPts, { x: e.target.x() + 12, y: e.target.y() + 12, time: timeNow }];
      }
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    setIsDraggingShape(false);
    isHoveringTrashRef.current = false;
    if (dragPointerRef.current) dragPointerRef.current.style.display = 'none';
    setGoalDragImage(null);
    const id = e.target.id();

    // Check if dropped in trash
    if (trashZoneRef.current) {
      const rect = trashZoneRef.current.getBoundingClientRect();
      const nativeEvt = e.evt as MouseEvent | TouchEvent;
      const touch = (nativeEvt as TouchEvent).changedTouches?.[0];
      const pointerX = touch ? touch.clientX : (nativeEvt as MouseEvent).clientX;
      const pointerY = touch ? touch.clientY : (nativeEvt as MouseEvent).clientY;
      const isInTrash = pointerX >= rect.left && pointerX <= rect.right && pointerY >= rect.top && pointerY <= rect.bottom;
      if (isInTrash) {
        setShapes(prev => prev.filter(s => s.id !== id));
        if (mode === "step") {
          setSteps(prev => prev.map(snap => snap.filter(ss => ss.id !== id)));
        }
        if (selectedShapeId === id) setSelectedShapeId(null);
        draggingShapeIdRef.current = null;
        return;
      }
    }

    let finalX = e.target.x();
    let finalY = e.target.y();

    // Clamp coordinates to prevent shape from getting lost outside the canvas (e.g., behind the toolbar)
    const margin = 20;
    if (finalX < margin) finalX = margin;
    if (finalY < margin) finalY = margin;
    if (finalX > stageSize.width - margin) finalX = stageSize.width - margin;
    if (finalY > stageSize.height - margin) finalY = Math.max(margin, stageSize.height - margin);

    // Apply the clamped position back to the Konva node explicitly
    e.target.position({ x: finalX, y: finalY });

    // ONLY flush to state at the very end of the physics simulation dragging
    setShapes(prev => {
      let next = prev.map(s => s.id === id ? { ...s, x: finalX, y: finalY } : s);

      // Auto-bind ball: if a ball is dropped overlapping a player, bind it
      const droppedShape = next.find(s => s.id === id);
      if (droppedShape?.type === 'ball') {
        const ballR = ELEMENT_RADIUS['ball'];
        const layer = layerRef.current;
        const players = next.filter(s => s.type === 'player-home' || s.type === 'player-away');
        let closestPlayer: ShapeData | null = null;
        let closestDist = Infinity;
        for (const p of players) {
          // IMPORTANT: If playing back, use live node position because player state is static
          const node = layer?.findOne(`#${p.id}`);
          const pX = node ? node.x() : p.x;
          const pY = node ? node.y() : p.y;

          const dist = Math.sqrt((finalX - pX) ** 2 + (finalY - pY) ** 2);
          const touchDist = ballR + ELEMENT_RADIUS[p.type];
          if (dist < touchDist && dist < closestDist) {
            closestDist = dist;
            closestPlayer = p;
          }
        }
        next = next.map(s => s.id === id ? { ...s, ballOwner: closestPlayer?.id ?? null } : s);
      }

      // If a player was dropped, update any bound ball's position to follow, and check for new bindings
      if (droppedShape?.type === 'player-home' || droppedShape?.type === 'player-away') {
        const playerR = ELEMENT_RADIUS[droppedShape.type];
        next = next.map(s => {
          if (s.type !== 'ball') return s;
          // If this ball is already bound to this player, just update its position to follow
          if (s.ballOwner === id) {
            return { ...s, x: finalX + 12, y: finalY + 12 };
          }
          // Check if an unbound ball now overlaps this player
          const dist = Math.sqrt((s.x - finalX) ** 2 + (s.y - finalY) ** 2);
          if (!s.ballOwner && dist < ELEMENT_RADIUS['ball'] + playerR) {
            return { ...s, ballOwner: id, x: finalX + 12, y: finalY + 12 };
          }
          return s;
        });
      }

      // If a ball was dropped, check if it should unbind because it's now far from its current owner
      // or bind to a new one (handled above for dropped ball)
      return next;
    });

    if (mode === "freesteps") {
      // If it was recording this shape (player or ball), stop everything
      if (isRecordingRef.current && id === draggingShapeIdRef.current) {
        // Add one LAST frame for the drop position so we don't lose the final movement
        const timeNow = Date.now() - recordStartTimeRef.current;
        const pts = activeRecordingPathsRef.current[id] ?? [];
        activeRecordingPathsRef.current[id] = [...pts, { x: finalX, y: finalY, time: timeNow }];

        // Also add the last frame for any bound balls being carried
        const boundBalls = shapesRef.current.filter(s => s.type === 'ball' && s.ballOwner === id);
        for (const ball of boundBalls) {
          const ballPts = activeRecordingPathsRef.current[ball.id] ?? [];
          activeRecordingPathsRef.current[ball.id] = [...ballPts, { x: finalX + 12, y: finalY + 12, time: timeNow }];
        }

        setIsRecording(false);
        setIsPlaying(false);
        // Clear the live recording path line immediately
        if (liveRecordingLineRef.current) {
          liveRecordingLineRef.current.points([]);
          liveRecordingLineRef.current.getLayer()?.batchDraw();
        }

        // Bulk-flush ALL buffered FreeSteps paths recorded from the Ref into the React engine
        // This includes the player AND any balls they were carrying
        const flushedPaths = activeRecordingPathsRef.current;
        if (Object.keys(flushedPaths).length > 0) {
          setFreeSteps(prev => {
            const next = [...prev];
            const step = next[currentFreeStepRef.current];
            if (!step) return prev;

            let mergedRecs = { ...step.recordings };
            for (const [shapeId, frames] of Object.entries(flushedPaths)) {
              if (frames && frames.length > 0) {
                const existingRecs = mergedRecs[shapeId] ?? [];
                mergedRecs[shapeId] = [...existingRecs, ...frames];
              }
            }

            next[currentFreeStepRef.current] = { ...step, recordings: mergedRecs };
            return next;
          });
        }
        // clear the buffer
        activeRecordingPathsRef.current = {};
      }

      // Update 'initial' positions if we are on step 0, since step 0 is just for placing
      if (currentFreeStepRef.current === 0) {
        setFreeSteps(prev => {
          const next = [...prev];
          const currentStep = next[0];
          if (!currentStep) return prev;
          // Update the snapshot for step 0
          const updatedInitial = shapesRef.current.map(s => ({ id: s.id, x: s.x, y: s.y, rotation: s.rotation, ballOwner: s.ballOwner }));
          next[0] = { ...currentStep, initial: updatedInitial };
          return next;
        });
      }
    }
    draggingShapeIdRef.current = null;
  };

  // Recording toggle is no longer needed physically, but keep logic if invoked elsewhere
  const handleRecordToggle = () => {
    alert("Recording is automatic when moving player (after step 1)");
  };

  const getMaxDuration = () => {
    let max = 0;
    const recs = freeStepsRef.current[currentFreeStepRef.current]?.recordings ?? {};
    Object.values(recs).forEach((fs) => {
      if (fs.length > 0) { const t = fs[fs.length - 1]!.time; if (t > max) max = t; }
    });
    return max;
  };

  // FreeSteps animation
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || mode !== "freesteps") return;
    if (isPlaying) {
      const layersToDraw: Konva.Layer[] = [layer];
      if (voronoiLayerRef.current) layersToDraw.push(voronoiLayerRef.current);

      animationRef.current = new Konva.Animation((frame) => {
        if (!frame) return;
        const recs = freeStepsRef.current[currentFreeStepRef.current]?.recordings ?? {};
        Object.entries(recs).forEach(([shapeId, frames]: [string, Frame[]]) => {
          if (shapeId === draggingShapeIdRef.current && isRecordingRef.current) return;
          const node = layer.findOne<Konva.Node>(`#${shapeId}`);
          if (!node || frames.length === 0) return;
          let curr = frames[0]!;
          for (const f of frames) { if (f.time <= frame.time) curr = f; else break; }
          node.position({ x: curr.x, y: curr.y });
          if (showTrailRef.current && !isRecordingRef.current) {
            const now = Date.now();
            if (now - (lastTrailUpdateTimeRef.current[shapeId] ?? 0) > 50) {
              lastTrailUpdateTimeRef.current[shapeId] = now;
              const sh = shapesRef.current.find(s => s.id === shapeId);
              if (!sh) return;
              setTrailLines(prev => ({ ...prev, [shapeId]: [...(prev[shapeId] ?? []), node.x(), node.y()] }));
            }
          }
        });
      }, layersToDraw);
      animationRef.current.start();
      if (!isRecordingRef.current) {
        const maxDur = getMaxDuration();
        if (maxDur > 0) {
          loopTimeoutRef.current = setTimeout(() => {
            setIsPlaying(false);
            if (currentFreeStepRef.current < freeStepsRef.current.length - 1) {
              setCurrentFreeStep(curr => curr + 1);
              setTimeout(() => setIsPlaying(true), 50);
            } else {
              if (isLooping) {
                setCurrentFreeStep(0);
                setTimeout(() => setIsPlaying(true), 50);
              } else {
                setCurrentFreeStep(0);
              }
            }
          }, maxDur + 1000);
        } else {
          // Empty step? Just skip it after 1 second
          loopTimeoutRef.current = setTimeout(() => {
            setIsPlaying(false);
            if (currentFreeStepRef.current < freeStepsRef.current.length - 1) {
              setCurrentFreeStep(curr => curr + 1);
              setTimeout(() => setIsPlaying(true), 50);
            } else {
              if (isLooping) {
                setCurrentFreeStep(0);
                setTimeout(() => setIsPlaying(true), 50);
              } else {
                setCurrentFreeStep(0);
              }
            }
          }, 1000);
        }
      }
    } else {
      animationRef.current?.stop(); setTrailLines({}); lastTrailUpdateTimeRef.current = {};
      const step = freeStepsRef.current[currentFreeStepRef.current];
      if (step) {
        const recs = step.recordings ?? {};
        Object.entries(recs).forEach(([shapeId, frames]: [string, Frame[]]) => {
          const node = layer.findOne(`#${shapeId}`);
          if (node && frames.length > 0) node.position({ x: frames[0]!.x, y: frames[0]!.y });
        });
      }
    }
    return () => { animationRef.current?.stop(); if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, mode]);

  // Sync initial shapes when currentFreeStep changes
  useEffect(() => {
    if (mode === "freesteps" && !isPlaying && !isRecording) {
      const step = freeSteps[currentFreeStep];
      if (step && step.initial) {
        setShapes(prev => prev.map(s => {
          const init = step.initial.find(ss => ss.id === s.id);
          return init ? { ...s, x: init.x, y: init.y, rotation: init.rotation } : s;
        }));
      }
    }
  }, [currentFreeStep, mode, isPlaying, isRecording]);

  useEffect(() => { if (!showTrail) setTrailLines({}); }, [showTrail]);

  // --- Voronoi sceneFunc: vector, live during drag + step animation ---
  const voronoiSceneFunc = useCallback((ctx: any) => {
    if (!showVoronoi) return;
    const layer = layerRef.current;
    const W = stageSize.width, H = stageSize.height;
    // Exclude balls and cones from Voronoi mathematically
    const players = shapesRef.current
      .filter(s => s.type === 'player-home' || s.type === 'player-away')
      .map(s => {
        const node = layer?.findOne(`#${s.id}`);
        return { x: node ? node.x() : s.x, y: node ? node.y() : s.y, fill: s.fill };
      });
    if (players.length < 2) return;
    const native: CanvasRenderingContext2D = ctx._context;
    for (const player of players) {
      let poly: VPt[] = [
        { x: -1, y: -1 }, { x: W + 1, y: -1 },
        { x: W + 1, y: H + 1 }, { x: -1, y: H + 1 },
      ];
      for (const other of players) {
        if (other === player) continue;
        poly = clipVCell(poly, player.x, player.y, other.x, other.y);
        if (poly.length === 0) break;
      }
      if (poly.length < 3) continue;
      native.beginPath();
      native.moveTo(poly[0]!.x, poly[0]!.y);
      for (let i = 1; i < poly.length; i++) native.lineTo(poly[i]!.x, poly[i]!.y);
      native.closePath();
      native.fillStyle = player.fill + '2e';
      native.fill();
      native.strokeStyle = 'rgba(255,255,255,0.6)';
      native.lineWidth = 1.5;
      native.stroke();
    }
  }, [showVoronoi, stageSize]); // reads shapesRef.current live, no shapes dep needed

  // renderShape, sharedGroupProps etc handle UI logic

  // Render shape
  const renderShape = (shape: ShapeData) => {
    const isSelected = shape.id === selectedShapeId;
    const r = ELEMENT_RADIUS[shape.type];
    const selectStroke = isSelected ? "#facc15" : "rgba(255,255,255,0.5)";
    const selectWidth = isSelected ? 3 : 1.5;
    const sharedGroupProps = {
      id: shape.id, x: shape.x, y: shape.y,
      draggable: activeTool === "select" && !isStepPlaying,
      onClick: () => {
        if (activeTool === "select") {
          setSelectedShapeId(shape.id);
        }
      },
      onTap: () => { if (activeTool === "select") setSelectedShapeId(shape.id); },
      onDragStart: handleDragStart, onDragMove: handleDragMove, onDragEnd: handleDragEnd,
    };

    if (shape.type === "ball") {
      const owner = shapes.find(s => s.id === shape.ballOwner);
      return (
        <Circle key={shape.id} {...sharedGroupProps}
          radius={r} fill={shape.fill} stroke={owner ? owner.fill : selectStroke} strokeWidth={owner ? 2 : selectWidth}
          shadowBlur={isSelected ? 8 : 0} shadowColor="#facc15"
          opacity={isDraggingShape && draggingShapeIdRef.current === shape.id ? 0 : 1}
        />
      );
    }
    if (shape.type === "cone") {
      return (
        <RegularPolygon key={shape.id} {...sharedGroupProps}
          sides={3} radius={r} fill={shape.fill} stroke={selectStroke} strokeWidth={selectWidth}
          shadowBlur={isSelected ? 8 : 0} shadowColor="#facc15"
          opacity={isDraggingShape && draggingShapeIdRef.current === shape.id ? 0 : 1}
        />
      );
    }
    if (shape.type === "goal") {
      // Sport-specific dimensions
      let goalWidth = ELEMENT_RADIUS.goal * 2;
      let goalHeight = 35;

      if (sport === "football") {
        goalWidth = ELEMENT_RADIUS.goal * 2.6;
        goalHeight = 35;
      } else if (sport === "basketball") {
        goalWidth = 100;
        goalHeight = 60;
      } else if (sport === "hockey") {
        goalWidth = ELEMENT_RADIUS.goal * 1.5;
        goalHeight = 28;
      } else if (sport === "futsal" || sport === "handball") {
        goalWidth = ELEMENT_RADIUS.goal * 2.5;
        goalHeight = 35;
      }

      const rotation = shape.rotation ?? 0;

      // The handle position in the group's local space (top-center, above goal)
      const handleLocalX = 0;
      const handleLocalY = sport === "basketball" ? -55 : -goalHeight - 30;

      return (
        <Group
          key={shape.id}
          {...sharedGroupProps}
          rotation={rotation}
          opacity={isDraggingShape && draggingShapeIdRef.current === shape.id ? 0 : 1}
        >
          {sport === "basketball" ? (
            // Basketball Hoop (Top-down)
            <>
              {/* hit area */}
              <Rect x={-goalWidth / 2} y={-8} width={goalWidth} height={goalHeight + 10} fill="transparent" />
              {/* Backboard */}
              <Rect x={-50} y={-4} width={100} height={10} fill="#000000" stroke="#333" strokeWidth={2} />
              {/* Fixing bar */}
              <Rect x={-4} y={6} width={8} height={16} fill="#666" />
              {/* Rim/Hoop */}
              <Circle x={0} y={36} radius={18} stroke="#f97316" strokeWidth={5} />
              {/* Net (Top view represents the rim density) */}
              <Circle x={0} y={36} radius={14} stroke="rgba(255,255,255,0.3)" strokeWidth={2} dash={[4, 4]} />
            </>
          ) : sport === "hockey" ? (
            // D-shaped goal: white smooth arc (net), orange straight goal line
            <>
              {/* Transparent hit-area so the Group can be dragged and clicked */}
              <Rect x={-goalWidth / 2 - 5} y={-goalHeight * 2.5} width={goalWidth + 10} height={goalHeight * 2.5 + 5} fill="transparent" />
              {/* Black outline for the D arc */}
              <Shape
                sceneFunc={(ctx, konvaShape) => {
                  const halfW = goalWidth / 2;
                  const depth = goalHeight * 1.7;
                  ctx.beginPath();
                  ctx.moveTo(-halfW, 0);
                  // Cubic bezier: control points go straight up from each endpoint → smooth arch
                  ctx.bezierCurveTo(-halfW, -depth, halfW, -depth, halfW, 0);
                  ctx.fillStrokeShape(konvaShape);
                }}
                fill="transparent"
                stroke="black"
                strokeWidth={7}
                listening={false}
              />
              {/* White D arc (net area) */}
              <Shape
                sceneFunc={(ctx, konvaShape) => {
                  const halfW = goalWidth / 2;
                  const depth = goalHeight * 1.7;
                  ctx.beginPath();
                  ctx.moveTo(-halfW, 0);
                  ctx.bezierCurveTo(-halfW, -depth, halfW, -depth, halfW, 0);
                  ctx.fillStrokeShape(konvaShape);
                }}
                fill="rgba(255,255,255,0.08)"
                stroke="white"
                strokeWidth={4}
                listening={false}
              />
              {/* Orange goal line (flat side) — with black outline */}
              <Line points={[-goalWidth / 2, 0, goalWidth / 2, 0]} stroke="black" strokeWidth={7} lineCap="round" listening={false} />
              <Line points={[-goalWidth / 2, 0, goalWidth / 2, 0]} stroke="#f97316" strokeWidth={5} lineCap="round" listening={false} />
            </>
          ) : sport === "futsal" || sport === "handball" ? (
            // Futsal / Handball: white+red striped posts, thin white goal line
            <>
              {/* Transparent hit-area so the Group can be dragged and clicked */}
              <Rect x={-goalWidth / 2 - 5} y={-goalHeight - 5} width={goalWidth + 10} height={goalHeight + 10} fill="transparent" />
              {/* Net area fill */}
              <Rect
                x={-goalWidth / 2}
                y={-goalHeight}
                width={goalWidth}
                height={goalHeight}
                fill="rgba(255,255,255,0.05)"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1}
                dash={[4, 4]}
                listening={false}
              />
              {/* Black outline on the 3 posts */}
              <Line points={[-goalWidth / 2, 0, -goalWidth / 2, -goalHeight]} stroke="black" strokeWidth={7} lineCap="square" listening={false} />
              <Line points={[goalWidth / 2, 0, goalWidth / 2, -goalHeight]} stroke="black" strokeWidth={7} lineCap="square" listening={false} />
              <Line points={[-goalWidth / 2, -goalHeight, goalWidth / 2, -goalHeight]} stroke="black" strokeWidth={7} lineCap="square" listening={false} />
              {/* White base on posts */}
              <Line points={[-goalWidth / 2, 0, -goalWidth / 2, -goalHeight]} stroke="white" strokeWidth={5} lineCap="square" listening={false} />
              <Line points={[goalWidth / 2, 0, goalWidth / 2, -goalHeight]} stroke="white" strokeWidth={5} lineCap="square" listening={false} />
              <Line points={[-goalWidth / 2, -goalHeight, goalWidth / 2, -goalHeight]} stroke="white" strokeWidth={5} lineCap="square" listening={false} />
              {/* Red dashes on top of posts */}
              <Line points={[-goalWidth / 2, 0, -goalWidth / 2, -goalHeight]} stroke="#ef4444" strokeWidth={5} dash={[8, 8]} listening={false} />
              <Line points={[goalWidth / 2, 0, goalWidth / 2, -goalHeight]} stroke="#ef4444" strokeWidth={5} dash={[8, 8]} listening={false} />
              <Line points={[-goalWidth / 2, -goalHeight, goalWidth / 2, -goalHeight]} stroke="#ef4444" strokeWidth={5} dash={[8, 8]} listening={false} />
              {/* Goal opening line — thin, white */}
              <Line points={[-goalWidth / 2, 0, goalWidth / 2, 0]} stroke="black" strokeWidth={3} lineCap="round" listening={false} />
              <Line points={[-goalWidth / 2, 0, goalWidth / 2, 0]} stroke="white" strokeWidth={1.5} lineCap="round" listening={false} />
            </>
          ) : (
            // Football / other sports: rectangular goal with black outline
            <>
              {/* Transparent hit-area so the Group can be dragged and clicked */}
              <Rect x={-goalWidth / 2 - 5} y={-goalHeight - 5} width={goalWidth + 10} height={goalHeight + 10} fill="transparent" />
              {/* Net area */}
              <Rect
                x={-goalWidth / 2}
                y={-goalHeight}
                width={goalWidth}
                height={goalHeight}
                fill="rgba(255,255,255,0.05)"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1}
                dash={[4, 4]}
                listening={false}
              />
              {/* Black outline on the 3 posts */}
              <Line points={[-goalWidth / 2, 0, -goalWidth / 2, -goalHeight, goalWidth / 2, -goalHeight, goalWidth / 2, 0]} stroke="black" strokeWidth={7} lineCap="square" lineJoin="round" listening={false} />
              {/* White posts */}
              <Line points={[-goalWidth / 2, 0, -goalWidth / 2, -goalHeight, goalWidth / 2, -goalHeight, goalWidth / 2, 0]} stroke="white" strokeWidth={5} lineCap="round" lineJoin="round" listening={false} />
              {/* Goal line — thin white */}
              <Line points={[-goalWidth / 2, 0, goalWidth / 2, 0]} stroke="black" strokeWidth={3} lineCap="round" listening={false} />
              <Line points={[-goalWidth / 2, 0, goalWidth / 2, 0]} stroke="white" strokeWidth={1.5} lineCap="round" listening={false} />
            </>
          )}
          {isSelected && (
            <Rect
              x={-goalWidth / 2 - 10}
              y={sport === "basketball" ? -10 : -goalHeight - 5}
              width={goalWidth + 20}
              height={(sport === "basketball" ? 68 : goalHeight) + 10}
              stroke="#facc15"
              strokeWidth={2}
              dash={[4, 4]}
              cornerRadius={4}
              listening={false}
            />
          )}
          {isSelected && (
            <>
              {/* Line from goal center to rotation handle */}
              <Line
                points={[0, handleLocalY + 15, handleLocalX, handleLocalY]}
                stroke="#facc15"
                strokeWidth={1}
                dash={[3, 3]}
                listening={false}
              />
              {/* Rotation handle – freely draggable */}
              <Circle
                x={handleLocalX}
                y={handleLocalY}
                radius={12}
                fill="#facc15"
                draggable
                onMouseDown={(e) => { e.cancelBubble = true; }}
                onDragMove={(e) => {
                  e.cancelBubble = true;
                  const group = e.target.getParent();
                  if (!group) return;
                  // Handle pos in stage coords
                  const hx = e.target.getAbsolutePosition().x;
                  const hy = e.target.getAbsolutePosition().y;
                  // Group (goal) pos in stage coords
                  const gx = group.x();
                  const gy = group.y();
                  // Angle from goal center to handle in stage space
                  const angleRad = Math.atan2(hy - gy, hx - gx);
                  const angleDeg = (angleRad * 180) / Math.PI + 90; // +90 so 0° = pointing up
                  setShapes(prev => prev.map(s => {
                    if (s.id !== shape.id) return s;
                    return { ...s, rotation: angleDeg };
                  }));
                  // Keep the handle visually pinned to handle local position
                  // (reset it so the group rotation is the source of truth, not the drag)
                  e.target.position({ x: handleLocalX, y: handleLocalY });
                }}
                onDragEnd={(e) => {
                  e.cancelBubble = true;
                  e.target.position({ x: handleLocalX, y: handleLocalY });
                  // Persist rotation in current step
                  if (mode === "step") {
                    setSteps(prev => {
                      const newSteps = [...prev];
                      const snap = [...(newSteps[currentStep] ?? [])];
                      const idx = snap.findIndex(si => si.id === shape.id);
                      const currentRotation = shapesRef.current.find(s => s.id === shape.id)?.rotation ?? 0;
                      if (idx !== -1) snap[idx] = { ...snap[idx]!, rotation: currentRotation };
                      newSteps[currentStep] = snap;
                      return newSteps;
                    });
                  }
                }}
              />
              <Text
                x={handleLocalX - 6}
                y={handleLocalY - 8}
                text="↻"
                fontSize={16}
                fill="black"
                listening={false}
              />
            </>
          )}
        </Group>
      );
    }

    return (
      <Group key={shape.id} {...sharedGroupProps} opacity={isDraggingShape && draggingShapeIdRef.current === shape.id ? 0 : 1}>
        <Circle x={0} y={0} radius={r} fill={shape.fill} stroke={selectStroke} strokeWidth={selectWidth}
          shadowBlur={isSelected ? 10 : 0} shadowColor="#facc15" />
        <Text x={-r} y={-r} width={r * 2} height={r * 2} text={shape.label ?? (shape.type === "player-away" ? "X" : "")}
          fontSize={r} fontFamily="Arial" fontStyle="bold" fill="white" align="center" verticalAlign="middle" listening={false} />
      </Group>
    );
  };

  const confirmSwitchToStep = useCallback(() => {
    // Only keep current positions. Discard recordings.
    const initialSnap = shapes.map(s => ({ id: s.id, x: s.x, y: s.y, rotation: s.rotation }));
    setSteps([initialSnap]);

    setMode("step");
    setCurrentStep(0);
    setPendingModeSwitch(null);
    stopStepPlay();
    setIsPlaying(false);
    setIsRecording(false);
    setTrailLines({});
  }, [shapes, stopStepPlay]);

  const confirmSwitchToFreeSteps = useCallback(() => {
    // Only keep current positions. Discard recorded steps.
    const initialSnap = shapes.map(s => ({ id: s.id, x: s.x, y: s.y, rotation: s.rotation }));
    setFreeSteps([{ initial: initialSnap, recordings: {} }]);

    setMode("freesteps");
    setCurrentFreeStep(0);
    setPendingModeSwitch(null);
    stopStepPlay();
    setIsPlaying(false);
    setIsRecording(false);
    setTrailLines({});
  }, [shapes, stopStepPlay]);

  const detenerStepPlay = useCallback(() => {
    stopStepPlay();
    goToStep(0);
  }, [stopStepPlay, goToStep]);

  // ─── JSX ────────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className="flex flex-col overflow-hidden bg-gray-950 text-white select-none"
        style={{
          zoom: uiScale,
          width: `${Math.round(Math.max(490, windowSize.w) / uiScale)}px`,
          height: `${Math.round(Math.max(340, windowSize.h) / uiScale)}px`,
        }}
      >

        {/* Mode Switch Popup Modal */}
        {pendingModeSwitch !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="rounded-xl border border-white/10 bg-gray-900 p-6 shadow-2xl w-[400px]">
              <h3 className="mb-2 text-lg font-bold">⚠️ Warning</h3>
              <p className="mb-6 text-sm text-white/70 text-balance">
                Changing mode will delete all recorded steps. Only the current player positions will be kept. Proceed?
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setPendingModeSwitch(null)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-white/10 transition-colors">
                  Cancel
                </button>
                <button onClick={() => {
                  if (pendingModeSwitch === "step") confirmSwitchToStep();
                  else if (pendingModeSwitch === "freesteps") confirmSwitchToFreeSteps();
                }}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500 transition-colors shadow-lg">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOP BAR */}
        <div className="flex-shrink-0 border-b border-white/10 bg-gray-900/95 backdrop-blur">
          {/* Main row */}
          <div className="flex h-12 items-center gap-3 px-3">
            <Link href="/dashboard" className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors">
              ← Dashboard
            </Link>
            <div className="h-4 w-px bg-white/10" />
            {/* Mode toggle */}
            <div className="flex rounded-lg bg-gray-800 p-0.5">
              <button onClick={() => {
                if (mode === "step") return;
                if (freeSteps.length > 1) {
                  setPendingModeSwitch("step");
                } else {
                  confirmSwitchToStep();
                }
              }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-colors ${mode === "step" ? "bg-purple-600 text-white shadow" : "text-white/50 hover:text-white"}`}>
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path d="M4 3h2v10H4zM10 3h2v10h-2z" /></svg>
                Steps
              </button>
              <button onClick={() => {
                if (mode === "freesteps") return;
                if (steps.length > 1) {
                  setPendingModeSwitch("freesteps");
                } else {
                  confirmSwitchToFreeSteps();
                }
              }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-colors ${mode === "freesteps" ? "bg-blue-600 text-white shadow" : "text-white/50 hover:text-white"}`}>
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path d="M4 3l9 5-9 5V3z" /></svg>
                FreeSteps
              </button>
            </div>

            {/* Step timeline inline (for both modes) */}
            <div className="flex items-center gap-1 overflow-x-auto overflow-y-hidden min-w-0" style={{ maxWidth: '420px', scrollbarWidth: 'none' }}>
              <div className="h-4 w-px bg-white/10 flex-shrink-0 mr-1" />
              {(mode === "step" ? steps : freeSteps).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (mode === "step") { if (!isStepPlaying) goToStep(idx); }
                    else { if (!isPlaying) setCurrentFreeStep(idx); }
                  }}
                  disabled={mode === "step" ? isStepPlaying : isPlaying}
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
                onClick={() => {
                  if (mode === "step") addNextStep();
                  else {
                    const currIdx = currentFreeStepRef.current;
                    const latestShapes = shapesRef.current;

                    setFreeSteps(prev => {
                      const currentStepData = prev[currIdx];
                      const newInitial = latestShapes.map(s => {
                        const recs = currentStepData?.recordings[s.id];
                        if (recs && recs.length > 0) {
                          const lastFrame = recs[recs.length - 1];
                          return { id: s.id, x: lastFrame!.x, y: lastFrame!.y, ballOwner: s.ballOwner };
                        }
                        return { id: s.id, x: s.x, y: s.y, ballOwner: s.ballOwner };
                      });
                      return [...prev, { initial: newInitial, recordings: {} }];
                    });

                    // Also physically move shapes so they don't visually snap back
                    setShapes(latestShapes.map(s => {
                      const currentStepData = freeStepsRef.current[currIdx];
                      const recs = currentStepData?.recordings[s.id];
                      if (recs && recs.length > 0) {
                        const lastFrame = recs[recs.length - 1];
                        return { ...s, x: lastFrame!.x, y: lastFrame!.y, ballOwner: s.ballOwner };
                      }
                      return s;
                    }));

                    setCurrentFreeStep(freeStepsRef.current.length);
                  }
                }}
                disabled={mode === "step" ? isStepPlaying : isPlaying}
                title="Añadir step"
                className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded border border-dashed border-white/20 text-white/30 hover:border-purple-400/60 hover:text-purple-400 disabled:opacity-30 transition-all text-xs font-bold"
              >
                +
              </button>
              {(mode === "step" ? steps.length : freeSteps.length) > 1 && (
                <>
                  <button
                    onClick={() => {
                      if (mode === "step") {
                        setSteps(prev => {
                          const ns = prev.slice(0, -1);
                          if (currentStep >= ns.length) goToStep(ns.length - 1);
                          return ns;
                        });
                      } else {
                        setFreeSteps(prev => {
                          const ns = prev.slice(0, -1);
                          if (currentFreeStep >= ns.length) setCurrentFreeStep(Math.max(0, ns.length - 1));
                          return ns;
                        });
                      }
                    }}
                    disabled={mode === "step" ? isStepPlaying : isPlaying}
                    title="Eliminar último step"
                    className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-gray-800 text-white/20 hover:border-orange-500/50 hover:text-orange-400 disabled:opacity-30 transition-all text-[10px]"
                  >
                    ⏮🗑
                  </button>
                </>
              )}
            </div>

            <div className="ml-auto flex items-center gap-3">
              {/* Playback Controls (Right side of top bar) */}
              <div className="flex items-center gap-1 border-r border-white/10 pr-3">
                {mode === "freesteps" && (
                  <>
                    <HeaderCtrlBtn active={isPlaying && !isRecording} onClick={() => setIsPlaying(true)} disabled={isPlaying || isRecording} title="Play">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path d="M3 2.5l10 5.5-10 5.5V2.5z" /></svg>
                    </HeaderCtrlBtn>
                    <HeaderCtrlBtn active={false} onClick={() => setIsPlaying(false)} disabled={!isPlaying || isRecording} title="Pausa">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>
                    </HeaderCtrlBtn>
                    <HeaderCtrlBtn active={false} onClick={() => { setIsPlaying(false); setCurrentFreeStep(0); }} disabled={isRecording} title="Detener">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><rect x="3" y="3" width="10" height="10" rx="1.5" /></svg>
                    </HeaderCtrlBtn>
                    <HeaderCtrlBtn active={isLooping} onClick={() => setIsLooping(l => !l)} title="Reproducir en bucle">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5"><path d="M2 8a6 6 0 016-6 6 6 0 015.5 3.5M14 8a6 6 0 01-6 6 6 6 0 01-5.5-3.5" strokeLinecap="round" /></svg>
                    </HeaderCtrlBtn>
                    <div className="mx-1 h-4 w-px bg-white/10" />
                    <HeaderCtrlBtn active={showPath} onClick={() => setShowPath(p => !p)} title="Mostrar recorrido">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5" strokeLinecap="round"><path d="M2 12 C5 12 5 4 8 4 C11 4 11 12 14 12" /></svg>
                    </HeaderCtrlBtn>
                    <HeaderCtrlBtn active={showTrail} onClick={() => setShowTrail(t => !t)} title="Mostrar estela">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><circle cx="8" cy="8" r="2.5" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" /></svg>
                    </HeaderCtrlBtn>
                  </>
                )}

                {mode === "step" && (
                   <>
                    <HeaderCtrlBtn active={isStepPlaying} danger={false} onClick={startStepPlay}
                      disabled={isStepPlaying || steps.length < 2}
                      title={"Play steps"}>
                      {/* Play */}
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path d="M3 2.5l10 5.5-10 5.5V2.5z" /></svg>
                    </HeaderCtrlBtn>
                    <HeaderCtrlBtn active={false} danger={false} onClick={pauseStepPlay}
                      disabled={!isStepPlaying}
                      title={"Pause"}>
                      {/* Pause */}
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>
                    </HeaderCtrlBtn>
                    <HeaderCtrlBtn active={false} danger={false} onClick={detenerStepPlay}
                      title={"Stop"}>
                      {/* Stop */}
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><rect x="3" y="3" width="10" height="10" rx="1.5" /></svg>
                    </HeaderCtrlBtn>
                    <HeaderCtrlBtn active={isLooping} onClick={() => setIsLooping(l => !l)} title="Loop playback">
                      {/* Loop */}
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5"><path d="M2 8a6 6 0 016-6 6 6 0 015.5 3.5M14 8a6 6 0 01-6 6 6 6 0 01-5.5-3.5" strokeLinecap="round" /><path d="M12 5.5l1.5-3 1.5 3" fill="currentColor" stroke="none" /><path d="M2.5 10.5 1 13.5l-1-3" fill="currentColor" stroke="none" /></svg>
                    </HeaderCtrlBtn>
                    <div className="flex items-center gap-1.5 ml-2 mr-1" title="Playback speed">
                      {/* Single triangle = slow */}
                      <svg viewBox="0 0 10 12" fill="currentColor" className="h-2.5 w-2.5 opacity-60"><path d="M1 1l8 5-8 5V1z" /></svg>
                      <input
                        type="range" min="0.2" max="3" step="0.1"
                        value={3.2 - stepPlaySpeed}
                        onChange={e => setStepPlaySpeed(3.2 - Number(e.target.value))}
                        className="w-16 h-1.5 appearance-none bg-gray-700 outline-none opacity-70 transition-opacity hover:opacity-100 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white cursor-pointer"
                      />
                      {/* Triple triangle = fast */}
                      <svg viewBox="0 0 18 12" fill="currentColor" className="h-2.5 w-3 opacity-60"><path d="M0 0l5 6-5 6V0z" /><path d="M6 0l5 6-5 6V0z" /><path d="M12 0l5 6-5 6V0z" /></svg>
                    </div>
                    <div className="mx-1 h-4 w-px bg-white/10" />
                    <HeaderCtrlBtn active={showTrail} onClick={() => setShowTrail(t => !t)} title="Show trail">
                      {/* Trail/sparkle */}
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><circle cx="8" cy="8" r="2.5" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" /></svg>
                    </HeaderCtrlBtn>
                    <div className="mx-1 h-4 w-px bg-white/10" />
                    <HeaderCtrlBtn active={autoAdvance} onClick={() => setAutoAdvance(a => !a)} title="Auto-advance between steps">
                      {/* Skip forward */}
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path d="M2 3l7 5-7 5V3zM13 3h-1.5v10H13V3z" /></svg>
                    </HeaderCtrlBtn>
                  </>
                )}
                <div className="mx-1 h-4 w-px bg-white/10" />
                <HeaderCtrlBtn active={showVoronoi} onClick={() => setShowVoronoi(v => !v)} title="Voronoi diagram">
                  {/* Hexagon/voronoi */}
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5"><polygon points="8,2 14,5.5 14,10.5 8,14 2,10.5 2,5.5" /></svg>
                </HeaderCtrlBtn>
              </div>

              {selectedShapeId && !isStepPlaying && (
                <div className="flex items-center gap-2">
                  {(() => {
                    const selShape = shapes.find(s => s.id === selectedShapeId);
                    if (selShape?.type === "player-home" || selShape?.type === "player-away") {
                      return (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10">
                          <span className="text-[10px] uppercase font-bold text-white/40">Label</span>
                          <input
                            type="text"
                            maxLength={3}
                            className="w-10 rounded border border-white/20 bg-gray-950 px-1 py-0.5 text-center text-xs font-bold text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            value={selShape.label ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setShapes(prev => prev.map(s => s.id === selectedShapeId ? { ...s, label: val } : s));
                            }}
                          />
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <button onClick={deleteSelected} className="flex items-center gap-1 rounded px-2 py-1 text-xs bg-red-800 hover:bg-red-700 transition-colors">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path d="M6 3h4a1 1 0 00-4 0zm-2 0a3 3 0 016 0h3a.5.5 0 010 1h-.5l-.8 8.4A2 2 0 0110.2 14H5.8a2 2 0 01-2-1.6L3 4H2.5a.5.5 0 010-1H4zm1.5 3a.5.5 0 011 0v5a.5.5 0 01-1 0V6zm3 0a.5.5 0 011 0v5a.5.5 0 01-1 0V6z" /></svg>
                    Del
                  </button>
                </div>
              )}
              <button onClick={() => handleSaveBoard(drawLines)} disabled={saveMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-1.5 text-xs font-bold hover:bg-green-600 disabled:opacity-50 transition-colors">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path d="M2 3a1 1 0 011-1h8l3 3v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm5 8a2 2 0 104 0 2 2 0 00-4 0zM4 4h6V2H4v2z" /></svg>
                {saveMutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>


        </div>

        {/* MAIN */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT SIDEBAR */}
          <div className="relative flex w-14 flex-shrink-0 flex-col items-center border-r border-white/10 bg-gray-900/90 py-2">
            <div className="mt-8 flex flex-col gap-2">

              {/* Select / Cursor Arrow */}
              <SidebarBtn active={activeTool === "select"} onClick={() => { setActiveTool("select"); setShowShapesPanel(false); }} title="Select">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M4 2l12 7.5L11 11l-2.5 6L4 2z" /></svg>
              </SidebarBtn>

              {/* Pen */}
              <SidebarBtn active={activeTool === "pen"} onClick={() => { setActiveTool("pen"); setShowShapesPanel(false); }} title="Draw">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-2.207 2.207L3 13.172V16h2.828l8.38-8.379-2.83-2.828z" /></svg>
              </SidebarBtn>

              {/* Eraser */}
              <SidebarBtn active={activeTool === "eraser"} onClick={() => { setActiveTool("eraser"); setShowShapesPanel(false); }} title="Erase">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M14.121 3.879A3 3 0 0016 6v.172a3 3 0 01-.879 2.122L9 14.414 5.586 11 12 4.586l2.121-2.121.707.707zM3.7 13.3l-1 1a1 1 0 000 1.414l1.586 1.586a1 1 0 001.414 0l1-1L3.7 13.3zM3 2h14v1H3z" opacity="0" /><path d="M17 4.5a2.5 2.5 0 00-4.243-1.768l-7.5 7.5a1 1 0 000 1.414l3.6 3.6a1 1 0 001.414 0l7.5-7.5A2.5 2.5 0 0017 6.5V4.5zM3 15.5h5M2 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" /></svg>
              </SidebarBtn>

              <SidebarDivider />

              {/* Clear All */}
              <SidebarBtn active={false} onClick={() => { setDrawLines([]); }} title="Clear all">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" strokeLinecap="round"><path d="M4 7h12M5 7l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9M8 7V4a1 1 0 011-1h2a1 1 0 011 1v3" /></svg>
              </SidebarBtn>

              <SidebarDivider />

              {/* Shapes Button — shows active icon of current shape tool */}
              <div className="relative">
                <SidebarBtn
                  active={showShapesPanel || ["line", "arrow", "rect", "circle"].includes(activeTool)}
                  onClick={() => setShowShapesPanel(p => !p)}
                  title="Shapes">
                  {activeTool === "line" ? (
                    <svg viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2" className="h-4 w-4" strokeLinecap="round"><line x1="3" y1="17" x2="17" y2="3" /></svg>
                  ) : activeTool === "arrow" ? (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="17" x2="17" y2="3" /><polyline points="10,3 17,3 17,10" /></svg>
                  ) : activeTool === "rect" ? (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><rect x="3" y="5" width="14" height="10" rx="1" /></svg>
                  ) : activeTool === "circle" ? (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><ellipse cx="10" cy="10" rx="7" ry="7" /></svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><rect x="2" y="11" width="6" height="7" rx="1" /><ellipse cx="14" cy="7" rx="4" ry="4" /><line x1="2" y1="4" x2="9" y2="9" strokeLinecap="round" /></svg>
                  )}
                </SidebarBtn>

                {/* Shapes Panel flyout */}
                {showShapesPanel && (
                  <div className="absolute left-full top-0 ml-2 z-50 flex flex-col gap-1 rounded-xl border border-white/10 bg-gray-900 p-1.5 shadow-xl">
                    {[
                      { tool: "line" as ToolType, label: "Line", icon: <svg viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2" className="h-4 w-4" strokeLinecap="round"><line x1="3" y1="17" x2="17" y2="3" /></svg> },
                      { tool: "arrow" as ToolType, label: "Arrow", icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="17" x2="17" y2="3" /><polyline points="10,3 17,3 17,10" /></svg> },
                      { tool: "rect" as ToolType, label: "Rect", icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><rect x="3" y="5" width="14" height="10" rx="1" /></svg> },
                      { tool: "circle" as ToolType, label: "Circle", icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><ellipse cx="10" cy="10" rx="7" ry="7" /></svg> },
                    ].map(({ tool, label, icon }) => (
                      <button key={tool} onClick={() => { setActiveTool(tool); setShowShapesPanel(false); }}
                        title={label}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-all ${activeTool === tool ? "bg-blue-600 text-white shadow" : "text-white/60 hover:bg-gray-700 hover:text-white"
                          }`}>
                        {icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Draw tool options (color + size) */}
            {isDrawTool(activeTool) && (
              <>
                <SidebarDivider />
                {activeTool !== "eraser" && (
                  <div className="flex flex-col items-center gap-1.5 mb-2 mt-2">
                    {[
                      "#000000", "#ffffff", "#ef4444", "#3b82f6", "#22c55e",
                    ].map(color => (
                      <button key={color} onClick={() => setPenColor(color)}
                        className={`h-5 w-5 rounded-full border-2 shadow transition-transform hover:scale-110 ${penColor === color ? "border-white scale-110" : "border-white/20"}`}
                        style={{ background: color }} title={color} />
                    ))}
                  </div>
                )}
                <div className="mt-1 flex flex-col gap-1">
                  {([2, 4, 8] as const).map(s => (
                    <button key={s} onClick={() => activeTool !== "eraser" ? setPenSize(s) : setEraserSize(s)}
                      className={`h-6 w-10 rounded text-[9px] font-bold transition-colors ${(activeTool !== "eraser" ? penSize : eraserSize) === s ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}`}>
                      {s === 2 ? "S" : s === 4 ? "M" : "L"}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="mt-auto flex flex-col items-center gap-1 pb-1">
              {isRecording && <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" title="Grabando" />}
              {isPlaying && !isRecording && <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" title="Reproduciendo" />}
              {isStepPlaying && <div className="h-2 w-2 animate-pulse rounded-full bg-purple-400" title="Reproduciendo steps" />}
              {selectedShapeId && <div className="h-2 w-2 rounded-full bg-yellow-400" title="Seleccionado" />}
            </div>
          </div>

          {/* STAGE */}
          <div ref={containerRef} className="relative flex-1 overflow-hidden"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault();
              const type = e.dataTransfer.getData("type") as ElementType;
              if (type && ["player-home", "player-away", "ball", "cone", "goal"].includes(type)) {
                if (containerRef.current) {
                  const rect = containerRef.current.getBoundingClientRect();
                  const dropX = e.clientX - rect.left;
                  const dropY = e.clientY - rect.top;
                  addElement(type, dropX, dropY);
                }
              }
            }}
            style={{
              touchAction: "none",
              cursor: activeTool === "pen"
                ? `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`)}") 2 22, crosshair`
                : activeTool === "eraser"
                  ? `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${eraserSize * 10}" height="${eraserSize * 10}" viewBox="0 0 ${eraserSize * 10} ${eraserSize * 10}"><circle cx="${eraserSize * 5}" cy="${eraserSize * 5}" r="${(eraserSize * 5) - 1}" fill="transparent" stroke="black" stroke-width="1"/></svg>`)}") ${eraserSize * 5} ${eraserSize * 5}, cell`
                  : "default"
            }}>
            
            {/* NOTIFICACIÓ POPUP */}
            {notification && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-full shadow-xl border border-white/20 animate-bounce">
                {notification}
              </div>
            )}

            {/* DOM Ghost for visually overlapping the UI cleanly — positioned via native DOM ref */}
            <div ref={dragPointerRef} className="fixed pointer-events-none z-[100]" style={{ display: 'none', transform: 'translate(-50%, -50%)' }}>
              {isDraggingShape && draggingShapeIdRef.current && (() => {
                const shape = shapes.find(s => s.id === draggingShapeIdRef.current);
                if (!shape) return null;
                const r = ELEMENT_RADIUS[shape.type];
                const size = r * 2;
                if (shape.type === "player-home" || shape.type === "player-away") {
                  return (
                    <div style={{ width: size, height: size, backgroundColor: shape.fill, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: r, fontFamily: 'Arial' }}>
                      {shape.label ?? (shape.type === "player-away" ? "X" : "")}
                    </div>
                  );
                } else if (shape.type === "ball") {
                  return <div style={{ width: size, height: size, backgroundColor: shape.fill, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.5)' }} />;
                } else if (shape.type === "cone") {
                  return (
                    <div style={{
                      width: 0, height: 0,
                      borderLeft: `${r}px solid transparent`,
                      borderRight: `${r}px solid transparent`,
                      borderBottom: `${r * 1.732}px solid ${shape.fill}`,
                    }} />
                  );
                } else if (shape.type === "goal") {
                  // Pixel-perfect screenshot captured from Konva on dragStart
                  return goalDragImage ? (
                    <img src={goalDragImage} alt="" style={{ display: 'block', maxWidth: '300px' }} />
                  ) : null;
                }
                return null;
              })()}
            </div>

            {stageSize.width > 0 && stageSize.height > 0 && (
              <Stage width={stageSize.width} height={stageSize.height}
                onMouseDown={(e) => handleStagePointerDown(e, setSelectedShapeId)} 
                onMouseMove={handleStagePointerMove} 
                onMouseUp={handleStagePointerUp}
                onTouchStart={(e) => handleStagePointerDown(e, setSelectedShapeId)} 
                onTouchMove={handleStagePointerMove} 
                onTouchEnd={handleStagePointerUp}
                onClick={(e) => { if (e.target === e.target.getStage()) setSelectedShapeId(null); }}
                onTap={(e) => { if (e.target === e.target.getStage()) setSelectedShapeId(null); }}>

                <Layer><BackgroundImage width={stageSize.width} height={stageSize.height} sport={sport} /></Layer>

                {/* Freehand lines and geometry */}
                <Layer>
                  {drawLines.map(item => {
                    const type = item.type ?? (item.isEraser ? "eraser" : "pen");
                    if (type === "pen" || type === "eraser") {
                      return <Line key={item.id} points={item.points} stroke={item.color}
                        strokeWidth={item.size} tension={0.4} lineCap="round" lineJoin="round"
                        globalCompositeOperation={item.isEraser ? "destination-out" : "source-over"} />;
                    }
                    if (type === "line" || type === "arrow") {
                      const Component = type === "arrow" ? Arrow : Line;
                      return <Component key={item.id} points={item.points} stroke={item.color}
                        strokeWidth={item.size} lineCap="round" lineJoin="round" pointerLength={type === 'arrow' ? item.size * 3 : undefined} pointerWidth={type === 'arrow' ? item.size * 3 : undefined} />;
                    }
                    if (type === "rect") {
                      const [x1, y1, x2, y2] = item.points;
                      return <Rect key={item.id} x={Math.min(x1!, x2!)} y={Math.min(y1!, y2!)}
                        width={Math.abs(x2! - x1!)} height={Math.abs(y2! - y1!)}
                        stroke={item.color} strokeWidth={item.size} />;
                    }
                    if (type === "circle") {
                      const [x1, y1, x2, y2] = item.points;
                      const r = Math.sqrt(Math.pow(x2! - x1!, 2) + Math.pow(y2! - y1!, 2));
                      return <Circle key={item.id} x={x1} y={y1} radius={r} stroke={item.color} strokeWidth={item.size} />;
                    }
                    return null;
                  })}
                  {isDrawing && currentLinePoints.length >= 4 && (() => {
                    const type = activeTool;
                    if (type === "pen" || type === "eraser") {
                      return <Line points={currentLinePoints} stroke={type === "eraser" ? "#000000" : penColor}
                        strokeWidth={type === "eraser" ? eraserSize * 10 : penSize} tension={0.4} lineCap="round" lineJoin="round"
                        globalCompositeOperation={type === "eraser" ? "destination-out" : "source-over"} />;
                    }
                    if (type === "line" || type === "arrow") {
                      const Component = type === "arrow" ? Arrow : Line;
                      return <Component points={currentLinePoints} stroke={penColor}
                        strokeWidth={penSize} lineCap="round" lineJoin="round" pointerLength={type === 'arrow' ? penSize * 3 : undefined} pointerWidth={type === 'arrow' ? penSize * 3 : undefined} />;
                    }
                    if (type === "rect") {
                      const [x1, y1, x2, y2] = currentLinePoints;
                      return <Rect x={Math.min(x1!, x2!)} y={Math.min(y1!, y2!)}
                        width={Math.abs(x2! - x1!)} height={Math.abs(y2! - y1!)}
                        stroke={penColor} strokeWidth={penSize} />;
                    }
                    if (type === "circle") {
                      const [x1, y1, x2, y2] = currentLinePoints;
                      const r = Math.sqrt(Math.pow(x2! - x1!, 2) + Math.pow(y2! - y1!, 2));
                      return <Circle x={x1} y={y1} radius={r} stroke={penColor} strokeWidth={penSize} />;
                    }
                    return null;
                  })()}
                </Layer>

                {/* Trail lines */}
                <Layer>
                  {Object.entries(trailLines).map(([shapeId, points]) => {
                    const sh = shapes.find(s => s.id === shapeId);
                    return sh ? <Line key={`${shapeId}-trail`} points={points} stroke={sh.fill}
                      strokeWidth={3} tension={0.5} dash={[1, 10]} lineCap="round" listening={false} /> : null;
                  })}
                  {/* Live Recording Path explicitly rendered on drag */}
                  <Line ref={liveRecordingLineRef} stroke="white" strokeWidth={3} dash={[6, 4]} lineCap="round" opacity={0.6} listening={false} />
                </Layer>

                {/* Step movement paths & controls — always rendered to keep layer order stable */}
                <Layer listening={mode === "step" && !isStepPlaying}>
                  {mode === "step" && !isStepPlaying && currentStep > 0 && steps[currentStep] && steps[currentStep - 1]
                    ? shapes.filter(s => !(s.type === 'ball' && s.ballOwner)).map(s => {
                      const prev = steps[currentStep - 1]?.find(ss => ss.id === s.id);
                      // Use React state positions (always correctly rescaled on resize)
                      const liveX = s.x;
                      const liveY = s.y;
                      if (!prev) return null;
                      const ddx = liveX - prev.x, ddy = liveY - prev.y;
                      if (Math.abs(ddx) < 3 && Math.abs(ddy) < 3) return null;

                      const stepCurr = steps[currentStep]?.find(ss => ss.id === s.id);
                      // Compute default waypoints if not set (1/3 and 2/3 along the straight line)
                      const wp1 = stepCurr?.wp1 ?? { x: prev.x + ddx * 0.33, y: prev.y + ddy * 0.33 };
                      const wp2 = stepCurr?.wp2 ?? { x: prev.x + ddx * 0.66, y: prev.y + ddy * 0.66 };

                      return (
                        <Group key={`path-group-${s.id}`}>
                          {/* Catmull-Rom Spline Path */}
                          <Line
                            points={[prev.x, prev.y, wp1.x, wp1.y, wp2.x, wp2.y, liveX, liveY]}
                            tension={0.5}
                            stroke={s.fill} strokeWidth={2} dash={[6, 4]} opacity={0.5} listening={false} lineCap="round" lineJoin="round"
                          />

                          {/* Control Points (Spline nodes) */}
                          <Circle
                            x={wp1.x} y={wp1.y} radius={6} fill={s.fill} stroke="white" strokeWidth={1.5} opacity={0.8}
                            draggable
                            onDragMove={(e) => {
                              const pos = e.target.position();
                              setSteps(prevSteps => {
                                const newSteps = [...prevSteps];
                                const currSnap = newSteps[currentStep] ? [...newSteps[currentStep]!] : null;
                                if (currSnap) {
                                  const idx = currSnap.findIndex(ss => ss.id === s.id);
                                  if (idx !== -1) {
                                    currSnap[idx] = { ...currSnap[idx]!, wp1: { x: pos.x, y: pos.y } };
                                    newSteps[currentStep] = currSnap;
                                  }
                                }
                                return newSteps;
                              });
                            }}
                          />
                          <Circle
                            x={wp2.x} y={wp2.y} radius={6} fill={s.fill} stroke="white" strokeWidth={1.5} opacity={0.8}
                            draggable
                            onDragMove={(e) => {
                              const pos = e.target.position();
                              setSteps(prevSteps => {
                                const newSteps = [...prevSteps];
                                const currSnap = newSteps[currentStep] ? [...newSteps[currentStep]!] : null;
                                if (currSnap) {
                                  const idx = currSnap.findIndex(ss => ss.id === s.id);
                                  if (idx !== -1) {
                                    currSnap[idx] = { ...currSnap[idx]!, wp2: { x: pos.x, y: pos.y } };
                                    newSteps[currentStep] = currSnap;
                                  }
                                }
                                return newSteps;
                              });
                            }}
                          />
                        </Group>
                      );
                    })
                    : null
                  }
                </Layer>

                {/* STATIC / SEMI-STATIC LAYER — Voronoi sceneFunc is heavy, isolate it */}
                <Layer ref={voronoiLayerRef} listening={false}>
                  {showVoronoi && (
                    <Shape sceneFunc={voronoiSceneFunc} width={stageSize.width} height={stageSize.height} />
                  )}
                </Layer>

                {/* DYNAMIC SHAPES LAYER — ref for animations */}
                <Layer ref={layerRef}>

                  {/* Ghost Players (previous step positions) */}
                  {mode === "step" && !isStepPlaying && currentStep > 0 && steps[currentStep - 1] && (
                    steps[currentStep - 1]!.map(snap => {
                      const originalShape = shapes.find(s => s.id === snap.id);
                      if (!originalShape) return null;
                      // Only render ghost if it actually moved
                      const currentShape = shapes.find(s => s.id === snap.id);
                      if (currentShape && Math.abs(currentShape.x - snap.x) < 2 && Math.abs(currentShape.y - snap.y) < 2) return null;

                      const isPlayer = originalShape.type === "player-home" || originalShape.type === "player-away";
                      const r = ELEMENT_RADIUS[originalShape.type];

                      return (
                        <Group key={`ghost-${snap.id}`} x={snap.x} y={snap.y} listening={false}>
                          {isPlayer ? (
                            <>
                              <Circle x={0} y={0} radius={r} fill={originalShape.fill} stroke="rgba(255,255,255,0.5)" strokeWidth={1} opacity={0.35} />
                              <Text x={-r} y={-r} width={r * 2} height={r * 2} text={originalShape.label ?? (originalShape.type === "player-away" ? "X" : "")}
                                fontSize={r} fontFamily="Arial" fontStyle="bold" fill="rgba(255,255,255,0.8)" align="center" verticalAlign="middle" />
                            </>
                          ) : (
                            // For balls and cones just render transparent
                            <Group opacity={0.35}>
                              {renderShape({ ...originalShape, x: 0, y: 0 })}
                            </Group>
                          )}
                        </Group>
                      );
                    })
                  )}

                  {Object.entries(freeSteps[currentFreeStep]?.recordings ?? {}).map(([shapeId, frames]) => {
                    const fs = frames as Frame[];
                    if (fs.length < 2) return null;
                    const sh = shapes.find(s => s.id === shapeId);
                    if (!sh) return null;

                    // Only show path if showPath is active, OR if we are currently recording this shape (live preview)
                    const isBeingRecorded = (mode === "freesteps" && isRecordingRef.current && shapeId === draggingShapeIdRef.current);
                    if (!showPath && !isBeingRecorded) return null;

                    const rpts = fs.flatMap((f: Frame) => [f.x, f.y]);
                    return <Line key={`${shapeId}-path`} points={rpts} stroke={sh.fill}
                      strokeWidth={2} tension={0.5} dash={isBeingRecorded ? [] : [10, 5]} listening={false} />;
                  })}
                  {shapes.map(s => renderShape(s))}
                </Layer>
              </Stage>
            )}
          </div>
        </div>

        {/* BOTTOM BAR — always shows Elements */}
        <div className="flex h-20 flex-shrink-0 items-center gap-1 overflow-visible relative z-10 border-t border-white/10 bg-gray-900/95 px-4 backdrop-blur">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-white/30">Elements</span>
          <BarSep />

          <ElementGroup label="Home" color={elementColors["player-home"]}
            presetColors={["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#f97316", "#8b5cf6", "#ffffff", "#000000"]}
            onColorChange={c => {
              setElementColors(prev => ({ ...prev, "player-home": c }));
              // Also update all existing home players on the canvas
              setShapes(prev => prev.map(s => s.type === "player-home" ? { ...s, fill: c } : s));
            }}>
            <ElementBtn onClick={() => addElement("player-home")} onDragStart={(e) => e.dataTransfer.setData("type", "player-home")} style={{ background: 'transparent' }}>
              {/* Circle matching the actual canvas shape */}
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: elementColors["player-home"],
                border: '2px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 'bold', fontSize: 13, fontFamily: 'Arial',
              }}>1</div>
            </ElementBtn>
          </ElementGroup>

          <BarSep />

          <ElementGroup label="Away" color={elementColors["player-away"]}
            presetColors={["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#f97316", "#8b5cf6", "#ffffff", "#000000"]}
            onColorChange={c => {
              setElementColors(prev => ({ ...prev, "player-away": c }));
              // Also update all existing away players on the canvas
              setShapes(prev => prev.map(s => s.type === "player-away" ? { ...s, fill: c } : s));
            }}>
            <ElementBtn onClick={() => addElement("player-away")} onDragStart={(e) => e.dataTransfer.setData("type", "player-away")} style={{ background: 'transparent' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: elementColors["player-away"],
                border: '2px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 'bold', fontSize: 13, fontFamily: 'Arial',
              }}>X</div>
            </ElementBtn>
          </ElementGroup>

          <BarSep />

          <ElementGroup label="Ball" color={elementColors.ball}
            presetColors={["#111111", "#ffffff", "#f97316"]}
            onColorChange={c => setElementColors(prev => ({ ...prev, ball: c }))}>
            <ElementBtn onClick={() => addElement("ball")} onDragStart={(e) => e.dataTransfer.setData("type", "ball")} style={{ background: 'transparent' }}>
              {sport === "basketball" ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
                  <circle cx="12" cy="12" r="10" fill="#e26914" stroke="#111" strokeWidth="1" />
                  <path d="M12 2 Q16 6 16 12 Q16 18 12 22" stroke="#111" strokeWidth="1" fill="none" />
                  <path d="M12 2 Q8 6 8 12 Q8 18 12 22" stroke="#111" strokeWidth="1" fill="none" />
                  <path d="M2 12 h20" stroke="#111" strokeWidth="1" />
                </svg>
              ) : sport === "hockey" ? (
                <svg viewBox="0 0 24 24" className="h-6 w-6">
                  <circle cx="12" cy="12" r="10" fill="#111" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                </svg>
              ) : (
                // Soccer / Futsal / Handball
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

          <ElementGroup label="Cone" color={elementColors.cone}
            presetColors={["#ff7300", "#39ff14", "#00f0ff"]} /* Neon Orange, Neon Green, Neon Blue */
            onColorChange={c => setElementColors(prev => ({ ...prev, cone: c }))}>
            <ElementBtn onClick={() => addElement("cone")} onDragStart={(e) => e.dataTransfer.setData("type", "cone")} style={{ background: 'transparent' }}>
              <svg viewBox="0 0 24 28" fill="none" className="h-8 w-7">
                <path d="M12 3 L22 24 H2 Z" fill={elementColors.cone} opacity="0.95" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
                <ellipse cx="12" cy="24" rx="10" ry="2.5" fill="rgba(0,0,0,0.25)" />
              </svg>
            </ElementBtn>
          </ElementGroup>

          <BarSep />

          <ElementGroup label="Goal" disableColorPicker color="#ffffff"
            onColorChange={() => { }}>
            <ElementBtn onClick={() => addElement("goal")} onDragStart={(e) => e.dataTransfer.setData("type", "goal")} style={{ background: 'transparent' }}>
              {sport === "basketball" ? (
                <svg viewBox="0 0 36 28" fill="none" className="h-7 w-9">
                  <rect x="8" y="2" width="20" height="5" rx="1.5" fill="#333" stroke="white" strokeWidth="1.5" />
                  <rect x="17" y="7" width="2.5" height="6" fill="#555" />
                  <circle cx="18" cy="20" r="7" stroke="#f97316" strokeWidth="2.5" fill="none" />
                  <circle cx="18" cy="20" r="5.5" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="2 2" />
                </svg>
              ) : sport === "hockey" ? (
                <svg viewBox="0 0 36 22" fill="none" className="h-6 w-9">
                  <path d="M3 20 C3 4 33 4 33 20" stroke="white" strokeWidth="2.5" fill="rgba(255,255,255,0.07)" strokeLinecap="round" />
                  <line x1="3" y1="20" x2="33" y2="20" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 40 22" fill="none" className="h-6 w-10">
                  <rect x="1" y="1" width="38" height="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" strokeDasharray="3 3" />
                  <polyline points="1,19 1,1 39,1 39,19" stroke="black" strokeWidth="5" strokeLinecap="square" strokeLinejoin="round" fill="none" />
                  <polyline points="1,19 1,1 39,1 39,19" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <line x1="1" y1="19" x2="39" y2="19" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="1" y1="19" x2="39" y2="19" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                </svg>
              )}
            </ElementBtn>
          </ElementGroup>

          <BarSep />

          <div className="ml-auto flex items-center gap-3">
            {/* Trash Zone */}
            <div ref={trashZoneRef}
              className={`flex h-12 w-14 flex-col items-center justify-center gap-0.5 rounded-xl border-2 transition-all duration-200
                ${!isDraggingShape
                  ? "border-transparent opacity-40"
                  : "border-dashed border-red-500/60 bg-red-950/40 opacity-100 shadow-inner shadow-red-900/30"}`}>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                className={`h-5 w-5 transition-colors ${isDraggingShape ? "text-red-400" : "text-white/50"}`}>
                <path d="M4 6h12M5 6l1 10a1 1 0 001 1h6a1 1 0 001-1l1-10M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2" />
              </svg>
              {isDraggingShape && <span className="text-[8px] font-bold text-red-400 uppercase tracking-wide">Drop</span>}
            </div>

            <div className="flex flex-col items-center gap-1">
              <button onClick={() => {
                setShapes([]);
                // Also clear Voronoi diagram visually
                setTimeout(() => voronoiLayerRef.current?.batchDraw(), 10);
              }} className="rounded px-2 py-1 text-[10px] text-white/40 hover:bg-white/10 hover:text-white transition-colors">
                Clear all
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SidebarBtn({ children, active, onClick, title, danger, disabled }: {
  children: React.ReactNode; active?: boolean; onClick: () => void;
  title?: string; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-all disabled:opacity-30 ${danger && active ? "bg-red-600 shadow-lg shadow-red-900/60" :
        active ? "bg-blue-600 shadow-lg shadow-blue-900/60" : "text-white/50 hover:bg-white/10 hover:text-white"}`}>
      {children}
    </button>
  );
}

function HeaderCtrlBtn({ children, active, onClick, title, danger, disabled }: {
  children: React.ReactNode; active?: boolean; onClick: () => void;
  title?: string; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-sm transition-all disabled:opacity-30 ${danger && active ? "bg-red-600 shadow shadow-red-900/60 text-white" :
        active ? "bg-blue-600 shadow shadow-blue-900/60 text-white" : "border border-white/10 bg-gray-800 text-white/60 hover:border-white/30 hover:text-white"}`}>
      {children}
    </button>
  );
}

function SidebarDivider() {
  return <div className="my-0.5 h-px w-10 bg-white/10" />;
}

function BarSep() {
  return <div className="mx-1 h-10 w-px flex-shrink-0 bg-white/10" />;
}

function ElementGroup({ label, color, onColorChange, disableColorPicker, presetColors, children }: {
  label: string; color: string; onColorChange: (c: string) => void; disableColorPicker?: boolean; presetColors?: string[]; children: React.ReactNode;
}) {
  const PRESET_COLORS = presetColors || ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ffffff", "#000000"];
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="flex flex-shrink-0 flex-col items-center gap-1 relative outline-none"
      tabIndex={-1}
      onBlur={(e) => {
        // Close if focus moves outside of this component
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsOpen(false);
        }
      }}
    >
      <div className="flex gap-1">{children}</div>
      <button
        className="flex items-center gap-1 h-3 cursor-pointer outline-none"
        onClick={() => {
          if (!disableColorPicker) setIsOpen(!isOpen);
        }}
      >
        {!disableColorPicker && (
          <div className="h-2.5 w-2.5 rounded-full border border-white/30" style={{ background: color }} />
        )}
        <span className="text-[9px] text-white/40 hover:text-white/80 transition-colors">{label}</span>
      </button>

      {/* Click-to-open Panel with Color Options */}
      {isOpen && !disableColorPicker && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg border border-white/10 bg-gray-900 p-1.5 shadow-xl transition-all">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => {
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

function ElementBtn({ onClick, onDragStart, style, children }: {
  onClick: () => void; onDragStart?: (e: React.DragEvent) => void; style?: React.CSSProperties; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} onDragStart={onDragStart} draggable={!!onDragStart}
      className={`flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${onDragStart ? 'cursor-grab active:cursor-grabbing' : ''}`}>
      {children}
    </button>
  );
}
