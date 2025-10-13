// src-tfg/app/_components/InteractiveCanvas.tsx

"use client";

import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Image, Rect, Circle, Line } from "react-konva";
import useImage from "use-image";
import Konva from "konva";

// --- Definim els tipus per a més seguretat amb TypeScript ---
type Frame = { x: number; y: number; time: number };
type Recordings = { [shapeId: string]: Frame[] };
type RecordingMode = 'drag' | 'click'; // NOU: Tipus per al mètode de gravació

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
  const [showPath, setShowPath] = useState(false);
  const [showTrail, setShowTrail] = useState(false);
  const [trailLines, setTrailLines] = useState<Record<string, number[]>>({});
  // NOU: Estat per seleccionar el mètode de gravació
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('drag');

  // --- REFS PER ACCEDIR A L'ESTAT ACTUALITZAT DES DELS ESDEVENIMENTS ---
  const recordingsRef = useRef(recordings);
  const isRecordingRef = useRef(isRecording);
  const selectedShapeIdRef = useRef(selectedShapeId);
  const showTrailRef = useRef(showTrail);
  // NOU: Ref per al mètode de gravació
  const recordingModeRef = useRef(recordingMode);

  // Mantenim els refs sempre sincronitzats amb l'últim estat
  useEffect(() => {
    recordingsRef.current = recordings;
    isRecordingRef.current = isRecording;
    selectedShapeIdRef.current = selectedShapeId;
    showTrailRef.current = showTrail;
    recordingModeRef.current = recordingMode;
  });
  
  // Referències i constants
  const recordStartTimeRef = useRef<number>(0);
  const animationRef = useRef<Konva.Animation | null>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const trailLayerRef = useRef<Konva.Layer>(null);
  const lastTrailUpdateTimeRef = useRef<Record<string, number>>({});
  const PIXELS_PER_SECOND = 200; // Velocitat per al mètode de clics

  // --- LÒGICA DE LA GRAVACIÓ ---
  const handleRecordToggle = () => {
    if (!selectedShapeId) {
      alert("Si us plau, selecciona una forma fent-hi clic abans de gravar.");
      return;
    }
    
    if (!isRecording) {
      setIsRecording(true);
      // En mode 'clic', no iniciem la reproducció immediatament
      if (recordingMode === 'drag') {
        setIsPlaying(true);
      }
      recordStartTimeRef.current = Date.now();
      // Assegurem que la posició inicial es desa per al mode 'clic'
      const shape = shapes.find(s => s.id === selectedShapeId);
      if (shape) {
        const initialFrame = { x: shape.x, y: shape.y, time: 0 };
        setRecordings(prev => ({ ...prev, [selectedShapeId]: [initialFrame] }));
      }
    } else {
      setIsRecording(false);
      setIsPlaying(false);
    }
  };
  
  // MODIFICAT: Aquests esdeveniments només funcionen en mode 'drag'
  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (isRecordingRef.current && recordingModeRef.current === 'drag' && e.target.id() === selectedShapeIdRef.current) {
      const frame: Frame = { x: e.target.x(), y: e.target.y(), time: 0 };
      setRecordings(prev => ({ ...prev, [selectedShapeIdRef.current!]: [frame] }));
    }
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (isRecordingRef.current && recordingModeRef.current === 'drag' && e.target.id() === selectedShapeIdRef.current) {
      const newFrame: Frame = {
        x: e.target.x(), y: e.target.y(), time: Date.now() - recordStartTimeRef.current,
      };
      setRecordings(prev => {
        const currentFrames = prev[selectedShapeIdRef.current!] ?? [];
        return { ...prev, [selectedShapeIdRef.current!]: [...currentFrames, newFrame] };
      });
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (isRecordingRef.current && recordingModeRef.current === 'drag' && e.target.id() === selectedShapeIdRef.current) {
      setIsRecording(false);
      setIsPlaying(false);
    }
  };

  // NOU: Gestor de clics a l'escenari per al mode 'click'
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | PointerEvent>) => {
    if (!isRecordingRef.current || recordingModeRef.current !== 'click' || !selectedShapeIdRef.current) {
      return;
    }
    // Ignorem els clics sobre les formes existents
    if (e.target !== e.target.getStage()) {
      return;
    }

    const stage = e.target.getStage();
    if (!stage) return;
    const point = stage.getPointerPosition();
    if (!point) return;

    const shapeNode = layerRef.current?.findOne(`#${selectedShapeIdRef.current}`);
    if (!shapeNode) return;

    setRecordings(prev => {
      const currentFrames = prev[selectedShapeIdRef.current!] ?? [];
      if (currentFrames.length === 0) return prev; // No hauria de passar, però per seguretat

      const lastFrame = currentFrames[currentFrames.length - 1]!;
      const newFrames: Frame[] = [...currentFrames];
      
      const distance = Math.sqrt(Math.pow(point.x - lastFrame.x, 2) + Math.pow(point.y - lastFrame.y, 2));
      const duration = (distance / PIXELS_PER_SECOND) * 1000; // ms

      const steps = Math.max(1, Math.floor(duration / 16)); // ~60fps
      
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = lastFrame.x + (point.x - lastFrame.x) * t;
        const y = lastFrame.y + (point.y - lastFrame.y) * t;
        const time = lastFrame.time + duration * t;
        newFrames.push({ x, y, time });
      }

      return { ...prev, [selectedShapeIdRef.current!]: newFrames };
    });
  };


  const getMaxRecordingDuration = () => { /* ... (sense canvis) */ return 0; };
  useEffect(() => { /* ... (sense canvis) */ }, [isPlaying, shapes]);
  useEffect(() => { /* ... (sense canvis) */ }, [showTrail]);
  const addShape = (type: 'rect' | 'circle') => { /* ... (sense canvis) */ };

  return (
    <div>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1, /* ... */ }}>
        {/* ... (Botons d'afegir formes) */}
        
        {/* NOU: Secció per triar el mètode de gravació */}
        <div style={{ marginTop: '15px', borderTop: '1px solid white', paddingTop: '10px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Mètode de Gravació</h4>
            <div>
                <label>
                    <input type="radio" value="drag" checked={recordingMode === 'drag'} onChange={() => setRecordingMode('drag')} disabled={isRecording} />
                     Arrossegar i deixar anar
                </label>
            </div>
            <div style={{ marginTop: '5px' }}>
                <label>
                    <input type="radio" value="click" checked={recordingMode === 'click'} onChange={() => setRecordingMode('click')} disabled={isRecording} />
                     Clicar punts 📍
                </label>
            </div>
        </div>

        <div style={{ marginTop: '10px' }}>
          <button onClick={handleRecordToggle} style={{ /* ... */ }}>
            {isRecording ? 'Aturar Gravació' : 'Gravar'}
          </button>
          {/* ... (Botons Play/Reiniciar) */}
        </div>

        {/* ... (Opcions de visualització i estat) */}
      </div>

      <Stage 
        width={window.innerWidth} 
        height={window.innerHeight}
        onClick={handleStageClick} // NOU
        onTap={handleStageClick}   // NOU
      >
        {/* ... (Capes) */}
      </Stage>
    </div>
  );
};