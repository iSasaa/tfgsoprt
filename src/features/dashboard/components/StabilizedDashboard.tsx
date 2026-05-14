"use client";

import { useVisualViewport } from "../../../hooks/useVisualViewport";
import React from "react";

export function StabilizedDashboard({ children }: { children: React.ReactNode }) {
    const { height, offsetTop, isKeyboardOpen } = useVisualViewport();

    return (
        <div
            className="flex flex-col bg-[#f0f2f5] font-sans text-slate-900 overflow-hidden"
            style={{
                position: 'fixed',
                left: 0,
                right: 0,
                top: isKeyboardOpen ? `${offsetTop}px` : 0,
                height: isKeyboardOpen && height ? `${height}px` : '100dvh',
                width: '100vw',
                zIndex: 0
            }}
        >
            {children}
        </div>
    );
}
