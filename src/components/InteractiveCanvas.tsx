// src/app/_components/InteractiveCanvas.tsx

"use client";

import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Image, Rect, Circle } from "react-konva";
import useImage from "use-image";
import Konva from "konva";

// --- Definim els tipus per a més seguretat amb TypeScript ---
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


// --- Component per a la imatge de fons ---
const BackgroundImage = () => {
  const [image] = useImage("/img/camp_hoquei.png");
  if (!image) return null;
  return <Image image={image} width={window.innerWidth} height={window.innerHeight} />;
};


// --- Component principal del nostre llenç interactiu ---
export const InteractiveCanvas = () => {
  const [shapes, setShapes] = useState<Shape[]>([]);
  
  // --- ESTATS ---
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<Recordings>({});

  // --- REFS PER ACCEDIR A L'ESTAT ACTUALITZAT DES DELS ESDEVENIMENTS ---
  const recordingsRef = useRef(recordings);
  const isRecordingRef = useRef(isRecording);
  const selectedShapeIdRef = useRef(selectedShapeId);

  // Mantenim els refs sempre sincronitzats amb l'últim estat
  useEffect(() => {
    recordingsRef.current = recordings;
    isRecordingRef.current = isRecording;
    selectedShapeIdRef.current = selectedShapeId;
  });
  
  // Referències per a Konva i temporitzadors
  const recordStartTimeRef = useRef<number>(0);
  const animationRef = useRef<Konva.Animation | null>(null);
  const layerRef = useRef<Konva.Layer>(null);
  // NOU: Ref per guardar el temporitzador del bucle
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- LÒGICA DE LA GRAVACIÓ ---
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

  // NOU: Funció per calcular la duració màxima de totes les gravacions
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


  // --- LÒGICA DE LA REPRODUCCIÓ ---
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    if (isPlaying) {
      // Inicia l'animació de Konva
      animationRef.current = new Konva.Animation((frame) => {
        if (!frame || !layer) return;
        const elapsedTime = frame.time;

        Object.entries(recordingsRef.current).forEach(([shapeId, frames]: [string, Frame[]]) => {
          if (shapeId === selectedShapeIdRef.current && isRecordingRef.current) {
              return;
          }
          const shapeNode = layer.findOne(`#${shapeId}`);
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
        });
      }, layer);
      animationRef.current.start();
      
      // MODIFICAT: Lògica per gestionar el bucle automàtic
      // Només activem el bucle si estem reproduint, NO gravant.
      if (!isRecordingRef.current) {
        const maxDuration = getMaxRecordingDuration();
        if (maxDuration > 0) {
          // Programem el reinici
          loopTimeoutRef.current = setTimeout(() => {
            setIsPlaying(false); // Atura i reinicia posicions
            // Esperem un instant perquè React processi el canvi d'estat abans de tornar a començar
            setTimeout(() => setIsPlaying(true), 50); 
          }, maxDuration + 3000); // Duració total + 3 segons de pausa
        }
      }

    } else {
      animationRef.current?.stop();
      Object.entries(recordingsRef.current).forEach(([shapeId, frames]: [string, Frame[]]) => {
        const shapeNode = layer.findOne(`#${shapeId}`);
        if (shapeNode && frames.length > 0) {
          shapeNode.position({ x: frames[0]!.x, y: frames[0]!.y });
        }
      });
    }

    // Funció de neteja
    return () => {
      animationRef.current?.stop();
      // Important: netegem el temporitzador si el component es desmunta o l'efecte es torna a executar
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // --- Funció per afegir formes ---
  const addShape = (type: 'rect' | 'circle') => {
    const shapeId = `${type}-${shapes.length}`;
    const newShape: Shape = type === 'rect' ? {
      id: shapeId, x: 150, y: 150, width: 50, height: 50, fill: 'red', draggable: true,
      onClick: (e) => setSelectedShapeId(e.target.id()), onTap: (e) => setSelectedShapeId(e.target.id()),
      onDragStart: handleDragStart, onDragMove: handleDragMove, onDragEnd: handleDragEnd,
    } : {
      id: shapeId, x: 150, y: 150, radius: 25, fill: 'blue', draggable: true,
      onClick: (e) => setSelectedShapeId(e.target.id()), onTap: (e) => setSelectedShapeId(e.target.id()),
      onDragStart: handleDragStart, onDragMove: handleDragMove, onDragEnd: handleDragEnd,
    };
    setShapes([...shapes, newShape]);
  };
  
  return (
    <div>
      {/* --- CONTROLS --- */}
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
        <div style={{ marginTop: '10px', fontSize: '12px' }}>
          <p>Estat: {isRecording ? 'Gravant...' : ''}{isPlaying ? 'Reproduint...' : ''}{!isRecording && !isPlaying ? 'Inactiu' : ''}</p>
          <p>Forma seleccionada: <strong>{selectedShapeId ?? 'Cap'}</strong></p>
        </div>
      </div>

      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          <BackgroundImage />
        </Layer>
        <Layer ref={layerRef}>
          {shapes.map((shape) => {
            const isSelected = shape.id === selectedShapeId;
            const commonProps = { ...shape, stroke: isSelected ? 'yellow' : 'black', strokeWidth: isSelected ? 3 : 1 };
            if ('radius' in shape) { return <Circle key={shape.id} {...commonProps} />; }
            return <Rect key={shape.id} {...commonProps} />;
          })}
        </Layer>
      </Stage>
    </div>
  );
};