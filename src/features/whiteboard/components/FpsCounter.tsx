"use client";

import { useEffect, useState } from "react";

export function FpsCounter() {
    const [fps, setFps] = useState(0);

    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        let animationFrameId: number;

        const tick = () => {
            const now = performance.now();
            frameCount++;
            if (now - lastTime >= 1000) {
                setFps(Math.min(60, Math.round((frameCount * 1000) / (now - lastTime))));
                frameCount = 0;
                lastTime = now;
            }
            animationFrameId = requestAnimationFrame(tick);
        };

        animationFrameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <div className="mt-1 flex items-center gap-2 text-xs font-mono font-bold text-green-400">
            <span>FPS: {fps}</span>
        </div>
    );
}
