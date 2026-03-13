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
  setMode: (mode: "freesteps" | "step") => void;
}

export const useBoardState = ({
  boardId,
  initialData,
  sport,
  stageSize,
  elementColors,
  voronoiLayerRef,
  mode,
  setMode
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
  const [notification, setNotification] = useState<string | null>(null);

  const shapesRef = useRef(shapes);
  const stepsRef = useRef(steps);

  useEffect(() => {
    shapesRef.current = shapes;
    stepsRef.current = steps;
  }, [shapes, steps]);

  // Auto-clear notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Reactive Sync: Keep steps[currentStep] updated with shapes state in step mode
  useEffect(() => {
    if (mode === "step") {
      setSteps(prev => {
        if (!prev[currentStep]) return prev;
        const oldSnap = prev[currentStep];
        const newSnap = shapes.map(s => {
          const oldS = oldSnap?.find(ss => ss.id === s.id);
          return { id: s.id, x: s.x, y: s.y, rotation: s.rotation, wp1: oldS?.wp1, wp2: oldS?.wp2, ballOwner: s.ballOwner };
        });
        
        // Only update if changed to avoid infinite loops
        const hasChanged = JSON.stringify(oldSnap) !== JSON.stringify(newSnap);
        if (hasChanged) {
          const updated = [...prev];
          updated[currentStep] = newSnap;
          return updated;
        }
        return prev;
      });
    }
  }, [shapes, mode, currentStep]);

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
      steps: steps.map((step, idx) => {
        if (idx === currentStep && mode === "step") {
          // Robust manual sync for the current step
          return shapes.map(s => {
            const oldS = step.find(ss => ss.id === s.id);
            return { id: s.id, x: s.x, y: s.y, rotation: s.rotation, wp1: oldS?.wp1, wp2: oldS?.wp2, ballOwner: s.ballOwner };
          }).map(normSnap);
        }
        return step.map(normSnap);
      }),
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
    const consumed = new Set(
      shapes
        .filter(s => s.type === type && s.label && !isNaN(Number(s.label)))
        .map(s => Number(s.label))
    );
    let n = 1;
    while (consumed.has(n)) n++;
    return String(n);
  }, [shapes]);


  const enterStepMode = useCallback(() => {
    setMode("step");
    setSteps(prev => {
      if (prev.length === 0 || (prev.length === 1 && prev[0]?.length === 0)) {
        const snap = shapesRef.current.map(s => ({ id: s.id, x: s.x, y: s.y, rotation: s.rotation, ballOwner: s.ballOwner }));
        setCurrentStep(0);
        return [snap];
      }
      return prev;
    });
  }, [setMode]);

  const saveCurrentStep = useCallback(() => {
    setSteps(prev => {
      const updated = [...prev];
      const oldSnap = updated[currentStep];
      const snap = shapesRef.current.map(s => {
        const oldS = oldSnap?.find(ss => ss.id === s.id);
        return { id: s.id, x: s.x, y: s.y, rotation: s.rotation, wp1: oldS?.wp1, wp2: oldS?.wp2, ballOwner: s.ballOwner };
      });
      updated[currentStep] = snap;
      return updated;
    });
  }, [currentStep]);

  const goToStep = useCallback((idx: number) => {
    if (idx < 0 || idx >= steps.length) return;
    
    // Save current step before jumping
    saveCurrentStep();
    
    setCurrentStep(idx);
    const snap = steps[idx];
    if (snap) {
      setShapes(prev => prev.map(s => {
        const item = snap.find(si => si.id === s.id);
        if (item) return { ...s, x: item.x, y: item.y, rotation: item.rotation ?? s.rotation, ballOwner: item.ballOwner ?? s.ballOwner };
        return s;
      }));
    }
    setTimeout(() => voronoiLayerRef.current?.batchDraw(), 10);
  }, [steps, setShapes, voronoiLayerRef, saveCurrentStep]);

  const addNextStep = useCallback(() => {
    saveCurrentStep();
    setSteps(prev => {
      const updated = [...prev];
      const lastSnap = updated[currentStep];
      const newSnap = shapesRef.current.map(s => ({ id: s.id, x: s.x, y: s.y, rotation: s.rotation, ballOwner: s.ballOwner }));
      updated.splice(currentStep + 1, 0, newSnap);
      return updated;
    });
    setCurrentStep(prev => prev + 1);
  }, [currentStep, saveCurrentStep]);

  const removeLastStep = useCallback(() => {
    if (steps.length <= 1) return;
    setSteps(prev => {
      const ns = prev.filter((_, i) => i !== currentStep);
      const newIdx = Math.max(0, currentStep - 1);
      setCurrentStep(newIdx);
      const snapshot = ns[newIdx];
      if (snapshot) {
        setShapes(prevShapes => prevShapes.map(s => {
          const snap = snapshot.find(ss => ss.id === s.id);
          return snap ? { ...s, x: snap.x, y: snap.y, rotation: snap.rotation, ballOwner: snap.ballOwner } : s;
        }));
      }
      return ns;
    });
  }, [steps, currentStep, setShapes]);

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

    const isJumpNeeded = mode === "step" && currentStep > 0;
    const targetIdx = isJumpNeeded ? 0 : currentStep;

    if (isJumpNeeded) {
      setCurrentStep(0);
      setNotification("Jumped to Step 1 to place the new player");
      const snap0 = steps[0];
      if (snap0) {
        setShapes(prev => [
          ...prev.map(s => {
            const ss = snap0.find(x => x.id === s.id);
            return ss ? { ...s, x: ss.x, y: ss.y, rotation: ss.rotation } : s;
          }),
          newShape
        ]);
      } else {
        setShapes(prev => [...prev, newShape]);
      }
    } else {
      setShapes(prev => [...prev, newShape]);
    }

    if (type === "player-home" || type === "player-away") {
      setTimeout(() => voronoiLayerRef.current?.batchDraw(), 10);
    }
    
    // ONLY add to the target step, not all steps (as requested)
    setSteps(prev => prev.map((snap, idx) => 
      idx === targetIdx ? [...snap, { id: newShape.id, x: newShape.x, y: newShape.y, rotation: 0 }] : snap
    ));
    
    setFreeSteps(prev => prev.map(fs => ({
      ...fs,
      initial: [...fs.initial, { id: newShape.id, x: newShape.x, y: newShape.y, rotation: 0 }]
    })));
  }, [elementColors, getNextLabel, mode, stageSize, voronoiLayerRef, currentStep, steps, setShapes]);

  const deleteSelected = useCallback(() => {
    if (!selectedShapeId) return;
    setShapes(prev => prev.filter(s => s.id !== selectedShapeId));
    setSteps(prev => prev.map(snap => snap.filter(ss => ss.id !== selectedShapeId)));
    setFreeSteps(prev => prev.map(fs => ({
      ...fs,
      initial: fs.initial.filter(si => si.id !== selectedShapeId),
      recordings: Object.fromEntries(Object.entries(fs.recordings).filter(([id]) => id !== selectedShapeId))
    })));
    setSelectedShapeId(null);
  }, [selectedShapeId, setShapes]);

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
  }, [selectedShapeId, mode, currentStep, setShapes]);

  return {
    shapes, setShapes, shapesRef,
    steps, setSteps, stepsRef, currentStep, setCurrentStep,
    freeSteps, setFreeSteps, currentFreeStep, setCurrentFreeStep,
    isRecording, setIsRecording,
    isPlaying, setIsPlaying,
    selectedShapeId, setSelectedShapeId,
    handleSaveBoard, saveMutation,
    addElement, deleteSelected, rotateSelected,
    goToStep, addNextStep, removeLastStep, enterStepMode, saveCurrentStep,
    notification
  };
};
