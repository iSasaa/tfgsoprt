import { useState, useRef, useCallback, useEffect } from "react";
import Konva from "konva";
import { api } from "~/trpc/react";

export type ElementType = "player-home" | "player-away" | "player-third" | "player-fourth" | "player-5" | "player-6" | "player-7" | "player-8" | "ball" | "cone" | "goal";
export type StepSnapshotItem = {
  id: string;
  x: number;
  y: number;
  wp1?: { x: number; y: number } | null;
  wp2?: { x: number; y: number } | null;
  rotation?: number;
  ballOwner?: string | null
};
export type StepSnapshot = StepSnapshotItem[];
export type Recordings = Record<string, { x: number; y: number; time: number }[]>;
export type FreeStepSnapshot = { initial: StepSnapshot; recordings: Recordings };
export type ShapeData = { id: string; type: ElementType; x: number; y: number; rotation?: number; fill: string; label?: string; ballOwner?: string | null; isGlobal?: boolean };

interface UseBoardStateProps {
  boardId: string;
  initialData: any;
  sport: string;
  stageSize: { width: number; height: number };
  elementColors: Record<ElementType, string>;
  voronoiLayerRef: React.RefObject<Konva.Layer | null>;
  mode: "freesteps" | "step";
  setMode: (mode: "freesteps" | "step") => void;
  isSession?: boolean;
}

export const useBoardState = ({
  boardId,
  initialData,
  sport,
  stageSize,
  elementColors,
  voronoiLayerRef,
  mode,
  setMode,
  isSession
}: UseBoardStateProps) => {
  const [shapes, setShapes] = useState<ShapeData[]>(() =>
    initialData?.shapes ? (initialData.shapes as ShapeData[]) : []
  );
  const [drawLines, setDrawLines] = useState<any[]>(() =>
    initialData?.drawLines ? (initialData.drawLines as any[]) : []
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
  const [isGlobalMode, setIsGlobalMode] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setHasUnsavedChanges(true);
  }, [shapes, drawLines, steps, freeSteps]);

  const shapesRef = useRef(shapes);
  const stepsRef = useRef(steps);

  useEffect(() => {
    shapesRef.current = shapes;
    stepsRef.current = steps;
  }, [shapes, steps]);

  useEffect(() => {
    if (mode === "freesteps" && !isPlaying && !isRecording) {
      const stepData = freeSteps[currentFreeStep];
      if (stepData?.initial) {
        setShapes(prev => prev.map(s => {
          const init = stepData.initial.find(ss => ss.id === s.id);
          return init ? { ...s, x: init.x, y: init.y, rotation: init.rotation ?? s.rotation, ballOwner: init.ballOwner ?? s.ballOwner } : s;
        }));
      }
    }
  }, [currentFreeStep, mode, isPlaying, isRecording, freeSteps]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const syncStepsWithShapes = useCallback((currentShapes: ShapeData[], targetSteps: StepSnapshot[]) => {
    if (mode !== "step") return targetSteps;

    const globalShapes = currentShapes.filter(s => s.isGlobal);
    const hasGlobal = globalShapes.length > 0;

    return targetSteps.map((snap, idx) => {
      if (idx === currentStep) {
        const snapMap = new Map(snap.map(ss => [ss.id, ss]));
        return currentShapes.map(s => {
          const oldS = snapMap.get(s.id);
          return { id: s.id, x: s.x, y: s.y, wp1: oldS?.wp1, wp2: oldS?.wp2, rotation: s.rotation, ballOwner: s.ballOwner };
        });
      }

      if (!hasGlobal) return snap;

      let changed = false;
      const updatedSnap = snap.map(ss => {
        const globalSource = globalShapes.find(gs => gs.id === ss.id);
        if (globalSource && (globalSource.x !== ss.x || globalSource.y !== ss.y || globalSource.rotation !== ss.rotation)) {
          changed = true;
          return { ...ss, x: globalSource.x, y: globalSource.y, rotation: globalSource.rotation, ballOwner: globalSource.ballOwner };
        }
        return ss;
      });
      return changed ? updatedSnap : snap;
    });
  }, [mode, currentStep]);

  const setShapesWithSync = useCallback((updater: ShapeData[] | ((prev: ShapeData[]) => ShapeData[])) => {
    setShapes(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  }, []);

  const utils = api.useUtils();
  const updateSessionDrillMutation = api.calendar.updateEventDrillData.useMutation({
    onSuccess: () => {
      setNotification("Session drill updated successfully");
      setHasUnsavedChanges(false);
    }
  });

  const saveMutation = api.board.update.useMutation({
    onSuccess: () => {
      void utils.board.getById.invalidate({ id: boardId });
      setHasUnsavedChanges(false);
    },
  });

  const isSaving = saveMutation.isPending || updateSessionDrillMutation.isPending;

  const handleSaveBoard = (currentDrawLines: any[]) => {
    const w = stageSize.width;
    const h = stageSize.height;
    const normalizeX = (x: number, width: number) => x / width;
    const normalizeY = (y: number, height: number) => y / height;

    const normShape = (s: ShapeData) => ({ ...s, x: normalizeX(s.x, w), y: normalizeY(s.y, h) });
    const normSnap = (ss: any) => ({
      ...ss,
      x: normalizeX(ss.x, w), y: normalizeY(ss.y, h),
    });

    const data = {
      shapes: shapes.map(normShape),
      steps: steps.map((step, idx) => {
        if (idx === currentStep && mode === "step") {
          return shapes.map(s => {
            const oldS = step.find(ss => ss.id === s.id);
            return { id: s.id, x: s.x, y: s.y, wp1: oldS?.wp1, wp2: oldS?.wp2, rotation: s.rotation, ballOwner: s.ballOwner };
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
      drawLines: currentDrawLines.map(dl => ({
        ...dl,
        points: dl.points.map((p: number, i: number) => i % 2 === 0 ? normalizeX(p, w) : normalizeY(p, h)),
      })),
    };

    if (isSession) {
      updateSessionDrillMutation.mutate({ id: boardId, data });
    } else {
      saveMutation.mutate({ id: boardId, data });
    }
  };

  const getNextLabel = useCallback((type: ElementType) => {
    if (!type.startsWith("player")) return undefined;
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
        const snap = shapesRef.current.map(s => ({ id: s.id, x: s.x, y: s.y, wp1: null, wp2: null, rotation: s.rotation, ballOwner: s.ballOwner }));
        setCurrentStep(0);
        return [snap];
      }
      return prev;
    });
  }, [setMode]);

  const saveCurrentStep = useCallback((overrideShapes?: ShapeData[]) => {
    const targetShapes = overrideShapes ?? shapesRef.current;
    setSteps(prev => {
      const updated = [...prev];
      if (!updated[currentStep]) return prev;
      const oldSnap = updated[currentStep];

      const stepChanges = targetShapes.map(s => {
        const os = oldSnap?.find(x => x.id === s.id);
        if (os && (os.x !== s.x || os.y !== s.y || (os.rotation ?? 0) !== (s.rotation ?? 0) || os.ballOwner !== s.ballOwner)) {
          return {
            id: s.id,
            oldPos: { x: os.x, y: os.y },
            newPos: { x: s.x, y: s.y },
            oldRotation: os.rotation ?? 0,
            newRotation: s.rotation ?? 0,
            oldBallOwner: os.ballOwner,
            newBallOwner: s.ballOwner
          };
        }
        return null;
      }).filter((c): c is NonNullable<typeof c> => c !== null);

      const snap = targetShapes.map(s => {
        const os = oldSnap?.find(x => x.id === s.id);
        return { id: s.id, x: s.x, y: s.y, wp1: os?.wp1, wp2: os?.wp2, rotation: s.rotation, ballOwner: s.ballOwner };
      });
      updated[currentStep] = snap;

      for (let i = currentStep + 1; i < updated.length; i++) {
        const nextSnap = updated[i];
        if (!nextSnap) continue;
        updated[i] = nextSnap.map(ss => {
          const change = stepChanges.find(c => c.id === ss.id);
          if (change) {
            const isStationaryPos = ss.x === change.oldPos.x && ss.y === change.oldPos.y;
            const isStationaryRot = (ss.rotation ?? 0) === change.oldRotation;
            const isStationaryBall = ss.ballOwner === change.oldBallOwner;

            if (isStationaryPos || isStationaryRot || isStationaryBall) {
              return {
                ...ss,
                x: isStationaryPos ? change.newPos.x : ss.x,
                y: isStationaryPos ? change.newPos.y : ss.y,
                rotation: isStationaryRot ? change.newRotation : ss.rotation,
                ballOwner: isStationaryBall ? change.newBallOwner : ss.ballOwner
              };
            }
          }
          return ss;
        });
      }

      for (let i = currentStep; i < updated.length; i++) {
        const stepSnap = updated[i];
        if (!stepSnap) continue;
        updated[i] = stepSnap.map(ss => {
          if (ss.id.startsWith('ball') && ss.ballOwner) {
            const owner = stepSnap.find(s => s.id === ss.ballOwner);
            if (owner) {
              return { ...ss, x: owner.x + 12, y: owner.y + 12, wp1: null, wp2: null };
            }
          }
          return ss;
        });
      }

      return updated;
    });
  }, [currentStep]);

  const goToStep = useCallback((idx: number) => {
    if (idx < 0 || idx >= steps.length) return;
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
    setSteps(prev => {
      const lastSnap = prev[prev.length - 1];
      if (!lastSnap) return prev;
      const newSnap = lastSnap.map(s => ({ ...s, wp1: null, wp2: null }));
      const updated = [...prev, newSnap];
      const newIdx = updated.length - 1;

      setShapes(prevShapes => prevShapes.map(s => {
        const snapItem = newSnap.find(si => si.id === s.id);
        return snapItem ? { ...s, x: snapItem.x, y: snapItem.y, rotation: snapItem.rotation, ballOwner: snapItem.ballOwner } : s;
      }));

      setCurrentStep(newIdx);
      return updated;
    });
  }, [currentStep, saveCurrentStep]);

  const removeLastStep = useCallback(() => {
    if (mode === "step") {
      if (steps.length <= 1) return;
      setSteps(prev => {
        const ns = prev.slice(0, -1);
        const newIdx = Math.min(currentStep, ns.length - 1);
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
    } else {
      if (freeSteps.length <= 1) return;
      setFreeSteps(prev => {
        const ns = prev.slice(0, -1);
        const newIdx = Math.min(currentFreeStep, ns.length - 1);
        setCurrentFreeStep(newIdx);
        const stepData = ns[newIdx];
        if (stepData?.initial) {
          setShapes(prevShapes => prevShapes.map(s => {
            const init = stepData.initial.find(ss => ss.id === s.id);
            return init ? { ...s, x: init.x, y: init.y, rotation: init.rotation, ballOwner: init.ballOwner } : s;
          }));
        }
        return ns;
      });
    }
  }, [mode, steps.length, freeSteps.length, currentStep, currentFreeStep, setShapes]);

  const addElement = useCallback((type: ElementType, dropX?: number, dropY?: number) => {
    const id = `${type}-${Date.now()}`;
    const label = getNextLabel(type);
    const newShape: ShapeData = {
      id, type, fill: elementColors[type],
      x: dropX ?? stageSize.width / 2 + (Math.random() - 0.5) * 60,
      y: dropY ?? stageSize.height / 2 + (Math.random() - 0.5) * 60,
      rotation: 0,
      label,
      isGlobal: isGlobalMode
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

    setSteps(prev =>
      prev.map(snap => [...snap, { id: newShape.id, x: newShape.x, y: newShape.y, rotation: 0, wp1: null, wp2: null }])
    );

    setFreeSteps(prev => prev.map(fs => ({
      ...fs,
      initial: [...fs.initial, { id: newShape.id, x: newShape.x, y: newShape.y, rotation: 0 }]
    })));

    if (mode === "freesteps" && currentFreeStep > 0) {
      setCurrentFreeStep(0);
      setNotification("Player added. Returning to Step 0 to place them.");
    }

    if (type.startsWith("player")) {
      setTimeout(() => voronoiLayerRef.current?.batchDraw(), 10);
    }
  }, [elementColors, getNextLabel, mode, stageSize, voronoiLayerRef, currentStep, currentFreeStep, steps, setShapes]);

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
    shapes, setShapes: setShapesWithSync, shapesRef,
    drawLines, setDrawLines,
    steps, setSteps, stepsRef,
    freeSteps, setFreeSteps,
    mode, setMode,
    currentStep, setCurrentStep,
    currentFreeStep, setCurrentFreeStep,
    selectedShapeId, setSelectedShapeId,
    handleSaveBoard, saveMutation, isSaving,
    addElement, deleteSelected, rotateSelected,
    goToStep, addNextStep, removeLastStep, enterStepMode, saveCurrentStep,
    isGlobalMode, setIsGlobalMode,
    isRecording, setIsRecording,
    isPlaying, setIsPlaying,
    syncStepsWithShapes,
    notification,
    hasUnsavedChanges, setHasUnsavedChanges
  };
};
