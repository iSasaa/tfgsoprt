"use client";

import { useRef, useEffect, type ReactNode } from "react";

export function NativeScrollArea({
    children,
    className = "",
    style,
}: {
    children: ReactNode;
    className?: string;
    style?: React.CSSProperties;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0]!;
                const scrollTop = el.scrollTop;
                const scrollHeight = el.scrollHeight;
                const clientHeight = el.clientHeight;

                const isAtTop = scrollTop <= 0;
                const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

                const startY = (el as any)._touchStartY ?? touch.clientY;
                const deltaY = touch.clientY - startY;

                if (isAtTop && deltaY > 0) {
                    e.preventDefault();
                    return;
                }
                if (isAtBottom && deltaY < 0) {
                    e.preventDefault();
                    return;
                }

                e.stopPropagation();
            }
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                (el as any)._touchStartY = e.touches[0]!.clientY;
            }
            e.stopPropagation();
        };

        const handleTouchEnd = (e: TouchEvent) => {
            (el as any)._touchStartY = undefined;
            e.stopPropagation();
        };

        el.addEventListener("touchstart", handleTouchStart, { passive: false });
        el.addEventListener("touchmove", handleTouchMove, { passive: false });
        el.addEventListener("touchend", handleTouchEnd, { passive: true });

        return () => {
            el.removeEventListener("touchstart", handleTouchStart);
            el.removeEventListener("touchmove", handleTouchMove);
            el.removeEventListener("touchend", handleTouchEnd);
        };
    }, []);

    return (
        <div
            ref={ref}
            className={className}
            data-native-scroll
            style={{
                overflowY: "auto",
                overflowX: "hidden",
                WebkitOverflowScrolling: "touch" as any,
                overscrollBehavior: "none",
                touchAction: "pan-y",
                ...style,
            }}
        >
            {children}
        </div>
    );
}
