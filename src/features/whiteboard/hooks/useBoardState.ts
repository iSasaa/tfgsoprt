import { useState, useRef, useCallback, useEffect } from "react";
import Konva from "konva";
import { api } from "~/trpc/react";

export type ElementType = "player-home" | "player-away" | "ball" | "cone" | "goal";
export type StepSnapshotItem = { id: string; x: number; y: number; rotation?: number; wp1?: { x: number; y: number }; wp2?: { x: number; y: number }; ballOwner?: string | null };
export type StepSnapshot = StepSnapshotItem[];
export type Recordings = Record<string, { x: number; y: number; time: number }[]>;
export type FreeStepSnapshot = { initial: StepSnapshot; recordings: Recordings };
export type ShapeData = { id: string; type: ElementType; x: number; y: number; rotation?: number; fill: string; label?: string; ballOwner?: string | null };

interface UseBoardStateProps {
  boardId: string;
  initialData: any;
  sport: string;
  stageSize: { width: number; height: number };
  elementColors: Record<ElementType, string>;
  voronoiLayerRef: React.RefObject<Konva.Layer | null>;
  mode: "freesteps" | "step";
}

export const useBoardState = ({
  boardId,
  initialData,
  sport,
  stageSize,
  elementColors,
  voronoiLayerRef,
  mode
}: UseBoardStateProps) => {
  const [shapes, setShapes] = useState<ShapeData[]>(() =>
    initialData?.shapes ? (initialData.shapes as ShapeData[]) : []
  );
  const [steps, setSteps] = useState<StepSnapshot[]>(() => {
    if (initialData?.steps && initialData.steps.length > 0) return initialData.steps as StepSnapshot[];
    if (initialData?.shapes && initialData.shapes.length > 0) {
      return [((initialData.shapes as ShapeData[]).map(s => ({ id: s.id, x: s.x, y: s.y })))];
    }
    return [[]];
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [freeSteps, setFreeSteps] = useState<FreeStepSnapshot[]>(() =>
    initialData?.freeSteps ? (initialData.freeSteps as FreeStepSnapshot[]) : [{ initial: initialData?.shapes ?? [], recordings: {} }]
  );
  const [currentFreeStep, setCurrentFreeStep] = useState(0);

  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  const shapesRef = useRef(shapes);
  const stepsRef = useRef(steps);

  useEffect(() => {
    shapesRef.current = shapes;
    stepsRef.current = steps;
  }, [shapes, steps]);

  const utils = api.useUtils();
  const saveMutation = api.board.update.useMutation({
    onSuccess: () => { void utils.board.getById.invalidate({ id: boardId }); },
  });

  const handleSaveBoard = (drawLines: any[]) => {
    const w = stageSize.width;
    const h = stageSize.height;
    const normalizeX = (x: number, width: number) => x / width;
    const normalizeY = (y: number, height: number) => y / height;
    
    const normShape = (s: ShapeData) => ({ ...s, x: normalizeX(s.x, w), y: normalizeY(s.y, h) });
    const normSnap = (ss: any) => ({
      ...ss,
      x: normalizeX(ss.x, w), y: normalizeY(ss.y, h),
      wp1: ss.wp1 ? { x: normalizeX(ss.wp1.x, w), y: normalizeY(ss.wp1.y, h) } : undefined,
      wp2: ss.wp2 ? { x: normalizeX(ss.wp2.x, w), y: normalizeY(ss.wp2.y, h) } : undefined,
    });

    const data = {
      shapes: shapes.map(normShape),
      steps: steps.map(step => step.map(normSnap)),
      freeSteps: freeSteps.map(fs => ({
        ...fs,
        initial: fs.initial.map(normSnap),
        recordings: Object.fromEntries(
          Object.entries(fs.recordings).map(([id, frames]) => [
            id, frames.map(f => ({ ...f, x: normalizeX(f.x, w), y: normalizeY(f.y, h) })),
          ])
        ),
      })),
      drawLines: drawLines.map(dl => ({
        ...dl,
        points: dl.points.map((p: number, i: number) => i % 2 === 0 ? normalizeX(p, w) : normalizeY(p, h)),
      })),
    };
    saveMutation.mutate({ id: boardId, data });
  };

  const getNextLabel = useCallback((type: ElementType) => {
    if (type !== "player-home" && type !== "player-away") return undefined;
    const existingNums = shapes
      .filter(s => s.type === type && s.label && !isNaN(Number(s.label)))
      .map(s => Number(s.label));
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    return String(maxNum + 1);
  }, [shapes]);

  const addElement = useCallback((type: ElementType, dropX?: number, dropY?: number) => {
    const id = `${type}-${Date.now()}`;
    const label = getNextLabel(type);
    const newShape: ShapeData = {
      id, type, fill: elementColors[type],
      x: dropX ?? stageSize.width / 2 + (Math.random() - 0.5) * 60,
      y: dropY ?? stageSize.height / 2 + (Math.random() - 0.5) * 60,
      rotation: 0,
      label,
    };
    setShapes(prev => [...prev, newShape]);
    if (type === "player-home" || type === "player-away") {
      setTimeout(() => voronoiLayerRef.current?.batchDraw(), 10);
    }
    if (mode === "step") {
      setSteps(prev => prev.map(snap => [...snap, { id: newShape.id, x: newShape.x, y: newShape.y, rotation: 0 }]));
    }
  }, [elementColors, getNextLabel, mode, stageSize, voronoiLayerRef]);

  const deleteSelected = useCallback(() => {
    if (!selectedShapeId) return;
    setShapes(prev => prev.filter(s => s.id !== selectedShapeId));
    if (mode === "step") {
      setSteps(prev => prev.map(snap => snap.filter(ss => ss.id !== selectedShapeId)));
    }
    setSelectedShapeId(null);
  }, [selectedShapeId, mode]);

  const rotateSelected = useCallback(() => {
    if (selectedShapeId) {
      setShapes(prev => prev.map(s => {
        if (s.id === selectedShapeId) {
          const newRotation = (s.rotation ?? 0) + 90;
          return { ...s, rotation: newRotation };
        }
        return s;
      }));

      if (mode === "step") {
        setSteps(prev => {
          const newSteps = [...prev];
          const snap = [...newSteps[currentStep]!];
          const idx = snap.findIndex(s => s.id === selectedShapeId);
          if (idx !== -1) {
            snap[idx] = { ...snap[idx]!, rotation: (snap[idx]!.rotation ?? 0) + 90 };
          }
          newSteps[currentStep] = snap;
          return newSteps;
        });
      }
    }
  }, [selectedShapeId, mode, currentStep]);

  return {
    shapes, setShapes, shapesRef,
    steps, setSteps, stepsRef, currentStep, setCurrentStep,
    freeSteps, setFreeSteps, currentFreeStep, setCurrentFreeStep,
    isRecording, setIsRecording,
    isPlaying, setIsPlaying,
    selectedShapeId, setSelectedShapeId,
    handleSaveBoard, saveMutation,
    addElement, deleteSelected, rotateSelected
  };
};
