import { useState, useCallback, useRef } from "react";
import Konva from "konva";

export type ToolType = "select" | "pen" | "eraser" | "line" | "arrow" | "rect" | "circle";
export type DrawLine = { id: string; points: number[]; color: string; size: number; isEraser?: boolean; type?: string; stepIdx?: number };

interface UseDrawingToolsProps {
  initialDrawLines: DrawLine[];
  currentStep?: number;
  currentFreeStep?: number;
  mode?: "step" | "freesteps";
  isGlobalMode?: boolean;
}

export const useDrawingTools = ({ initialDrawLines, currentStep, currentFreeStep, mode, isGlobalMode }: UseDrawingToolsProps) => {
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [penColor, setPenColor] = useState("#000000");
  const [penSize, setPenSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(4);
  const [drawLines, setDrawLines] = useState<DrawLine[]>(initialDrawLines);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLinePoints, setCurrentLinePoints] = useState<number[]>([]);
  const pointsRef = useRef<number[]>([]);
  const lastUpdateTimeRef = useRef<number>(0);

  const isDrawTool = (t: string) => ["pen", "eraser", "line", "arrow", "rect", "circle"].includes(t);

  const handleStagePointerDown = useCallback((e: any, setSelectedShapeId: (id: string | null) => void) => {
    const className = e.target?.getClassName?.() as string | undefined;
    if (className === 'Stage' || className === 'Image') {
      setSelectedShapeId(null);
    }
    if (!isDrawTool(activeTool)) return;
    const pos = (e.target.getStage() as Konva.Stage | null)?.getPointerPosition();
    if (!pos) return;
    setIsDrawing(true);
    setCurrentLinePoints([pos.x, pos.y]);
    pointsRef.current = [pos.x, pos.y];
  }, [activeTool]);

  const handleStagePointerMove = useCallback((e: any) => {
    if (!isDrawTool(activeTool) || !isDrawing) return;
    const pos = (e.target.getStage() as Konva.Stage | null)?.getPointerPosition();
    if (!pos) return;

    if (activeTool === "pen" || activeTool === "eraser") {
      pointsRef.current.push(pos.x, pos.y);

      const now = Date.now();
      const isFreeHand = activeTool === "pen" || activeTool === "eraser";
      if (!isFreeHand) {
        if (now - lastUpdateTimeRef.current > 33) {
          lastUpdateTimeRef.current = now;
          setCurrentLinePoints([...pointsRef.current]);
        }
      }
    } else {
      pointsRef.current = [pointsRef.current[0]!, pointsRef.current[1]!, pos.x, pos.y];
      setCurrentLinePoints([...pointsRef.current]);
    }
  }, [activeTool, isDrawing]);

  const handleStagePointerUp = useCallback(() => {
    if (!isDrawTool(activeTool) || !isDrawing) return;
    setIsDrawing(false);

    // Eraser erases in real-time on pointer move — nothing to commit on release
    if (activeTool === "eraser") {
      setCurrentLinePoints([]);
      pointsRef.current = [];
      return;
    }

    const finalPoints = [...pointsRef.current];
    if (finalPoints.length >= 4) {
      setDrawLines(prev => [...prev, {
        id: `draw-${Date.now()}`,
        points: finalPoints,
        color: penColor,
        size: penSize,
        isEraser: false,
        type: activeTool,
        // In freesteps mode: global lines have no stepIdx, per-step uses currentFreeStep
        // In step mode: global lines have no stepIdx, per-step uses currentStep
        stepIdx: isGlobalMode
          ? undefined
          : mode === "freesteps"
            ? currentFreeStep
            : currentStep,
      }]);
    }
    setCurrentLinePoints([]);
    pointsRef.current = [];
  }, [activeTool, isDrawing, penColor, penSize, isGlobalMode, currentStep, currentFreeStep, mode]);

  return {
    activeTool,
    setActiveTool,
    penColor,
    setPenColor,
    penSize,
    setPenSize,
    eraserSize,
    setEraserSize,
    drawLines,
    setDrawLines,
    isDrawing,
    currentLinePoints,
    handleStagePointerDown,
    handleStagePointerMove,
    handleStagePointerUp,
    isDrawTool,
    pointsRef
  };
};
