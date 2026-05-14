import React, { memo } from "react";
import { Circle, Line, Text, Group, RegularPolygon, Shape, Rect } from "react-konva";
import { type ShapeData, type ElementType } from "../hooks/useBoardState";

const isMobile = typeof window !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export const ELEMENT_RADIUS: Record<ElementType, number> = {
  "player-home": 18, "player-away": 18, "player-third": 18, "player-fourth": 18, 
  "player-5": 18, "player-6": 18, "player-7": 18, "player-8": 18,
  "ball": 9, "cone": 13, "goal": 40,
};

interface WhiteboardShapeProps {
  shape: ShapeData;
  isSelected: boolean;
  isDragging: boolean;
  isStepPlaying: boolean;
  activeTool: string;
  sport: string;
  mode: string;
  currentStep: number;
  handleLocalX: number;
  handleLocalY: number;
  goalDragImage: string | null;
  onSelect: (id: string) => void;
  onDragStart: (e: any) => void;
  onDragMove: (e: any) => void;
  onDragEnd: (e: any) => void;
  setShapes: React.Dispatch<React.SetStateAction<ShapeData[]>>;
  setSteps: React.Dispatch<React.SetStateAction<any[]>>;
  shapesRef: React.MutableRefObject<ShapeData[]>;
}

export const WhiteboardShape = memo(({
  shape,
  isSelected,
  isDragging,
  isStepPlaying,
  activeTool,
  sport,
  mode,
  currentStep,
  handleLocalX,
  handleLocalY,
  goalDragImage,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  setShapes,
  setSteps,
  shapesRef
}: WhiteboardShapeProps) => {
  const r = ELEMENT_RADIUS[shape.type];
  const selectStroke = isSelected ? "#facc15" : "rgba(255,255,255,0.5)";
  const selectWidth = isSelected ? 3 : 1.5;

  const sharedGroupProps = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    opacity: isDragging ? 0 : 1,
    draggable: activeTool === "select" && !isStepPlaying,
    onClick: () => { onSelect(shape.id); },
    onTap: () => { onSelect(shape.id); },
    onPointerDown: (e: any) => { e.cancelBubble = true; },
    onDragStart,
    onDragMove,
    onDragEnd,
  };

  if (shape.type === "ball") {
    return (
      <Circle key={shape.id} {...sharedGroupProps}
        radius={r} fill={shape.fill} stroke={selectStroke} strokeWidth={selectWidth}
        shadowBlur={isSelected && !isMobile ? 8 : 0} shadowColor="#facc15" perfectDrawEnabled={false}
      />
    );
  }

  if (shape.type === "cone") {
    return (
      <RegularPolygon key={shape.id} {...sharedGroupProps}
        sides={3} radius={r} fill={shape.fill} stroke={selectStroke} strokeWidth={selectWidth}
        shadowBlur={isSelected && !isMobile ? 8 : 0} shadowColor="#facc15" perfectDrawEnabled={false}
      />
    );
  }

  if (shape.type === "goal") {
    let goalWidth = ELEMENT_RADIUS.goal * 2;
    let goalHeight = 35;

    const sLow = sport?.toLowerCase();
    if (sLow === "football") { goalWidth = ELEMENT_RADIUS.goal * 2.6; goalHeight = 35; } 
    else if (sLow === "basketball") { goalWidth = 100; goalHeight = 60; } 
    else if (sLow === "hockey") { goalWidth = ELEMENT_RADIUS.goal * 1.5; goalHeight = 28; } 
    else if (sLow === "futsal" || sLow === "handball") { goalWidth = ELEMENT_RADIUS.goal * 2.5; goalHeight = 35; }

    const rotation = shape.rotation ?? 0;

    return (
      <Group
        key={shape.id}
        {...sharedGroupProps}
        rotation={rotation}
      >
        {sLow === "basketball" ? (
          <>
            <Rect x={-goalWidth / 2} y={-8} width={goalWidth} height={goalHeight + 10} fill="transparent" />
            <Rect x={-50} y={-4} width={100} height={10} fill="#000000" stroke="#333" strokeWidth={2} />
            <Rect x={-4} y={6} width={8} height={16} fill="#666" />
            <Circle x={0} y={36} radius={18} stroke="#f97316" strokeWidth={5} />
            <Circle x={0} y={36} radius={14} stroke="rgba(255,255,255,0.3)" strokeWidth={2} dash={[4, 4]} />
          </>
        ) : sLow === "hockey" ? (
          <>
            <Rect x={-goalWidth / 2 - 5} y={-goalHeight * 2.5} width={goalWidth + 10} height={goalHeight * 2.5 + 5} fill="transparent" />
            <Shape
              sceneFunc={(ctx, konvaShape) => {
                const halfW = goalWidth / 2;
                const depth = goalHeight * 1.7;
                ctx.beginPath();
                ctx.moveTo(-halfW, 0);
                ctx.bezierCurveTo(-halfW, -depth, halfW, -depth, halfW, 0);
                ctx.fillStrokeShape(konvaShape);
              }}
              fill="transparent" stroke="black" strokeWidth={7} listening={false}
            />
            <Shape
              sceneFunc={(ctx, konvaShape) => {
                const halfW = goalWidth / 2;
                const depth = goalHeight * 1.7;
                ctx.beginPath();
                ctx.moveTo(-halfW, 0);
                ctx.bezierCurveTo(-halfW, -depth, halfW, -depth, halfW, 0);
                ctx.fillStrokeShape(konvaShape);
              }}
              fill="rgba(255,255,255,0.08)" stroke="white" strokeWidth={4} listening={false}
            />
            <Line points={[-goalWidth / 2, 0, goalWidth / 2, 0]} stroke="black" strokeWidth={7} lineCap="round" listening={false} perfectDrawEnabled={false} />
            <Line points={[-goalWidth / 2, 0, goalWidth / 2, 0]} stroke="#f97316" strokeWidth={5} lineCap="round" listening={false} perfectDrawEnabled={false} />
          </>
        ) : sport === "futsal" || sport === "handball" ? (
          <>
            <Rect x={-goalWidth / 2 - 5} y={-goalHeight - 5} width={goalWidth + 10} height={goalHeight + 10} fill="transparent" />
            <Rect x={-goalWidth / 2} y={-goalHeight} width={goalWidth} height={goalHeight} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} dash={[4, 4]} listening={false} perfectDrawEnabled={false} />
            <Line points={[-goalWidth / 2, 0, -goalWidth / 2, -goalHeight]} stroke="black" strokeWidth={7} lineCap="square" listening={false} perfectDrawEnabled={false} />
            <Line points={[goalWidth / 2, 0, goalWidth / 2, -goalHeight]} stroke="black" strokeWidth={7} lineCap="square" listening={false} perfectDrawEnabled={false} />
            <Line points={[-goalWidth / 2, -goalHeight, goalWidth / 2, -goalHeight]} stroke="black" strokeWidth={7} lineCap="square" listening={false} perfectDrawEnabled={false} />
            <Line points={[-goalWidth / 2, 0, -goalWidth / 2, -goalHeight]} stroke="white" strokeWidth={5} lineCap="square" listening={false} perfectDrawEnabled={false} />
            <Line points={[goalWidth / 2, 0, goalWidth / 2, -goalHeight]} stroke="white" strokeWidth={5} lineCap="square" listening={false} perfectDrawEnabled={false} />
            <Line points={[-goalWidth / 2, -goalHeight, goalWidth / 2, -goalHeight]} stroke="white" strokeWidth={5} lineCap="square" listening={false} perfectDrawEnabled={false} />
            <Line points={[-goalWidth / 2, 0, -goalWidth / 2, -goalHeight]} stroke="#ef4444" strokeWidth={5} dash={[8, 8]} listening={false} perfectDrawEnabled={false} />
            <Line points={[goalWidth / 2, 0, goalWidth / 2, -goalHeight]} stroke="#ef4444" strokeWidth={5} dash={[8, 8]} listening={false} perfectDrawEnabled={false} />
            <Line points={[-goalWidth / 2, -goalHeight, goalWidth / 2, -goalHeight]} stroke="#ef4444" strokeWidth={5} dash={[8, 8]} listening={false} perfectDrawEnabled={false} />
            <Line points={[-goalWidth / 2, 0, goalWidth / 2, 0]} stroke="black" strokeWidth={3} lineCap="round" listening={false} perfectDrawEnabled={false} />
            <Line points={[-goalWidth / 2, 0, goalWidth / 2, 0]} stroke="white" strokeWidth={1.5} lineCap="round" listening={false} perfectDrawEnabled={false} />
          </>
        ) : (
          <>
            <Rect x={-goalWidth / 2 - 5} y={-goalHeight - 5} width={goalWidth + 10} height={goalHeight + 10} fill="transparent" />
            <Rect x={-goalWidth / 2} y={-goalHeight} width={goalWidth} height={goalHeight} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth={1} dash={[4, 4]} listening={false} perfectDrawEnabled={false} />
            <Line points={[-goalWidth / 2, 0, -goalWidth / 2, -goalHeight, goalWidth / 2, -goalHeight, goalWidth / 2, 0]} stroke="black" strokeWidth={7} lineCap="square" lineJoin="round" listening={false} perfectDrawEnabled={false} />
            <Line points={[-goalWidth / 2, 0, -goalWidth / 2, -goalHeight, goalWidth / 2, -goalHeight, goalWidth / 2, 0]} stroke="white" strokeWidth={5} lineCap="round" lineJoin="round" listening={false} perfectDrawEnabled={false} />
            <Line points={[-goalWidth / 2, 0, goalWidth / 2, 0]} stroke="black" strokeWidth={3} lineCap="round" listening={false} perfectDrawEnabled={false} />
            <Line points={[-goalWidth / 2, 0, goalWidth / 2, 0]} stroke="white" strokeWidth={1.5} lineCap="round" listening={false} perfectDrawEnabled={false} />
          </>
        )}
        {isSelected && (
          <Rect
            x={-goalWidth / 2 - 10} y={sLow === "basketball" ? -10 : -goalHeight - 5}
            width={goalWidth + 20} height={(sLow === "basketball" ? 68 : goalHeight) + 10}
            stroke="#facc15" strokeWidth={2} dash={[4, 4]} cornerRadius={4} listening={false}
          />
        )}
        {isSelected && (
          <>
            <Line points={[0, handleLocalY + 15, handleLocalX, handleLocalY]} stroke="#facc15" strokeWidth={1} dash={[3, 3]} listening={false} />
            <Circle x={handleLocalX} y={handleLocalY} radius={12} fill="#facc15" draggable
              onMouseDown={(e) => { e.cancelBubble = true; }}
              onDragMove={(e) => {
                e.cancelBubble = true;
                const group = e.target.getParent();
                if (!group) return;
                const hx = e.target.getAbsolutePosition().x;
                const hy = e.target.getAbsolutePosition().y;
                const gx = group.x();
                const gy = group.y();
                const angleRad = Math.atan2(hy - gy, hx - gx);
                const angleDeg = (angleRad * 180) / Math.PI + 90;
                setShapes(prev => prev.map(s => s.id === shape.id ? { ...s, rotation: angleDeg } : s));
                e.target.position({ x: handleLocalX, y: handleLocalY });
              }}
              onDragEnd={(e) => {
                e.cancelBubble = true;
                e.target.position({ x: handleLocalX, y: handleLocalY });
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
            <Text x={handleLocalX - 6} y={handleLocalY - 8} text="↻" fontSize={16} fill="black" listening={false} />
          </>
        )}
      </Group>
    );
  }

  return (
    <Group key={shape.id} {...sharedGroupProps} perfectDrawEnabled={false}>
      <Circle x={0} y={0} radius={r} fill={shape.fill} stroke={selectStroke} strokeWidth={selectWidth}
        shadowBlur={isSelected && !isMobile ? 10 : 0} shadowColor="#facc15" perfectDrawEnabled={false} />
      <Text x={-r} y={-r} width={r * 2} height={r * 2} text={shape.label ?? ""}
        fontSize={r} fontFamily="Arial" fontStyle="bold" fill="white" align="center" verticalAlign="middle" listening={false} perfectDrawEnabled={false} />
    </Group>
  );
});
