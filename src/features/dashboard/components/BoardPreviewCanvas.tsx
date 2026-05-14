"use client";

import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { useDashboard } from "~/context/DashboardContext";

type ShapeData = { id: string; type: string; x: number; y: number; rotation?: number; fill: string; label?: string; ballOwner?: string | null };
type StepSnap = { id: string; x: number; y: number; rotation?: number };
type DrawLine = { id: string; points: number[]; color: string; size: number; isEraser?: boolean; type?: string };

interface BoardData {
    shapes?: ShapeData[];
    steps?: StepSnap[][];
    drawLines?: DrawLine[];
}

interface Props {
    boardData: unknown;
    sport: string;
    animate?: boolean;
}

export interface BoardPreviewCanvasRef {
    startAnim: () => void;
    stopAnim: () => void;
}

const imageCache: Record<string, HTMLImageElement> = {};

function getPitchImage(sport: string = "hockey"): Promise<HTMLImageElement> {
    const src = `/img/pitch_${(sport || "hockey").toLowerCase()}.svg`;
    if (imageCache[src]) return Promise.resolve(imageCache[src]!);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { imageCache[src] = img; resolve(img); };
        img.onerror = reject;
        img.src = src;
    });
}

function drawArrowHead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, size: number) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len = Math.max(6, size * 2.5);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - len * Math.cos(angle - 0.4), y2 - len * Math.sin(angle - 0.4));
    ctx.lineTo(x2 - len * Math.cos(angle + 0.4), y2 - len * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
}

function renderDrawLines(ctx: CanvasRenderingContext2D, w: number, h: number, lines: DrawLine[]) {
    for (const dl of lines) {
        if (dl.isEraser) continue;
        const pts = dl.points;
        if (pts.length < 4) continue;
        ctx.save();
        ctx.strokeStyle = dl.color;
        ctx.fillStyle = dl.color;
        ctx.lineWidth = Math.max(1, dl.size * 0.7);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        const d = pts.map((p, i) => i % 2 === 0 ? p * w : p * h);
        if (dl.type === "arrow" || dl.type === "line") {
            const x1 = d[0]!, y1 = d[1]!, x2 = d[d.length - 2]!, y2 = d[d.length - 1]!;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            if (dl.type === "arrow") drawArrowHead(ctx, x1, y1, x2, y2, Math.max(2, dl.size));
        } else if (dl.type === "rect") {
            const [x, y, x2, y2] = [d[0]!, d[1]!, d[2]!, d[3]!];
            ctx.beginPath(); ctx.rect(Math.min(x, x2), Math.min(y, y2), Math.abs(x2 - x), Math.abs(y2 - y)); ctx.stroke();
        } else if (dl.type === "circle") {
            const cx = (d[0]! + d[2]!) / 2, cy = (d[1]! + d[3]!) / 2;
            ctx.beginPath(); ctx.ellipse(cx, cy, Math.abs(d[2]! - d[0]!) / 2, Math.abs(d[3]! - d[1]!) / 2, 0, 0, Math.PI * 2); ctx.stroke();
        } else {
            ctx.beginPath(); ctx.moveTo(d[0]!, d[1]!);
            for (let i = 2; i < d.length; i += 2) ctx.lineTo(d[i]!, d[i + 1]!);
            ctx.stroke();
        }
        ctx.restore();
    }
}

function renderSingleShape(ctx: CanvasRenderingContext2D, r: number, shape: ShapeData, fill: string, alpha: number = 1) {
    ctx.globalAlpha = alpha;
    if (shape.type === "ball") {
        ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = fill; ctx.fill();
        ctx.strokeStyle = `rgba(0,0,0,${0.3 * alpha})`; ctx.lineWidth = 0.8; ctx.stroke();
    } else if (shape.type === "cone") {
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.65); ctx.lineTo(-r * 0.5, r * 0.45); ctx.lineTo(r * 0.5, r * 0.45); ctx.closePath();
        ctx.fillStyle = fill; ctx.fill();
    } else if (shape.type === "goal") {
        ctx.fillStyle = fill;
        ctx.fillRect(-r * 0.8, -r * 0.3, r * 1.6, r * 0.3);
        ctx.strokeStyle = `rgba(0,0,0,${0.4 * alpha})`; ctx.lineWidth = 1;
        ctx.strokeRect(-r * 0.8, -r * 0.3, r * 1.6, r * 0.3);
    } else {
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = fill; ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * alpha})`; ctx.lineWidth = 1.5; ctx.stroke();
        const label = shape.label ?? (shape.type === "player-away" ? "X" : "");
        if (label) {
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.font = `bold ${Math.max(8, Math.round(r * 0.82))}px Arial`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(label, 0, 0.5);
        }
    }
}

function renderShapes(ctx: CanvasRenderingContext2D, w: number, h: number, shapes: ShapeData[], snap?: StepSnap[], prevSnap?: StepSnap[]) {
    if (snap && prevSnap) {
        for (const shape of shapes) {
            const prev = prevSnap.find(s => s.id === shape.id);
            const cur = snap.find(s => s.id === shape.id);
            if (!prev || !cur) continue;

            const px = (prev.x) * w;
            const py = (prev.y) * h;
            const cx = (cur.x) * w;
            const cy = (cur.y) * h;

            if (Math.abs(px - cx) > 1 || Math.abs(py - cy) > 1) {
                const fill = shape.fill ?? "#888";

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(cx, cy);
                ctx.strokeStyle = fill;
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.globalAlpha = 0.5;
                ctx.stroke();
                ctx.restore();

                ctx.save();
                ctx.translate(px, py);
                const r = Math.min(w, h) * 0.036;
                renderSingleShape(ctx, r, shape, fill, 0.35);
                ctx.restore();
            }
        }
    }

    for (const shape of shapes) {
        const pos = snap?.find(s => s.id === shape.id);
        const x = (pos?.x ?? shape.x) * w;
        const y = (pos?.y ?? shape.y) * h;
        const r = Math.min(w, h) * 0.036;
        const fill = shape.fill ?? "#888";

        ctx.save();
        ctx.translate(x, y);
        renderSingleShape(ctx, r, shape, fill, 1);
        ctx.restore();
    }
}

export const BoardPreviewCanvas = forwardRef<BoardPreviewCanvasRef, Props>(
    function BoardPreviewCanvas({ boardData, sport, animate = false }, ref) {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const pitchImgRef = useRef<HTMLImageElement | null>(null);
        const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
        const { selectedTeamId, selectedSport } = useDashboard();
        const stepIdxRef = useRef(0);

        const data = boardData as BoardData | null;
        const effectiveSport = sport || selectedSport || "hockey";
        const shapes = (data?.shapes ?? []) as ShapeData[];
        const steps = ((data?.steps && data.steps.length > 1) ? data.steps : []) as StepSnap[][];
        const dLines = (data?.drawLines ?? []) as DrawLine[];

        const render = useCallback((snap?: StepSnap[], prevSnap?: StepSnap[]) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            const { width: w, height: h } = canvas;
            ctx.clearRect(0, 0, w, h);
            const img = pitchImgRef.current;
            if (img) {
                ctx.drawImage(img, 0, 0, w, h);
            } else {
                ctx.fillStyle = "#2e7d45"; ctx.fillRect(0, 0, w, h);
            }
            renderDrawLines(ctx, w, h, dLines);
            renderShapes(ctx, w, h, shapes, snap, prevSnap);
        }, [shapes, dLines]);

        useEffect(() => {
            let cancelled = false;
            void getPitchImage(effectiveSport)
                .then(img => { if (!cancelled) { pitchImgRef.current = img; render(steps[0]); } })
                .catch(() => { if (!cancelled) render(steps[0]); });
            return () => { cancelled = true; };
        }, [effectiveSport, render, steps]);

        const startAnim = useCallback(() => {
            if (!animate || steps.length < 2) return;
            if (animRef.current) return;
            stepIdxRef.current = 0;
            animRef.current = setInterval(() => {
                const prev = steps[stepIdxRef.current];
                stepIdxRef.current = (stepIdxRef.current + 1) % steps.length;
                render(steps[stepIdxRef.current], stepIdxRef.current > 0 ? prev : undefined);
            }, 800);
        }, [animate, steps, render]);

        const stopAnim = useCallback(() => {
            if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }
            stepIdxRef.current = 0;
            render(steps[0]);
        }, [render, steps]);

        useImperativeHandle(ref, () => ({ startAnim, stopAnim }), [startAnim, stopAnim]);

        useEffect(() => () => { if (animRef.current) clearInterval(animRef.current); }, []);

        return (
            <canvas
                ref={canvasRef}
                width={600}
                height={375}
                style={{ display: "block", width: "100%", height: "100%" }}
            />
        );
    }
);
