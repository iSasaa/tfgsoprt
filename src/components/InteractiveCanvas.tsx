

"use client";

import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Image, Rect, Circle, Line } from "react-konva";
import useImage from "use-image";
import Konva from "konva";


type Frame = { x: number; y: number; time: number };
type Recordings = { [shapeId: string]: Frame[] };
type ShapeCommonProps = {
  id: string;
  x: number;
  y: number;
  draggable: boolean;
  fill: string;
  onClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onTap: (e: Konva.KonvaEventObject<PointerEvent>) => void;
  onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
};
type RectangleProps = ShapeCommonProps & { width: number; height: number };
type CircleProps = ShapeCommonProps & { radius: number };
type Shape = RectangleProps | CircleProps;



const BackgroundImage = () => {
  const [image] = useImage("/img/camp_hoquei.png");
  if (!image) return null;
  return <Image image={image} width={window.innerWidth} height={window.innerHeight} />;
};



export const InteractiveCanvas = () => {
  const [shapes, setShapes] = useState<Shape[]>([]);


  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<Recordings>({});
  const [showPath, setShowPath] = useState(false);
  const [showTrail, setShowTrail] = useState(false);
  const [trailLines, setTrailLines] = useState<Record<string, number[]>>({});


  const recordingsRef = useRef(recordings);
  const isRecordingRef = useRef(isRecording);
  const selectedShapeIdRef = useRef(selectedShapeId);
  const showTrailRef = useRef(showTrail);

  useEffect(() => {
    recordingsRef.current = recordings;
    isRecordingRef.current = isRecording;
    selectedShapeIdRef.current = selectedShapeId;
    showTrailRef.current = showTrail;
  });


  const recordStartTimeRef = useRef<number>(0);
  const animationRef = useRef<Konva.Animation | null>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const trailLayerRef = useRef<Konva.Layer>(null);
  const lastTrailUpdateTimeRef = useRef<Record<string, number>>({});



  const handleRecordToggle = () => {
    if (!selectedShapeId) {
      alert("Si us plau, selecciona una forma fent-hi clic abans de gravar.");
      return;
    }

    if (!isRecording) {
      setIsRecording(true);
      setIsPlaying(true);
      recordStartTimeRef.current = Date.now();
      setRecordings(prev => ({ ...prev, [selectedShapeId]: [] }));
    } else {
      setIsRecording(false);
      setIsPlaying(false);
    }
  };

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (isRecordingRef.current && e.target.id() === selectedShapeIdRef.current) {
      const frame: Frame = { x: e.target.x(), y: e.target.y(), time: 0 };
      setRecordings(prev => ({ ...prev, [selectedShapeIdRef.current!]: [frame] }));
    }
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (isRecordingRef.current && e.target.id() === selectedShapeIdRef.current) {
      const newFrame: Frame = {
        x: e.target.x(),
        y: e.target.y(),
        time: Date.now() - recordStartTimeRef.current,
      };
      setRecordings(prev => {
        const currentFrames = prev[selectedShapeIdRef.current!] ?? [];
        return { ...prev, [selectedShapeIdRef.current!]: [...currentFrames, newFrame] };
      });
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (isRecordingRef.current && e.target.id() === selectedShapeIdRef.current) {
      setIsRecording(false);
      setIsPlaying(false);
    }
  };

  const getMaxRecordingDuration = () => {
    let maxDuration = 0;
    Object.values(recordingsRef.current).forEach((frames) => {
      if (frames.length > 0) {
        const lastFrameTime = frames[frames.length - 1]!.time;
        if (lastFrameTime > maxDuration) {
          maxDuration = lastFrameTime;
        }
      }
    });
    return maxDuration;
  };



  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    if (isPlaying) {
      animationRef.current = new Konva.Animation((frame) => {
        if (!frame || !layer) return;
        const elapsedTime = frame.time;

        Object.entries(recordingsRef.current).forEach(([shapeId, frames]: [string, Frame[]]) => {
          if (shapeId === selectedShapeIdRef.current && isRecordingRef.current) return;
          const shapeNode = layer.findOne<Konva.Shape>(`#${shapeId}`);
          if (!shapeNode || frames.length === 0) return;

          let currentFrame = frames[0]!;
          for (const recordedFrame of frames) {
            if (recordedFrame.time <= elapsedTime) {
              currentFrame = recordedFrame;
            } else {
              break;
            }
          }
          shapeNode.position({ x: currentFrame.x, y: currentFrame.y });

          if (showTrailRef.current && !isRecordingRef.current) {
            const now = Date.now();
            if (now - (lastTrailUpdateTimeRef.current[shapeId] || 0) > 50) {
              lastTrailUpdateTimeRef.current[shapeId] = now;
              const shapeConfig = shapes.find(s => s.id === shapeId);
              if (!shapeConfig) return;


              const offsetX = 'radius' in shapeConfig ? shapeConfig.radius : shapeConfig.width / 2;
              const offsetY = 'radius' in shapeConfig ? shapeConfig.radius : shapeConfig.height / 2;

              setTrailLines(prevLines => {
                const existingPoints = prevLines[shapeId] || [];
                const newPoints = [...existingPoints, shapeNode.x() + offsetX, shapeNode.y() + offsetY];
                return { ...prevLines, [shapeId]: newPoints };
              });
            }
          }
        });
      }, layer);
      animationRef.current.start();

      if (!isRecordingRef.current) {
        const maxDuration = getMaxRecordingDuration();
        if (maxDuration > 0) {
          loopTimeoutRef.current = setTimeout(() => {
            setIsPlaying(false);
            setTimeout(() => setIsPlaying(true), 50);
          }, maxDuration + 3000);
        }
      }

    } else {
      animationRef.current?.stop();
      setTrailLines({});
      lastTrailUpdateTimeRef.current = {};
      Object.entries(recordingsRef.current).forEach(([shapeId, frames]: [string, Frame[]]) => {
        const shapeNode = layer.findOne(`#${shapeId}`);
        if (shapeNode && frames.length > 0) {
          shapeNode.position({ x: frames[0]!.x, y: frames[0]!.y });
        }
      });
    }

    return () => {
      animationRef.current?.stop();
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    };
  }, [isPlaying, shapes]); // Afegim `shapes` a les dependències per accedir a la seva info

  useEffect(() => {
    if (!showTrail) {
      setTrailLines({});
    }
  }, [showTrail]);



  const addShape = (type: 'rect' | 'circle') => {
    const shapeId = `${type}-${shapes.length}`;
    const newX = window.innerWidth - 250;
    const newY = 150 + (shapes.length % 5) * 80;

    const newShape: Shape = type === 'rect' ? {
      id: shapeId, x: newX, y: newY, width: 50, height: 50, fill: 'red', draggable: true,
      onClick: (e) => setSelectedShapeId(e.target.id()), onTap: (e) => setSelectedShapeId(e.target.id()),
      onDragStart: handleDragStart, onDragMove: handleDragMove, onDragEnd: handleDragEnd,
    } : {
      id: shapeId, x: newX, y: newY, radius: 25, fill: 'blue', draggable: true,
      onClick: (e) => setSelectedShapeId(e.target.id()), onTap: (e) => setSelectedShapeId(e.target.id()),
      onDragStart: handleDragStart, onDragMove: handleDragMove, onDragEnd: handleDragEnd,
    };
    setShapes([...shapes, newShape]);
  };

  return (
    <div>

      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1, background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '5px', color: 'white' }}>
        <div>
          <button onClick={() => addShape('rect')} style={{ marginRight: '10px' }}>+ Rectangle</button>
          <button onClick={() => addShape('circle')}>+ Cercle</button>
        </div>
        <div style={{ marginTop: '10px' }}>
          <button onClick={handleRecordToggle} style={{ marginRight: '10px', background: isRecording ? 'lightcoral' : 'lightgreen' }}>
            {isRecording ? 'Aturar Gravació' : 'Gravar'}
          </button>
          <button onClick={() => setIsPlaying(true)} disabled={isPlaying || isRecording} style={{ marginRight: '10px' }}>Play ▶</button>
          <button onClick={() => setIsPlaying(false)} disabled={!isPlaying || isRecording}>Reiniciar 🔄</button>
        </div>

        <div style={{ marginTop: '15px', borderTop: '1px solid white', paddingTop: '10px' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Opcions de Visualització</h4>
          <div>
            <label>
              <input type="checkbox" checked={showPath} onChange={(e) => setShowPath(e.target.checked)} />
              Mostrar recorregut estàtic
            </label>
          </div>
          <div style={{ marginTop: '5px' }}>
            <label>
              <input type="checkbox" checked={showTrail} onChange={(e) => setShowTrail(e.target.checked)} />
              Mostrar estela (línia dinàmica) ✨
            </label>
          </div>
        </div>

        <div style={{ marginTop: '10px', fontSize: '12px' }}>
          <p>Estat: {isRecording ? 'Gravant...' : ''}{isPlaying ? 'Reproduint...' : ''}{!isRecording && !isPlaying ? 'Inactiu' : ''}</p>
          <p>Forma seleccionada: <strong>{selectedShapeId ?? 'Cap'}</strong></p>
        </div>
      </div>

      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          <BackgroundImage />
        </Layer>

        <Layer ref={trailLayerRef}>
          {Object.entries(trailLines).map(([shapeId, points]) => {
            const shape = shapes.find(s => s.id === shapeId);
            if (!shape) return null;
            return (
              <Line
                key={`${shapeId}-trail`}
                points={points}
                stroke={shape.fill}
                strokeWidth={3}
                tension={0.5}
                dash={[1, 10]} // Línia discontínua (1px visible, 10px espai)
                lineCap="round"
                listening={false}
              />
            );
          })}
        </Layer>
        <Layer ref={layerRef}>
          <>
            {showPath && Object.entries(recordings).map(([shapeId, frames]) => {
              if (frames.length < 2) return null;
              const shape = shapes.find(s => s.id === shapeId);
              if (!shape) return null;

              const points = frames.flatMap(frame => [frame.x + ('radius' in shape ? shape.radius : shape.width / 2), frame.y + ('radius' in shape ? shape.radius : shape.height / 2)]);

              return (
                <Line
                  key={`${shapeId}-path`}
                  points={points}
                  stroke={shape.fill}
                  strokeWidth={2}
                  tension={0.5}
                  dash={[10, 5]}
                  listening={false}
                />
              );
            })}

            {shapes.map((shape) => {
              const isSelected = shape.id === selectedShapeId;
              const commonProps = { ...shape, stroke: isSelected ? 'yellow' : 'black', strokeWidth: isSelected ? 3 : 1 };
              if ('radius' in shape) { return <Circle key={shape.id} {...commonProps} />; }
              return <Rect key={shape.id} {...commonProps} />;
            })}
          </>
        </Layer>
      </Stage>
    </div>
  );
};