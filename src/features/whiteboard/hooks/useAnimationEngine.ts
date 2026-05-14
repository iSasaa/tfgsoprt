import { useCallback, useRef, useState, useEffect } from "react";
import Konva from "konva";

export type StepSnapshotItem = {
  id: string;
  x: number;
  y: number;
  rotation?: number; 
  wp1?: { x: number; y: number }; 
  wp2?: { x: number; y: number }; 
  ballOwner?: string | null;
};
export type StepSnapshot = StepSnapshotItem[];

interface UseAnimationEngineProps {
  layerRef: React.RefObject<Konva.Layer | null>;
  voronoiLayerRef: React.RefObject<Konva.Layer | null>;
  stepsRef: React.MutableRefObject<StepSnapshot[]>;
  shapesRef: React.MutableRefObject<any[]>;
  setShapes: React.Dispatch<React.SetStateAction<any[]>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  stepPlaySpeed: number;
  isLooping: boolean;
  autoAdvanceRef: React.MutableRefObject<boolean>;
}

export const useAnimationEngine = ({
  layerRef,
  voronoiLayerRef,
  stepsRef,
  shapesRef,
  setShapes,
  setCurrentStep,
  stepPlaySpeed,
  isLooping,
  autoAdvanceRef,
}: UseAnimationEngineProps) => {
  const [isStepPlaying, setIsStepPlaying] = useState(false);
  const isStepPlayingRef = useRef(false);
  const stepPlayRef = useRef<number | null>(null);

  const pauseStepPlay = useCallback(() => {
    setIsStepPlaying(false);
    isStepPlayingRef.current = false;
    if (stepPlayRef.current !== null) {
      cancelAnimationFrame(stepPlayRef.current);
      stepPlayRef.current = null;
    }
    const layer = layerRef.current;
    if (layer) {
      setShapes(prev => prev.map(s => {
        const node = layer.findOne(`#${s.id}`);
        return node ? { ...s, x: node.x(), y: node.y() } : s;
      }));
    }
  }, [layerRef, setShapes]);

  const animateStepTransition = useCallback(
    (fromSnap: StepSnapshot, toSnap: StepSnapshot, stepIdx: number, durationMs: number) => {
      const start = performance.now();

      const tick = (now: number) => {
        if (!isStepPlayingRef.current) return;

        const elapsed = now - start;
        const t = Math.min(elapsed / durationMs, 1);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        const layer = layerRef.current;
        if (layer) {
          fromSnap.forEach(from => {
            const to = toSnap.find(ss => ss.id === from.id);
            if (!to) return;
            const node = layer.findOne(`#${from.id}`);
            if (node) {
              const ddx = to.x - from.x;
              const ddy = to.y - from.y;

              const wp1 = to.wp1 ?? { x: from.x + ddx * 0.33, y: from.y + ddy * 0.33 };
              const wp2 = to.wp2 ?? { x: from.x + ddx * 0.66, y: from.y + ddy * 0.66 };

              const pts = [from, wp1, wp2, to];
              const numSegments = 3;
              let segment = Math.floor(ease * numSegments);
              if (segment >= numSegments) segment = numSegments - 1;
              const local_t = (ease * numSegments) - segment;

              const p0 = segment === 0 ? pts[0]! : pts[segment - 1]!;
              const p1 = pts[segment]!;
              const p2 = pts[segment + 1]!;
              const p3 = segment === numSegments - 1 ? pts[numSegments]! : pts[segment + 2]!;

              const t2 = local_t * local_t;
              const t3 = t2 * local_t;

              const tau = 0.5;
              const b1 = -tau * t3 + 2 * tau * t2 - tau * local_t;
              const b2 = (2 - tau) * t3 + (tau - 3) * t2 + 1;
              const b3 = (tau - 2) * t3 + (3 - 2 * tau) * t2 + tau * local_t;
              const b4 = tau * t3 - tau * t2;

              const bx = p0.x * b1 + p1.x * b2 + p2.x * b3 + p3.x * b4;
              const by = p0.y * b1 + p1.y * b2 + p2.y * b3 + p3.y * b4;

              node.position({ x: bx, y: by });
            }
          });

          shapesRef.current.forEach(s => {
            if (s.type === 'ball') {
              const fromOwner = fromSnap.find(f => f.id === s.id)?.ballOwner;
              const toOwner = toSnap.find(f => f.id === s.id)?.ballOwner;
              if (fromOwner && fromOwner === toOwner) {
                const ballNode = layer.findOne(`#${s.id}`);
                const ownerNode = layer.findOne(`#${fromOwner}`);
                if (ballNode && ownerNode) {
                  ballNode.position({ x: ownerNode.x() + 12, y: ownerNode.y() + 12 });
                }
              }
            }
          });

          layer.batchDraw();
          voronoiLayerRef.current?.batchDraw();
        }

        if (t < 1) {
          stepPlayRef.current = requestAnimationFrame(tick);
        } else {
          setShapes(prev => prev.map(s => {
            const snap = toSnap.find(ss => ss.id === s.id);
            return snap ? { ...s, x: snap.x, y: snap.y, ballOwner: snap.ballOwner } : s;
          }));
          setCurrentStep(stepIdx);

          const nextIdx = stepIdx + 1;
          const allSteps = stepsRef.current;
          if (nextIdx < allSteps.length) {
            const nextFrom = allSteps[stepIdx]!;
            const nextTo = allSteps[nextIdx]!;
            const delay = autoAdvanceRef.current ? 0 : 300;
            setTimeout(() => {
              if (!isStepPlayingRef.current) return;
              animateStepTransition(nextFrom, nextTo, nextIdx, durationMs);
            }, delay);
          } else {
            if (isLooping) {
              setCurrentStep(0);
              setTimeout(() => {
                const s0 = allSteps[0];
                const s1 = allSteps[1];
                if (s0 && s1 && isStepPlayingRef.current) animateStepTransition(s0, s1, 1, durationMs);
              }, 500);
            } else {
              setCurrentStep(allSteps.length - 1);
              isStepPlayingRef.current = false;
              setIsStepPlaying(false);
              stepPlayRef.current = null;
            }
          }
        }
      };
      stepPlayRef.current = requestAnimationFrame(tick);
    },
    [autoAdvanceRef, isLooping, layerRef, setCurrentStep, setShapes, shapesRef, stepsRef, voronoiLayerRef]
  );

  const startStepPlay = useCallback(() => {
    const allSteps = stepsRef.current;
    if (allSteps.length < 2) return;
    
    setCurrentStep(0);
    const snap0 = allSteps[0];
    if (snap0) {
      setShapes(prev => prev.map(s => {
        const ss = snap0.find(x => x.id === s.id);
        return ss ? { ...s, ...ss } : s;
      }));
    }
    
    setIsStepPlaying(true);
    isStepPlayingRef.current = true;
    const durationMs = stepPlaySpeed * 1000;
    
    setTimeout(() => {
      const s0 = stepsRef.current[0];
      const s1 = stepsRef.current[1];
      if (s0 && s1) animateStepTransition(s0, s1, 1, durationMs);
    }, 50);
  }, [animateStepTransition, setCurrentStep, setShapes, stepPlaySpeed, stepsRef]);

  const stopStepPlay = useCallback(() => {
    pauseStepPlay();
  }, [pauseStepPlay]);

  const toggleStepPlay = useCallback(() => {
    if (isStepPlaying) stopStepPlay();
    else startStepPlay();
  }, [isStepPlaying, startStepPlay, stopStepPlay]);

  return {
    isStepPlaying,
    startStepPlay,
    stopStepPlay,
    pauseStepPlay,
    toggleStepPlay,
    animateStepTransition
  };
};
