/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import { Stage, Layer, Image, Circle, Line, Text, Group, RegularPolygon, Shape, Rect, Arrow } from "react-konva";
import useImage from "use-image";
import Konva from "konva";
import { api } from "~/trpc/react";
import Link from "next/link";

import { useDrawingTools, type DrawLine, type ToolType } from "../hooks/useDrawingTools";
import { useBoardState, type ShapeData, type StepSnapshot, type FreeStepSnapshot, type ElementType } from "../hooks/useBoardState";
import { clipVCell, denX, denY, isNorm, normalizeX, normalizeY, type VPt } from "../utils/geometry";
import { SidebarBtn, HeaderCtrlBtn, SidebarDivider, BarSep, ElementGroup, ElementBtn } from "./WhiteboardUI";
import { WhiteboardShape, ELEMENT_RADIUS } from "./WhiteboardShape";
import { CanvasHeader } from "./CanvasHeader";
import { CanvasSidebar } from "./CanvasSidebar";
import { CanvasFooter } from "./CanvasFooter";

interface GhostPlayersLayerProps {
  mode: string;
  currentStep: number;
  steps: any[];
  shapesMeta: Map<string, { type: string, fill: string, label?: string }>;
  shapesRef: React.MutableRefObject<ShapeData[]>;
  draggingWaypointRef: React.MutableRefObject<{ id: string, idx: 1 | 2, x: number, y: number } | null>;
  draggingShapeIdRef: React.MutableRefObject<string | null>;
  isPlaying: boolean;
}

const GhostPlayersLayer = memo(({ mode, currentStep, steps, shapesMeta, shapesRef, draggingWaypointRef, draggingShapeIdRef, isPlaying }: GhostPlayersLayerProps) => {
  if (mode !== "step" || currentStep === 0 || !steps[currentStep - 1] || isPlaying) return null;

  const previousStep = steps[currentStep - 1]!;

  const sceneFunc = useCallback((context: Konva.Context, shape: Konva.Shape) => {
    const currentShapes = shapesRef.current;
    const stage = shape.getStage();

    const sortedSnap = [...previousStep].sort((a, b) => {
      const aIsBall = (shapesMeta.get(a.id)?.type === 'ball') ? 1 : 0;
      const bIsBall = (shapesMeta.get(b.id)?.type === 'ball') ? 1 : 0;
      return aIsBall - bIsBall;
    });

    for (const snap of sortedSnap) {
      const meta = shapesMeta.get(snap.id);
      if (!meta) continue;

      const isPlayer = meta.type.startsWith("player");
      const r = ELEMENT_RADIUS[meta.type as ElementType];

      // Draw displacement line
      const node = stage?.findOne(`#${snap.id}`);
      const curX = node ? node.x() : snap.x;
      const curY = node ? node.y() : snap.y;

      // Distance check to avoid drawing guides for static entities
      const dw = draggingWaypointRef.current;
      const isDraggingThisWaypoint = dw && dw.id === snap.id;
      const hasMovement = (steps[currentStep] as StepSnapshot | undefined)?.some(s => s.id === snap.id && (s.x !== snap.x || s.y !== snap.y));

      const currentSnap = (steps[currentStep] as StepSnapshot | undefined)?.find(s => s.id === snap.id);
      const isBallCarried = meta.type === 'ball' && snap.ballOwner && currentSnap?.ballOwner === snap.ballOwner;

      if ((curX !== snap.x || curY !== snap.y || isDraggingThisWaypoint || hasMovement) && !isBallCarried) {
        context.save();
        context.beginPath();
        context.setLineDash([10, 5]);
        context.moveTo(snap.x, snap.y);
        const isDraggingThisShape = node && draggingShapeIdRef.current === snap.id;
        const targetX = isDraggingThisShape ? node.x() : (currentSnap?.x ?? snap.x);
        const targetY = isDraggingThisShape ? node.y() : (currentSnap?.y ?? snap.y);

        let wp1 = isDraggingThisShape ? null : currentSnap?.wp1;
        let wp2 = isDraggingThisShape ? null : currentSnap?.wp2;

        if (isDraggingThisWaypoint) {
          if (dw.idx === 1) wp1 = { x: dw.x, y: dw.y };
          else wp2 = { x: dw.x, y: dw.y };
        }

        const computedWp1 = wp1 || { x: snap.x + (targetX - snap.x) * 0.33, y: snap.y + (targetY - snap.y) * 0.33 };
        const computedWp2 = wp2 || { x: snap.x + (targetX - snap.x) * 0.67, y: snap.y + (targetY - snap.y) * 0.67 };

        const pts = [snap.x, snap.y, computedWp1.x, computedWp1.y, computedWp2.x, computedWp2.y, targetX, targetY];

        const ptsSpline = [
          { x: snap.x, y: snap.y },
          { x: computedWp1.x, y: computedWp1.y },
          { x: computedWp2.x, y: computedWp2.y },
          { x: targetX, y: targetY }
        ];

        for (let t = 0; t <= 1.0; t += 0.01) {
          const numSegments = 3;
          const segment = Math.min(numSegments - 1, Math.floor(t * numSegments));
          const mt = (t * numSegments) - segment;

          const p1 = ptsSpline[segment]!;
          const p2 = ptsSpline[segment + 1]!;
          const p0 = segment === 0 ? p1 : ptsSpline[segment - 1]!;
          const p3 = segment === numSegments - 1 ? p2 : ptsSpline[segment + 2]!;

          const mt2 = mt * mt, mt3 = mt2 * mt;
          const w1 = 0.5 * (-mt3 + 2 * mt2 - mt);
          const w2 = 0.5 * (3 * mt3 - 5 * mt2 + 2);
          const w3 = 0.5 * (-3 * mt3 + 4 * mt2 + mt);
          const w4 = 0.5 * (mt3 - mt2);

          context.lineTo(
            p0.x * w1 + p1.x * w2 + p2.x * w3 + p3.x * w4,
            p0.y * w1 + p1.y * w2 + p2.y * w3 + p3.y * w4
          );
        }

        context.strokeStyle = meta.fill;
        context.lineWidth = 2;
        context.globalAlpha = 0.5;
        context.stroke();
        context.restore();
      }

      if (meta.type === 'goal') continue;

      context.beginPath();
      context.globalAlpha = isPlayer ? 0.25 : 0.15;

      if (meta.type === 'cone') {
        const sides = 3;
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
          const px = snap.x + r * Math.cos(angle);
          const py = snap.y + r * Math.sin(angle);
          if (i === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.closePath();
      } else {
        context.arc(snap.x, snap.y, isPlayer ? r : (meta.type === 'ball' ? 9 : 13), 0, Math.PI * 2);
        context.closePath();
      }

      context.globalAlpha = isPlayer ? 0.2 : 0.1;
      context.fillStyle = meta.fill;
      context.fill();

      context.globalAlpha = 0.5;
      context.strokeStyle = isPlayer ? "rgba(255,255,255,0.5)" : "white";
      context.lineWidth = 1;
      context.stroke();

      if (isPlayer && meta.label) {
        context.font = `bold ${r}px Arial`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = "white";
        context.globalAlpha = 0.4;
        context.fillText(meta.label, snap.x, snap.y);
      }
    }
  }, [currentStep, steps, shapesMeta]);

  return <Shape sceneFunc={sceneFunc} listening={false} perfectDrawEnabled={false} />;
});

type Frame = { x: number; y: number; time: number };

const isMobile = typeof window !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const BackgroundImage = ({ width, height, sport }: { width: number; height: number; sport: string }) => {
  // Use a fallback to hockey if sport is missing or unrecognized, though it shouldn't be
  const validSports = ["hockey", "futsal", "football", "basketball", "handball"];
  const safeSport = validSports.includes(sport?.toLowerCase()) ? sport.toLowerCase() : "hockey";
  const imagePath = `/img/pitch_${safeSport}.svg`;

  const [image] = useImage(imagePath);
  if (!image) return null;
  return <Image image={image} width={width} height={height} alt="" listening={false} />;
};

interface InteractiveCanvasProps { boardId: string; initialData: any; sport: string; isSession?: boolean }

export const InteractiveCanvas = ({ boardId, initialData, sport, isSession }: InteractiveCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 500 });
  const [uiScale, setUiScale] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const baseScale = Math.max(0.4, Math.min(1, window.innerWidth / 1100, window.innerHeight / 700));
    return isMobile ? baseScale * 0.9 : baseScale;
  });
  const [windowSize, setWindowSize] = useState(() => typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : { w: 1100, h: 700 });

  const [elementColors, setElementColors] = useState<Record<ElementType, string>>({
    "player-home": "#3b82f6", "player-away": "#ef4444", "player-third": "#22c55e", "player-fourth": "#eab308",
    "player-5": "#8b5cf6", "player-6": "#ec4899", "player-7": "#14b8a6", "player-8": "#64748b",
    ball: sport?.toLowerCase() === "hockey" ? "#111111" : sport?.toLowerCase() === "basketball" ? "#f97316" : "#ffffff",
    cone: "#f97316", goal: "#ffffff",
  });

  const [mode, setMode] = useState<"freesteps" | "step">("step");
  const [isLooping, setIsLooping] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const isDraggingShapeRef = useRef(false);
  const isHoveringTrashRef = useRef(false);
  const trashZoneRef = useRef<HTMLDivElement>(null);
  const ghostWrapperRef = useRef<HTMLDivElement>(null);
  const dragPointerRef = useRef<HTMLDivElement>(null);
  const [showPath, setShowPath] = useState(false);
  const [showTrail, setShowTrail] = useState(false);
  const [showVoronoi, setShowVoronoi] = useState(false);
  const [trailLines, setTrailLines] = useState<Record<string, number[]>>({});
  const [showShapesPanel, setShowShapesPanel] = useState(false);
  const [goalDragImage, setGoalDragImage] = useState<string | null>(null);
  const goalAnchorOffsetRef = useRef({ x: 0, y: 0 });
  const [pendingModeSwitch, setPendingModeSwitch] = useState<"freesteps" | "step" | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [stepPlaybackProgress, setStepPlaybackProgress] = useState(0);
  const [pendingTrajectoryReset, setPendingTrajectoryReset] = useState<{
    shapeId: string;
    finalX: number;
    finalY: number;
    ballOwner: string | null;
    prevX: number;
    prevY: number;
  } | null>(null);

  const draggingWaypointRef = useRef<{ id: string, idx: 1 | 2, x: number, y: number } | null>(null);

  const layerRef = useRef<Konva.Layer>(null);
  const ghostLayerRef = useRef<Konva.Layer>(null);
  const dragLayerRef = useRef<Konva.Layer>(null);
  const voronoiLayerRef = useRef<Konva.Layer>(null);
  const liveRecordingLineRef = useRef<Konva.Line>(null);
  const stepDragLayerRef = useRef<Konva.Layer>(null);
  const draggingShapeIdRef = useRef<string | null>(null);
  const showTrailRef = useRef(showTrail);
  const recordStartTimeRef = useRef<number>(0);
  const activeRecordingPathsRef = useRef<Record<string, Frame[]>>({});
  const lastTrailUpdateTimeRef = useRef<Record<string, number>>({});
  const lastDragUpdateRef = useRef<number>(0);
  const activeDrawLineRef = useRef<Konva.Line>(null);
  const stepTransitionAnimRef = useRef<number | null>(null);
  const prevStageSizeRef = useRef<{ width: number; height: number } | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const trailPointsRef = useRef<Record<string, number[]>>({});
  const lastSyncedStepRef = useRef<number | null>(null);

  const {
    shapes, setShapes, shapesRef, steps, setSteps, stepsRef,
    currentStep, setCurrentStep, freeSteps, setFreeSteps,
    currentFreeStep, setCurrentFreeStep, isRecording, setIsRecording,
    isPlaying, setIsPlaying, selectedShapeId, setSelectedShapeId,
    handleSaveBoard, saveMutation, isSaving,
    addElement, deleteSelected, rotateSelected,
    goToStep, addNextStep, removeLastStep, enterStepMode, saveCurrentStep,
    isGlobalMode, setIsGlobalMode,
    notification, hasUnsavedChanges
  } = useBoardState({
    boardId, initialData, sport, stageSize, elementColors, voronoiLayerRef, mode, setMode, isSession
  });

  const {
    activeTool, setActiveTool, penColor, setPenColor, penSize, setPenSize,
    eraserSize, setEraserSize, drawLines, setDrawLines, handleStagePointerDown,
    handleStagePointerMove, handleStagePointerUp, isDrawTool,
    isDrawing, currentLinePoints, pointsRef
  } = useDrawingTools({
    initialDrawLines: initialData?.drawLines ?? [],
    currentStep,
    currentFreeStep,
    mode,
    isGlobalMode
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
  });

    const rawInitialDataRef = useRef<any>(initialData);

  useEffect(() => {
    const onResize = () => {
      const scale = Math.max(0.4, Math.min(1, window.innerWidth / 1100, window.innerHeight / 700));
      setUiScale(scale);
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    const scrollHandler = (e: TouchEvent) => {
      // Block all touch moves, including multi-touch (two fingers)
      e.preventDefault();
    };

    const preventViewportShift = () => {
      // Force the viewport back to the top-left to counteract keyboard shifting
      // and prevent the "rubber-band" effect on iOS.
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };

    document.addEventListener('touchmove', scrollHandler, { passive: false });
    window.addEventListener('scroll', preventViewportShift);

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('scroll', preventViewportShift);
      vv.addEventListener('resize', preventViewportShift);
    }

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    const originalHeight = document.body.style.height;
    const originalOverscroll = document.body.style.overscrollBehavior;

    // Lock the body and document to prevent any elastic scrolling or keyboard pans
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.touchAction = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.removeEventListener('touchmove', scrollHandler);
      window.removeEventListener('scroll', preventViewportShift);
      if (vv) {
        vv.removeEventListener('scroll', preventViewportShift);
        vv.removeEventListener('resize', preventViewportShift);
      }

      document.documentElement.style.overflow = '';
      document.documentElement.style.touchAction = '';
      document.documentElement.style.overscrollBehavior = '';

      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
      document.body.style.height = originalHeight;
      document.body.style.overscrollBehavior = originalOverscroll;
    };
  }, []);

  useEffect(() => {
    const denormShape = (s: any, w: number, h: number): ShapeData => ({
      ...s,
      x: isNorm(s.x) ? denX(s.x, w) : s.x,
      y: isNorm(s.y) ? denY(s.y, h) : s.y,
    });
    const denormSnap = (ss: any, w: number, h: number) => ({
      ...ss,
      x: isNorm(ss.x) ? denX(ss.x, w) : ss.x,
      y: isNorm(ss.y) ? denY(ss.y, h) : ss.y,
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
        // First real measurement: hydrate + denormalize with CORRECT size
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
        // Subsequent resize: debounce the scaling logic
        if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = setTimeout(() => {
          const prev = prevStageSizeRef.current;
          if (!prev || (prev.width === w && prev.height === h)) return;
          const scaleX = w / prev.width;
          const scaleY = h / prev.height;
          prevStageSizeRef.current = { width: w, height: h };

          setShapes(sh => sh.map(s => ({ ...s, x: s.x * scaleX, y: s.y * scaleY })));
          setSteps(sts => sts.map(step => step.map(ss => ({
            ...ss, x: ss.x * scaleX, y: ss.y * scaleY,
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
        }, 50);
      }
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animationRef = useRef<Konva.Animation | null>(null);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    // In freesteps mode > step 0, dragging a player automatically starts recording and simultaneous playback
    const id = e.target.id();
    draggingShapeIdRef.current = id;
    setDraggingId(id);
    isDraggingShapeRef.current = true;
    const shapeData = shapesRef.current.find(s => s.id === id);

    // Cache all other shapes in the layer so Konva skips re-rendering them on each drag frame
    if (layerRef.current) {
        layerRef.current.getChildren().forEach(node => {
            const nodeId = node.id() || "";
            const nodeName = node.name() || "";
            // Also skip nodes with 0 dimensions
            if (nodeId !== id && !nodeId.includes('wp') && !nodeName.includes('wp')) {
                try {
                    const bbox = node.getClientRect();
                    if (bbox.width > 0 && bbox.height > 0) {
                        node.cache();
                    }
                } catch (e) {
                }
            }
        });

        // Also cache the dragged node itself if it's a goal or complex to improve drag performance
        const draggedNode = layerRef.current.findOne(`#${id}`);
        if (draggedNode && shapeData?.type === 'goal') {
            try {
                const bbox = draggedNode.getClientRect();
                if (bbox.width > 0 && bbox.height > 0) {
                    draggedNode.cache();
                }
            } catch (e) { }
        }
    }

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

    // Position DOM Ghost immediately
    if (dragPointerRef.current && ghostWrapperRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      ghostWrapperRef.current.style.display = 'block';
      ghostWrapperRef.current.style.top = `${rect.top}px`;
      ghostWrapperRef.current.style.left = `${rect.left}px`;
      ghostWrapperRef.current.style.right = '0px';
      ghostWrapperRef.current.style.bottom = '0px';

      dragPointerRef.current.style.display = 'block';
      dragPointerRef.current.style.left = `${e.target.x() * uiScale}px`;
      dragPointerRef.current.style.top = `${e.target.y() * uiScale}px`;
    }

    const isRecordable = shapeData?.type?.startsWith('player-') || shapeData?.type === 'ball';

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

      const boundBalls = shapesRef.current.filter(s => s.type === 'ball' && s.ballOwner === id);
      for (const ball of boundBalls) {
        activeRecordingPathsRef.current[ball.id] = [{ x: e.target.x() + 12, y: e.target.y() + 12, time: 0 }];
      }
    }
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const id = e.target.id();

    if (dragPointerRef.current && ghostWrapperRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      ghostWrapperRef.current.style.display = 'block';
      ghostWrapperRef.current.style.top = `${rect.top}px`;
      ghostWrapperRef.current.style.left = `${rect.left}px`;
      ghostWrapperRef.current.style.right = '0px';
      ghostWrapperRef.current.style.bottom = '0px';

      dragPointerRef.current.style.display = 'block';
      dragPointerRef.current.style.left = `${e.target.x() * uiScale}px`;
      dragPointerRef.current.style.top = `${e.target.y() * uiScale}px`;
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

    // Update displacement lines (Step mode)
    if (mode === "step" && currentStep > 0) {
      ghostLayerRef.current?.batchDraw();
    }

    // Redraw Voronoi layer during drag in any mode
    voronoiLayerRef.current?.batchDraw();

    const draggedShape = shapesRef.current.find(s => s.id === id);
    if (draggedShape && draggedShape.type.startsWith('player-')) {
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

    // Buffer recording geometry in Ref
    if (isRecordingRef.current && mode === "freesteps" && id === draggingShapeIdRef.current) {
      const timeNow = Date.now() - recordStartTimeRef.current;

      const pts = activeRecordingPathsRef.current[id] ?? [];
      const f: Frame = { x: e.target.x(), y: e.target.y(), time: timeNow };
      activeRecordingPathsRef.current[id] = [...pts, f];

      if (liveRecordingLineRef.current) {
        liveRecordingLineRef.current.points(activeRecordingPathsRef.current[id].flatMap(p => [p.x, p.y]));
        liveRecordingLineRef.current.getLayer()?.batchDraw();
      }

      const boundBalls = shapesRef.current.filter(s => s.type === 'ball' && s.ballOwner === id);
      for (const ball of boundBalls) {
        const ballPts = activeRecordingPathsRef.current[ball.id] ?? [];
        activeRecordingPathsRef.current[ball.id] = [...ballPts, { x: e.target.x() + 12, y: e.target.y() + 12, time: timeNow }];
      }
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    isDraggingShapeRef.current = false;
    isHoveringTrashRef.current = false;
    if (dragPointerRef.current) dragPointerRef.current.style.display = 'none';
    if (ghostWrapperRef.current) ghostWrapperRef.current.style.display = 'none';
    setGoalDragImage(null);
    // Clear shape caches so they are re-rendered correctly after state update
    if (layerRef.current) {
      layerRef.current.getChildren().forEach(node => node.clearCache());
      layerRef.current.batchDraw();
    }
    setDraggingId(null);
    stepDragLayerRef.current?.batchDraw();
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

    // Compute EXACT next state synchronously so physics updates (bindings) aren't lost
    let nextShapes = shapesRef.current.map(s => s.id === id ? { ...s, x: finalX, y: finalY } : s);

    // Auto-bind ball: if a ball is dropped overlapping a player, bind it
    const droppedShape = nextShapes.find(s => s.id === id);
    if (droppedShape?.type === 'ball') {
      const ballR = ELEMENT_RADIUS['ball'];
      const layer = layerRef.current;
      const players = nextShapes.filter(s => s.type.startsWith('player'));
      let closestPlayer: ShapeData | null = null;
      let closestDist = Infinity;
      for (const p of players) {
        const node = layer?.findOne(`#${p.id}`);
        const pX = node ? node.x() : p.x;
        const pY = node ? node.y() : p.y;

        const dist = Math.sqrt((finalX - pX) ** 2 + (finalY - pY) ** 2);
        const touchDist = ballR + ELEMENT_RADIUS[p.type as ElementType];
        if (dist < touchDist && dist < closestDist) {
          closestDist = dist;
          closestPlayer = p;
        }
      }
      nextShapes = nextShapes.map(s => s.id === id ? { ...s, ballOwner: closestPlayer?.id ?? null } : s);
    }

    if (droppedShape?.type.startsWith('player')) {
      const playerR = ELEMENT_RADIUS[droppedShape.type as ElementType];
      nextShapes = nextShapes.map(s => {
        if (s.type !== 'ball') return s;
        if (s.ballOwner === id) {
          return { ...s, x: finalX + 12, y: finalY + 12 };
        }
        const dist = Math.sqrt((s.x - finalX) ** 2 + (s.y - finalY) ** 2);
        if (!s.ballOwner && dist < ELEMENT_RADIUS['ball'] + playerR) {
          return { ...s, ballOwner: id, x: finalX + 12, y: finalY + 12 };
        }
        return s;
      });
    }

    setShapes(nextShapes);

    if (mode === "freesteps") {
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
        if (liveRecordingLineRef.current) {
          liveRecordingLineRef.current.points([]);
          liveRecordingLineRef.current.getLayer()?.batchDraw();
        }

        const flushedPaths = activeRecordingPathsRef.current;
        if (Object.keys(flushedPaths).length > 0) {
          setFreeSteps(prev => {
            const next = [...prev];
            const step = next[currentFreeStepRef.current];
            if (!step) return prev;

            let mergedRecs = { ...step.recordings };
            for (const [shapeId, frames] of Object.entries(flushedPaths)) {
              if (frames && frames.length > 0) {
                mergedRecs[shapeId] = frames;
              }
            }

            next[currentFreeStepRef.current] = { ...step, recordings: mergedRecs };
            return next;
          });
        }
        activeRecordingPathsRef.current = {};
      }

      if (currentFreeStepRef.current === 0) {
        setFreeSteps(prev => {
          return prev.map(fs => ({
            ...fs,
            initial: fs.initial.map(si => {
              const currentS = nextShapes.find(s => s.id === si.id);
              return currentS ? { ...si, x: currentS.x, y: currentS.y, rotation: currentS.rotation, ballOwner: currentS.ballOwner } : si;
            })
          }));
        });
      } else {
        const targetId = id;
        const currentDragged = nextShapes.find(s => s.id === targetId);

        if (currentDragged) {
          const hasFutureMovements = freeSteps.slice(currentFreeStep + 1).some(step => step.recordings[targetId]);
          
          const applyTrajectoryChange = (shapeId: string, fx: number, fy: number, bOwner: string | null) => {
            setShapes(prev => prev.map(s => s.id === shapeId ? { ...s, x: fx, y: fy, ballOwner: bOwner } : s));
            setFreeSteps(prev => {
              const next = [...prev];
              const currentIdx = currentFreeStepRef.current;

              for (let i = currentIdx + 1; i < next.length; i++) {
                const step = next[i];
                if (!step) continue;

                // Delete future recordings for this player
                const newRecordings = { ...step.recordings };
                delete newRecordings[shapeId];

                next[i] = {
                  ...step,
                  recordings: newRecordings,
                  initial: step.initial.map(si => {
                    if (si.id === shapeId) return { ...si, x: fx, y: fy, ballOwner: bOwner };
                    if (si.id.startsWith('ball') && currentDragged.type.startsWith('player')) {
                      const ball = nextShapes.find(s => s.id === si.id && s.ballOwner === shapeId);
                      if (ball) return { ...si, x: fx + 12, y: fy + 12, ballOwner: shapeId };
                    }
                    return si;
                  })
                };
              }
              return next;
            });
          };

          if (hasFutureMovements) {
            const originalS = shapesRef.current.find(s => s.id === targetId);
            setPendingTrajectoryReset({ 
              shapeId: targetId, 
              finalX, 
              finalY, 
              ballOwner: currentDragged.ballOwner ?? null,
              prevX: originalS?.x ?? finalX,
              prevY: originalS?.y ?? finalY
            });
          } else {
            applyTrajectoryChange(targetId, finalX, finalY, currentDragged.ballOwner ?? null);
          }
        }
      }
    }

    if (mode === "step" && currentStep > 0) {
      // Initialize waypoints if they don't exist
      setSteps(prev => {
        const updated = [...prev];
        const snap = [...(updated[currentStep] || [])];
        const sIdx = snap.findIndex(s => s.id === id);
        if (sIdx !== -1) {
          const ss = snap[sIdx]!;
          const prevSnap = updated[currentStep - 1];
          const prevS = prevSnap?.find(ps => ps.id === id);
          if (prevS) {
            // FORCE RESET to straight line (null waypoints) on every player move
            snap[sIdx] = { ...ss, wp1: null, wp2: null };
          }
        }
        updated[currentStep] = snap;
        return updated;
      });
    }

    saveCurrentStep(nextShapes);
    draggingShapeIdRef.current = null;
  };

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
            if (now - (lastTrailUpdateTimeRef.current[shapeId] ?? 0) > 100) {
              lastTrailUpdateTimeRef.current[shapeId] = now;
              const sh = shapesRef.current.find(s => s.id === shapeId);
              if (!sh) return;

              const pts = trailPointsRef.current[shapeId] || [];
              pts.push(node.x(), node.y());
              trailPointsRef.current[shapeId] = pts;

              // Batch trail state update every ~150ms to keep animations fluid
              if (now - (lastTrailUpdateTimeRef.current._lastBatch || 0) > 150) {
                lastTrailUpdateTimeRef.current._lastBatch = now;
                setTrailLines({ ...trailPointsRef.current });
              }
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
      animationRef.current?.stop(); setTrailLines({}); trailPointsRef.current = {}; lastTrailUpdateTimeRef.current = {};
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

  useEffect(() => {
    if (mode === "step" && isPlaying) {
      setCurrentStep(0);
      setStepPlaybackProgress(0);

      const layer = layerRef.current;
      if (!layer) { setIsPlaying(false); return; }

      const durationPerStep = 1800 / playbackSpeed;
      const totalSteps = steps.length - 1;
      if (totalSteps <= 0) { setIsPlaying(false); return; }

      const anim = new Konva.Animation((frame) => {
        if (!frame) return;
        const totalElapsed = frame.time;
        const currentSegment = Math.floor(totalElapsed / durationPerStep);
        const segmentProgress = (totalElapsed % durationPerStep) / durationPerStep;

        if (currentSegment >= totalSteps) {
          anim.stop();
          setIsPlaying(false);
          setStepPlaybackProgress(100);
          setCurrentStep(totalSteps); // Stay on the last step after playback
          return;
        }

        // Throttled progress update
        if (totalElapsed % 100 < 20) {
          const progress = ((currentSegment + segmentProgress) / totalSteps) * 100;
          setStepPlaybackProgress(progress);

          // Update currentStep during playback to light up the header buttons
          if (currentStep !== currentSegment) {
            setCurrentStep(currentSegment);
          }
        }

        const startSnap = steps[currentSegment];
        const endSnap = steps[currentSegment + 1];
        if (!startSnap || !endSnap) return;

        startSnap.forEach(sStart => {
          const sEnd = endSnap.find(e => e.id === sStart.id);
          const node = layer.findOne(`#${sStart.id}`);
          if (node && sEnd) {
            const isBallCarried = sStart.id.startsWith('ball') && sStart.ballOwner && sStart.ballOwner === sEnd.ballOwner;
            if (isBallCarried) {
              return;
            }

            const t = segmentProgress;
            let x, y;
            const wp1 = sEnd.wp1 || { x: sStart.x + (sEnd.x - sStart.x) * 0.33, y: sStart.y + (sEnd.y - sStart.y) * 0.33 };
            const wp2 = sEnd.wp2 || { x: sStart.x + (sEnd.x - sStart.x) * 0.67, y: sStart.y + (sEnd.y - sStart.y) * 0.67 };

            if (sEnd.wp1 || sEnd.wp2) {
              const numSegments = 3;
              const segment = Math.min(numSegments - 1, Math.floor(t * numSegments));
              const localT = (t * numSegments) - segment;

              const pts = [
                { x: sStart.x, y: sStart.y },
                { x: wp1.x, y: wp1.y },
                { x: wp2.x, y: wp2.y },
                { x: sEnd.x, y: sEnd.y }
              ];

              const p0 = segment === 0 ? pts[0]! : pts[segment - 1]!;
              const p1 = pts[segment]!;
              const p2 = pts[segment + 1]!;
              const p3 = segment === numSegments - 1 ? pts[numSegments]! : pts[segment + 2]!;

              const mt = localT;
              const mt2 = mt * mt;
              const mt3 = mt2 * mt;

              const b1 = 0.5 * (-mt3 + 2 * mt2 - mt);
              const b2 = 0.5 * (3 * mt3 - 5 * mt2 + 2);
              const b3 = 0.5 * (-3 * mt3 + 4 * mt2 + mt);
              const b4 = 0.5 * (mt3 - mt2);

              x = p0.x * b1 + p1.x * b2 + p2.x * b3 + p3.x * b4;
              y = p0.y * b1 + p1.y * b2 + p2.y * b3 + p3.y * b4;
            } else {
              x = sStart.x + (sEnd.x - sStart.x) * t;
              y = sStart.y + (sEnd.y - sStart.y) * t;
            }

            node.position({ x, y });

            if (sStart.id.startsWith('player')) {
              const boundBalls = startSnap.filter(s => {
                const sE = endSnap.find(e => e.id === s.id);
                return s.id.startsWith('ball') && s.ballOwner === sStart.id && sE?.ballOwner === sStart.id;
              });
              for (const ball of boundBalls) {
                const bNode = layer.findOne(`#${ball.id}`);
                if (bNode) {
                  bNode.position({ x: x + 12, y: y + 12 });
                }
              }
            }
          }
        });

        if (showVoronoi) voronoiLayerRef.current?.batchDraw();
      }, [layer]);

      anim.start();
      return () => {
        anim.stop();
      };
    }
  }, [isPlaying, mode, playbackSpeed, steps, showVoronoi, setIsPlaying]);

  useEffect(() => {
    if (mode === "freesteps" && !isPlaying && !isRecording && currentFreeStep !== lastSyncedStepRef.current) {
      const step = freeSteps[currentFreeStep];
      if (step && step.initial) {
        setShapes(prev => prev.map(s => {
          const init = step.initial.find(ss => ss.id === s.id);
          return init ? { ...s, x: init.x, y: init.y, rotation: init.rotation } : s;
        }));
        lastSyncedStepRef.current = currentFreeStep;
      }
    }
  }, [currentFreeStep, mode, isPlaying, isRecording, freeSteps]);

  useEffect(() => { if (!showTrail) setTrailLines({}); }, [showTrail]);

  useEffect(() => {
    if (mode === "step" && !isPlaying) {
      goToStep(currentStep);
    }
  }, [isPlaying, mode]); // Only trigger when playback state changes

  const voronoiSceneFunc = useCallback((ctx: any) => {
    if (!showVoronoi) return;
    const layer = layerRef.current;
    const W = stageSize.width, H = stageSize.height;
    // Exclude balls and cones from Voronoi mathematically
    const players = shapesRef.current
      .filter(s => s.type.startsWith('player-'))
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
  }, [showVoronoi, stageSize]);

  const shapesMeta = useMemo(() => {
    return new Map(shapes.map(s => [s.id, { type: s.type, fill: s.fill, label: s.label }]));
  }, [shapes.length, elementColors]);

  const renderShape = (shape: ShapeData) => (
    <WhiteboardShape
      key={shape.id}
      shape={shape}
      isSelected={shape.id === selectedShapeId}
      isDragging={isDraggingShapeRef.current && draggingShapeIdRef.current === shape.id}
      isStepPlaying={false}
      activeTool={activeTool}
      sport={sport}
      mode={mode}
      currentStep={currentStep}
      handleLocalX={0}
      handleLocalY={sport === "basketball" ? -55 : -35 - 30}
      goalDragImage={goalDragImage}
      onSelect={setSelectedShapeId}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      setShapes={setShapes}
      setSteps={setSteps}
      shapesRef={shapesRef}
    />
  );


  const confirmSwitchToStep = useCallback(() => {
    // Only keep current positions. Discard recordings.
    const initialSnap = shapes.map(s => ({ id: s.id, x: s.x, y: s.y, rotation: s.rotation }));
    setSteps([initialSnap]);

    setMode("step");
    setCurrentStep(0);
    setPendingModeSwitch(null);
    setIsPlaying(false);
    setIsRecording(false);
    setTrailLines({});
  }, [shapes]);

  const confirmSwitchToFreeSteps = useCallback(() => {
    // Only keep current positions. Discard recorded steps.
    const initialSnap = shapes.map(s => ({ id: s.id, x: s.x, y: s.y, rotation: s.rotation }));
    setFreeSteps([{ initial: initialSnap, recordings: {} }]);

    setMode("freesteps");
    setCurrentFreeStep(0);
    setPendingModeSwitch(null);
    setIsPlaying(false);
    setIsRecording(false);
    setTrailLines({});
  }, [shapes]);

  const detenerStepPlay = useCallback(() => {
    setIsPlaying(false);
    setStepPlaybackProgress(0);
    goToStep(0);
  }, [goToStep, setIsPlaying, setStepPlaybackProgress]);

  const addFreeStep = useCallback(() => {
    const currIdx = currentFreeStepRef.current;
    const layer = layerRef.current;

    const liveShapes = shapesRef.current.map(s => {
      const node = layer?.findOne(`#${s.id}`);
      if (node) {
        return { ...s, x: node.x(), y: node.y() };
      }
      return s;
    });

    setFreeSteps(prev => {
      const currentStepData = prev[currIdx];
      const newInitial = liveShapes.map(s => {
        const recs = currentStepData?.recordings[s.id];
        if (recs && recs.length > 0) {
          const lastFrame = recs[recs.length - 1]!;
          return { id: s.id, x: lastFrame.x, y: lastFrame.y, rotation: s.rotation, ballOwner: s.ballOwner };
        }
        // Fallback to current live position
        return { id: s.id, x: s.x, y: s.y, rotation: s.rotation, ballOwner: s.ballOwner };
      });
      return [...prev, { initial: newInitial, recordings: {} }];
    });

    setShapes(liveShapes);
    setCurrentFreeStep(currIdx + 1);
  }, [setFreeSteps, setShapes, setCurrentFreeStep]);

  return (
    <>
      <div
        className="flex flex-col bg-gray-950 text-white select-none fixed"
        style={{
          top: 0,
          left: 0,
          transform: `scale(${uiScale})`,
          transformOrigin: '0 0',
          width: `${Math.round(Math.max(490, windowSize.w) / uiScale)}px`,
          height: `${Math.round(Math.max(340, windowSize.h) / uiScale)}px`,
          touchAction: 'auto',
          margin: 0,
          padding: 0
        }}
      >
        {pendingModeSwitch !== null && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ touchAction: 'none' }}>
            <div className="rounded-xl border border-white/10 bg-gray-900 p-6 shadow-2xl w-[400px]"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-2 text-lg font-bold text-white">⚠️ Warning</h3>
              <p className="mb-6 text-sm text-white/70 text-balance">
                Changing mode will delete all recorded steps. Only the current player positions will be kept. Proceed?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); setPendingModeSwitch(null); }}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                  Cancel
                </button>
                <button
                  onPointerUp={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (pendingModeSwitch === "step") confirmSwitchToStep();
                    else if (pendingModeSwitch === "freesteps") confirmSwitchToFreeSteps();
                  }}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors shadow-lg">
                  Confirm
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        <div className="relative z-[60]">
          <CanvasHeader
            mode={mode}
            setMode={setMode}
            pendingModeSwitch={pendingModeSwitch}
            setPendingModeSwitch={setPendingModeSwitch}
            confirmSwitchToStep={confirmSwitchToStep}
            confirmSwitchToFreeSteps={confirmSwitchToFreeSteps}
            steps={steps}
            freeSteps={freeSteps}
            currentStep={currentStep}
            currentFreeStep={currentFreeStep}
            goToStep={goToStep}
            setCurrentFreeStep={setCurrentFreeStep}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            addNextStep={addNextStep}
            addFreeStep={addFreeStep}
            removeLastStep={removeLastStep}
            detenerStepPlay={detenerStepPlay}
            isLooping={isLooping}
            setIsLooping={setIsLooping}
            showPath={showPath}
            setShowPath={setShowPath}
            showTrail={showTrail}
            setShowTrail={setShowTrail}
            isRecording={isRecording}
            showVoronoi={showVoronoi}
            setShowVoronoi={setShowVoronoi}
            selectedShapeId={selectedShapeId}
            shapes={shapes}
            setShapes={setShapes}
            deleteSelected={deleteSelected}
            handleSaveBoard={handleSaveBoard}
            isSaving={isSaving}
            drawLines={drawLines}
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
            stepPlaybackProgress={stepPlaybackProgress}
            setStepPlaybackProgress={setStepPlaybackProgress}
            isSession={isSession}
            hasUnsavedChanges={hasUnsavedChanges}
          />
        </div>

        {isSession && (
          <div className="absolute top-16 right-6 z-[90] flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-orange-600/90 text-white shadow-2xl backdrop-blur-md border border-white/20 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">
              Session Instance
            </span>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden relative">
          <div className="relative z-[50]">
            <CanvasSidebar
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              setShowShapesPanel={setShowShapesPanel}
              showShapesPanel={showShapesPanel}
              setDrawLines={setDrawLines}
              isDrawTool={isDrawTool}
              penColor={penColor}
              setPenColor={setPenColor}
              penSize={penSize}
              setPenSize={setPenSize}
              eraserSize={eraserSize}
              setEraserSize={setEraserSize}
              isRecording={isRecording}
              isPlaying={isPlaying}
              isStepPlaying={false}
              selectedShapeId={selectedShapeId}
              isGlobalMode={isGlobalMode}
              setIsGlobalMode={setIsGlobalMode}
            />
          </div>

          <div ref={containerRef} className="relative flex-1 overflow-hidden flex items-start justify-start"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault();
              const type = e.dataTransfer.getData("type") as ElementType;
              if (type && (type.startsWith("player-") || ["ball", "cone", "goal"].includes(type))) {
                if (containerRef.current) {
                  const rect = containerRef.current.getBoundingClientRect();
                  const dropX = (e.clientX - rect.left) / uiScale;
                  const dropY = (e.clientY - rect.top) / uiScale;
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

            {notification && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-full shadow-xl border border-white/20 animate-bounce">
                {notification}
              </div>
            )}

            {typeof document !== 'undefined' && createPortal(
              <div ref={ghostWrapperRef} style={{ position: 'fixed', overflow: 'hidden', zIndex: 9999, pointerEvents: 'none', display: 'none' }}>
                <div ref={dragPointerRef} style={{ position: 'absolute', display: 'none', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
                  {isDraggingShapeRef.current && draggingShapeIdRef.current && (() => {
                    const shape = shapes.find(s => s.id === draggingShapeIdRef.current);
                    if (!shape) return null;
                    const r = ELEMENT_RADIUS[shape.type as ElementType] ?? 18;
                    const size = r * 2;
                    if (shape.type.startsWith("player-")) {
                      return (
                        <div style={{ width: size, height: size, backgroundColor: shape.fill, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: r, fontFamily: 'Arial' }}>
                          {shape.label ?? ""}
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
              </div>,
              document.body
            )}

            {stageSize.width > 0 && stageSize.height > 0 && (
              <Stage width={stageSize.width} height={stageSize.height}
                onPointerDown={(e) => {
                  const setSelected = (id: string | null) => setSelectedShapeId(id);
                  handleStagePointerDown(e, setSelected);
                }}
                onPointerMove={(e) => {
                  if (isDrawing && activeTool === "pen") {
                    // Pen: update active line ref directly for smooth live preview
                    const pos = e.target.getStage()?.getPointerPosition();
                    if (pos && activeDrawLineRef.current) {
                      pointsRef.current.push(pos.x, pos.y);
                      activeDrawLineRef.current.points([...pointsRef.current]);
                      activeDrawLineRef.current.getLayer()?.batchDraw();
                    }
                  } else if (isDrawing && activeTool === "eraser") {
                    // Eraser: delete lines that intersect the eraser radius in real-time
                    const pos = e.target.getStage()?.getPointerPosition();
                    if (pos) {
                      const radius = eraserSize * 5;
                      setDrawLines(prev => prev.filter(line => {
                        for (let i = 0; i < line.points.length - 1; i += 2) {
                          const px = line.points[i];
                          const py = line.points[i + 1];
                          if (px !== undefined && py !== undefined) {
                            const dist = Math.sqrt((px - pos.x) ** 2 + (py - pos.y) ** 2);
                            if (dist <= radius) return false; // erase this line
                          }
                        }
                        return true; // keep this line
                      }));
                    }
                  } else {
                    handleStagePointerMove(e);
                  }
                }}
                onPointerUp={handleStagePointerUp}
                onClick={(e) => { if (e.target === e.target.getStage()) setSelectedShapeId(null); }}
                onTap={(e) => { if (e.target === e.target.getStage()) setSelectedShapeId(null); }}>

                <Layer listening={false} hitGraphEnabled={false}>
                  <BackgroundImage width={stageSize.width} height={stageSize.height} sport={sport} />
                </Layer>
                {/* Freehand lines and geometry */}
                <Layer perfectDrawEnabled={false} listening={false}>
                  {drawLines
                    .filter(item => {
                      const stepIdx = item.stepIdx;
                      if (mode === "freesteps") {
                        // Global lines (stepIdx undefined) always show
                        // Per-freestep lines only show on their step
                        return stepIdx === undefined || stepIdx === currentFreeStep;
                      }
                      // Step mode: global (undefined) or matching step
                      return stepIdx === undefined || stepIdx === currentStep;
                    })
                    .map(item => {
                      const type = item.type ?? (item.isEraser ? "eraser" : "pen");
                      if (type === "pen" || type === "eraser") {
                        return <Line key={item.id} points={item.points} stroke={item.color}
                          strokeWidth={item.size} tension={0.4} lineCap="round" lineJoin="round"
                          globalCompositeOperation={item.isEraser ? "destination-out" : "source-over"} listening={false} />;
                      }
                      if (type === "line" || type === "arrow") {
                        const Component = (type === "arrow" ? Arrow : Line) as any;
                        return <Component key={item.id} points={item.points} stroke={item.color}
                          strokeWidth={item.size} lineCap="round" lineJoin="round"
                          pointerLength={type === 'arrow' ? item.size * 3 : undefined}
                          pointerWidth={type === 'arrow' ? item.size * 3 : undefined} listening={false} />;
                      }
                      if (type === "rect") {
                        const [x1, y1, x2, y2] = item.points;
                        if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return null;
                        return <Rect key={item.id} x={Math.min(x1, x2)} y={Math.min(y1, y2)}
                          width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} stroke={item.color} strokeWidth={item.size} listening={false} />;
                      }
                      if (type === "circle") {
                        const [x1, y1, x2, y2] = item.points;
                        if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return null;
                        const r = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                        return <Circle key={item.id} x={x1} y={y1} radius={r} stroke={item.color} strokeWidth={item.size} listening={false} />;
                      }
                      return null;
                    })}
                </Layer>

                {/* Active drawing layer - This one updates frequently, keep it isolated */}
                <Layer listening={false}>
                  {isDrawing && (
                    <>
                      {activeTool === "pen" && (
                        <Line
                          ref={activeDrawLineRef}
                          points={pointsRef.current}
                          stroke={penColor}
                          strokeWidth={penSize}
                          globalCompositeOperation="source-over"
                          tension={0.4}
                          lineCap="round"
                          lineJoin="round"
                        />
                      )}
                      {(activeTool === "line" || activeTool === "arrow") && currentLinePoints.length >= 4 && (
                        <Line
                          points={currentLinePoints}
                          stroke={penColor}
                          strokeWidth={penSize}
                          lineCap="round"
                          lineJoin="round"
                        />
                      )}
                      {activeTool === "arrow" && currentLinePoints.length >= 4 && (
                        <Arrow
                          points={currentLinePoints}
                          stroke={penColor}
                          fill={penColor}
                          strokeWidth={penSize}
                          pointerLength={penSize * 3}
                          pointerWidth={penSize * 3}
                          lineCap="round"
                          lineJoin="round"
                        />
                      )}
                      {activeTool === "rect" && currentLinePoints.length >= 4 && (() => {
                        const [x1, y1, x2, y2] = currentLinePoints;
                        return <Rect x={Math.min(x1!, x2!)} y={Math.min(y1!, y2!)} width={Math.abs(x2! - x1!)} height={Math.abs(y2! - y1!)} stroke={penColor} strokeWidth={penSize} />;
                      })()}
                      {activeTool === "circle" && currentLinePoints.length >= 4 && (() => {
                        const [x1, y1, x2, y2] = currentLinePoints;
                        const r = Math.sqrt((x2! - x1!) ** 2 + (y2! - y1!) ** 2);
                        return <Circle x={x1} y={y1} radius={r} stroke={penColor} strokeWidth={penSize} />;
                      })()}
                    </>
                  )}
                </Layer>

                <Layer listening={false}>
                  {/* Trails for recorded movements */}
                  {mode === "freesteps" && isPlaying && !isRecording && showTrail && Object.entries(freeSteps[currentFreeStep]?.recordings ?? {}).map(([shapeId, frames]) => {
                    const fs = frames as Frame[];
                    if (fs.length < 2) return null;
                    const points = fs.flatMap((f: Frame) => [f.x, f.y]);
                    const sh = shapes.find(s => s.id === shapeId);
                    return sh ? <Line key={`${shapeId}-trail`} points={points} stroke={sh.fill}
                      strokeWidth={3} tension={0.5} dash={[1, 10]} lineCap="round" listening={false} /> : null;
                  })}
                  <Line ref={liveRecordingLineRef} stroke="white" strokeWidth={3} dash={[6, 4]} lineCap="round" opacity={0.6} listening={false} />
                </Layer>

                <Layer ref={stepDragLayerRef} listening={false}>
                  <Line tension={0.5} strokeWidth={2} dash={[6, 4]} opacity={0.5} lineCap="round" lineJoin="round" visible={false} />
                  <Group listening={false} visible={false}>
                    <Circle x={0} y={0} radius={18} fill="white" stroke="rgba(255,255,255,0.5)" strokeWidth={1} opacity={0.35} />
                  </Group>
                </Layer>

                <Layer ref={voronoiLayerRef} listening={false}>
                  {showVoronoi && <Shape sceneFunc={voronoiSceneFunc} width={stageSize.width} height={stageSize.height} />}
                </Layer>

                <Layer ref={ghostLayerRef} listening={false}>
                  <GhostPlayersLayer
                    mode={mode}
                    currentStep={currentStep}
                    steps={steps}
                    shapesMeta={shapesMeta}
                    shapesRef={shapesRef}
                    draggingWaypointRef={draggingWaypointRef}
                    draggingShapeIdRef={draggingShapeIdRef}
                    isPlaying={isPlaying}
                  />
                </Layer>

                <Layer ref={layerRef} perfectDrawEnabled={false}>
                  {Object.entries(freeSteps[currentFreeStep]?.recordings ?? {}).map(([shapeId, frames]) => {
                    const fs = frames as Frame[];
                    if (fs.length < 2) return null;
                    const sh = shapes.find(s => s.id === shapeId);
                    if (!sh) return null;
                    const isBeingRecorded = (mode === "freesteps" && isRecordingRef.current && shapeId === draggingShapeIdRef.current);
                    if ((!showPath || isPlaying) && !isBeingRecorded) return null;
                    const rpts = fs.flatMap((f: Frame) => [f.x, f.y]);
                    return <Line key={`${shapeId}-path`} points={rpts} stroke={sh.fill}
                      strokeWidth={2} tension={0.5} dash={isBeingRecorded ? [] : [10, 5]} listening={false} />;
                  })}
                  {shapes
                    .slice()
                    .sort((a, b) => {
                      const aIsBall = a.type === 'ball' ? 1 : 0;
                      const bIsBall = b.type === 'ball' ? 1 : 0;
                      return aIsBall - bIsBall;
                    })
                    .map(s => renderShape(s))}

                  {mode === "step" && currentStep > 0 && !isPlaying && steps[currentStep - 1] && (steps[currentStep] || []).map(ss => {
                    const prevS = steps[currentStep - 1]?.find(ps => ps.id === ss.id);
                    if (!prevS || (ss.x === prevS.x && ss.y === prevS.y)) return null;

                    const sh = shapes.find(s => s.id === ss.id);
                    if (!sh) return null;

                    // Hide waypoints for carried balls
                    const isBallCarried = sh.type === 'ball' && prevS.ballOwner && ss.ballOwner === prevS.ballOwner;
                    if (isBallCarried) return null;

                    // Default handles are collinear (straight line)
                    const wp1 = ss.wp1 || { x: prevS.x + (ss.x - prevS.x) * 0.33, y: prevS.y + (ss.y - prevS.y) * 0.33 };
                    const wp2 = ss.wp2 || { x: prevS.x + (ss.x - prevS.x) * 0.67, y: prevS.y + (ss.y - prevS.y) * 0.67 };

                    const handleWaypointDragMove = (idx: 1 | 2, x: number, y: number) => {
                      draggingWaypointRef.current = { id: ss.id, idx, x, y };
                      ghostLayerRef.current?.batchDraw();
                    };

                    const handleWaypointDragEnd = (idx: 1 | 2, x: number, y: number) => {
                      setSteps(prev => {
                        const updated = [...prev];
                        const snap = [...(updated[currentStep] || [])];
                        const sIdx = snap.findIndex(x => x.id === ss.id);
                        if (sIdx !== -1) {
                          const item = snap[sIdx]!;
                          const w1 = idx === 1 ? { x, y } : (item.wp1 || { x: prevS.x + (item.x - prevS.x) * 0.33, y: prevS.y + (item.y - prevS.y) * 0.33 });
                          const w2 = idx === 2 ? { x, y } : (item.wp2 || { x: prevS.x + (item.x - prevS.x) * 0.67, y: prevS.y + (item.y - prevS.y) * 0.67 });
                          snap[sIdx] = { ...item, wp1: w1, wp2: w2 };
                        }
                        updated[currentStep] = snap;
                        return updated;
                      });
                      draggingWaypointRef.current = null;
                    };

                    return (
                      <Group key={`${ss.id}-waypoints`} id={`${ss.id}-wp-group`} name="wp" visible={draggingId !== ss.id}>
                        <Circle
                          id={`wp1-${ss.id}`}
                          name="wp"
                          visible={draggingId !== ss.id}
                          x={wp1.x}
                          y={wp1.y}
                          radius={6}
                          fill={sh.fill}
                          stroke="white"
                          strokeWidth={1.5}
                          draggable
                          onDragStart={() => { draggingWaypointRef.current = { id: ss.id, idx: 1, x: wp1.x, y: wp1.y }; }}
                          onDragMove={(e) => {
                            draggingWaypointRef.current = { id: ss.id, idx: 1, x: e.target.x(), y: e.target.y() };
                            ghostLayerRef.current?.batchDraw();
                          }}
                          onDragEnd={(e) => {
                            const newWp1 = { x: e.target.x(), y: e.target.y() };
                            setSteps(prev => prev.map((step, idx) => {
                              if (idx !== currentStep) return step;
                              return step.map(s => s.id === ss.id ? { ...s, wp1: newWp1 } : s);
                            }));
                            draggingWaypointRef.current = null;
                          }}
                        />
                        <Circle
                          id={`wp2-${ss.id}`}
                          name="wp"
                          visible={draggingId !== ss.id}
                          x={wp2.x}
                          y={wp2.y}
                          radius={6}
                          fill={sh.fill}
                          stroke="white"
                          strokeWidth={1.5}
                          draggable
                          onDragStart={() => { draggingWaypointRef.current = { id: ss.id, idx: 2, x: wp2.x, y: wp2.y }; }}
                          onDragMove={(e) => {
                            draggingWaypointRef.current = { id: ss.id, idx: 2, x: e.target.x(), y: e.target.y() };
                            ghostLayerRef.current?.batchDraw();
                          }}
                          onDragEnd={(e) => {
                            const newWp2 = { x: e.target.x(), y: e.target.y() };
                            setSteps(prev => prev.map((step, idx) => {
                              if (idx !== currentStep) return step;
                              return step.map(s => s.id === ss.id ? { ...s, wp2: newWp2 } : s);
                            }));
                            draggingWaypointRef.current = null;
                          }}
                        />
                      </Group>
                    );
                  })}
                </Layer>
              </Stage>
            )}
          </div>
        </div>

        <CanvasFooter
          sport={sport}
          elementColors={elementColors}
          setElementColors={setElementColors}
          setShapes={setShapes}
          addElement={addElement}
          trashZoneRef={trashZoneRef}
          canvasRef={containerRef}
          uiScale={uiScale}
        />
      </div>

      {pendingTrajectoryReset && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ touchAction: 'none' }}>
          <div className="rounded-xl border border-white/10 bg-gray-900 p-6 shadow-2xl w-[400px]"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-lg font-bold text-white uppercase tracking-tight">⚠️ Reset Trajectory</h3>
            <p className="mb-6 text-sm text-white/70 text-balance leading-relaxed">
              Moving this player in an earlier step will <span className="text-orange-400 font-bold">delete all subsequent movements</span> for them. Do you want to continue?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onPointerUp={(e) => { 
                  e.preventDefault(); e.stopPropagation(); 
                  // Revert the visual position in Konva
                  const node = layerRef.current?.findOne(`#${pendingTrajectoryReset.shapeId}`);
                  if (node) node.position({ x: pendingTrajectoryReset.prevX, y: pendingTrajectoryReset.prevY });
                  setPendingTrajectoryReset(null); 
                }}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button
                onPointerUp={(e) => { 
                  e.preventDefault(); e.stopPropagation();
                  const { shapeId, finalX: fx, finalY: fy, ballOwner: bOwner } = pendingTrajectoryReset;
                  
                  // Apply change to state and delete future recordings
                  setShapes(prev => prev.map(s => s.id === shapeId ? { ...s, x: fx, y: fy, ballOwner: bOwner } : s));
                  setFreeSteps(prev => {
                    const next = [...prev];
                    const currentIdx = currentFreeStepRef.current;

                    for (let i = currentIdx + 1; i < next.length; i++) {
                      const step = next[i];
                      if (!step) continue;

                      const newRecordings = { ...step.recordings };
                      delete newRecordings[shapeId];

                      next[i] = {
                        ...step,
                        recordings: newRecordings,
                        initial: step.initial.map(si => {
                          if (si.id === shapeId) return { ...si, x: fx, y: fy, ballOwner: bOwner };
                          if (si.id.startsWith('ball')) {
                            const ball = shapesRef.current.find(s => s.id === si.id && s.ballOwner === shapeId);
                            if (ball) return { ...si, x: fx + 12, y: fy + 12, ballOwner: shapeId };
                          }
                          return si;
                        })
                      };
                    }
                    return next;
                  });
                  
                  setPendingTrajectoryReset(null); 
                }}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500 transition-colors shadow-lg">
                Continue
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

