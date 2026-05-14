"use client";

import { useState, useEffect } from "react";

export function useVisualViewport() {
    const [viewport, setViewport] = useState({
        height: typeof window !== "undefined" ? window.innerHeight : 0,
        offsetTop: 0,
        width: typeof window !== "undefined" ? window.innerWidth : 0,
        isKeyboardOpen: false,
        keyboardHeight: 0,
    });

    useEffect(() => {
        if (typeof window === "undefined" || !window.visualViewport) return;

        const handleResize = () => {
            if (!window.visualViewport) return;
            
            const vvHeight = window.visualViewport.height;
            const layoutHeight = window.innerHeight;
            
            const kHeight = Math.max(0, layoutHeight - vvHeight);
            const isOpen = kHeight > 150;

            if (window.visualViewport.offsetTop > 0) {
                window.scrollTo(0, 0);
            }

            setViewport({
                height: vvHeight,
                offsetTop: window.visualViewport.offsetTop,
                width: window.visualViewport.width,
                isKeyboardOpen: isOpen,
                keyboardHeight: kHeight,
            });
        };

        window.visualViewport.addEventListener("resize", handleResize);
        window.visualViewport.addEventListener("scroll", handleResize);

        handleResize();

        return () => {
            window.visualViewport?.removeEventListener("resize", handleResize);
            window.visualViewport?.removeEventListener("scroll", handleResize);
        };
    }, []);

    return viewport;
}
