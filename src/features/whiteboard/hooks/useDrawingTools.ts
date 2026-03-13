import { useState, useCallback } from "react";
import Konva from "konva";

export type ToolType = "select" | "pen" | "eraser" | "line" | "arrow" | "rect" | "circle";
export type DrawLine = { id: string; points: number[]; color: string; size: number; isEraser?: boolean; type?: string };

interface UseDrawingToolsProps {
  initialDrawLines: DrawLine[];
}

export const useDrawingTools = ({ initialDrawLines }: UseDrawingToolsProps) => {
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [penColor, setPenColor] = useState("#000000");
  const [penSize, setPenSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(4);
  const [drawLines, setDrawLines] = useState<DrawLine[]>(initialDrawLines);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLinePoints, setCurrentLinePoints] = useState<number[]>([]);

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
  }, [activeTool]);

  const handleStagePointerMove = useCallback((e: any) => {
    if (!isDrawTool(activeTool) || !isDrawing) return;
    const pos = (e.target.getStage() as Konva.Stage | null)?.getPointerPosition();
    if (!pos) return;
    if (activeTool === "pen" || activeTool === "eraser") {
      setCurrentLinePoints(prev => [...prev, pos.x, pos.y]);
    } else {
      setCurrentLinePoints(prev => [prev[0]!, prev[1]!, pos.x, pos.y]);
    }
  }, [activeTool, isDrawing]);

  const handleStagePointerUp = useCallback(() => {
    if (!isDrawTool(activeTool) || !isDrawing) return;
    setIsDrawing(false);
    if (currentLinePoints.length >= 4) {
      const isEraser = activeTool === "eraser";
      setDrawLines(prev => [...prev, {
        id: `draw-${Date.now()}`,
        points: currentLinePoints,
        color: isEraser ? "#000000" : penColor,
        size: isEraser ? eraserSize * 10 : penSize,
        isEraser,
        type: activeTool,
      }]);
    }
    setCurrentLinePoints([]);
  }, [activeTool, isDrawing, currentLinePoints, penColor, eraserSize, penSize]);

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
    isDrawTool
  };
};
