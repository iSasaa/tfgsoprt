"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function TouchScrollLock() {
    const pathname = usePathname();

    useEffect(() => {
        const isLockedPath = pathname?.startsWith("/dashboard") || pathname?.startsWith("/whiteboard");
        if (isLockedPath) {
            document.documentElement.classList.add("native-lock");
            document.body.classList.add("native-lock");
        } else {
            document.documentElement.classList.remove("native-lock");
            document.body.classList.remove("native-lock");
            return;
        }

        let touchStartPos = { x: 0, y: 0 };
        let bypassLock = false;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length > 1) {
                if (e.cancelable) e.preventDefault();
                return;
            }

            touchStartPos = { x: e.touches[0]?.clientX ?? 0, y: e.touches[0]?.clientY ?? 0 };
            let target = e.target as HTMLElement | null;
            bypassLock = false;

            while (target && target !== document.body) {
                const isHeader = target.tagName.toLowerCase() === 'header';
                const isSidebar = target.tagName.toLowerCase() === 'aside';
                const isMenu = target.classList.contains('z-50') ||
                    target.classList.contains('z-40') ||
                    target.classList.contains('z-[60]');

                if (isHeader || isSidebar || isMenu) {
                    bypassLock = true;
                    break;
                }
                target = target.parentElement;
            }
        };

        const preventScroll = (e: TouchEvent) => {
            if (e.touches.length > 1) {
                if (e.cancelable) e.preventDefault();
                return;
            }

            if (bypassLock) return;

            let target = e.target as HTMLElement | null;
            let isInsideScrollable = false;

            while (target && target !== document.body) {
                if (
                    target.hasAttribute('data-native-scroll') ||
                    window.getComputedStyle(target).overflowY === 'auto' ||
                    window.getComputedStyle(target).overflowY === 'scroll' ||
                    window.getComputedStyle(target).overflowX === 'auto' ||
                    window.getComputedStyle(target).overflowX === 'scroll'
                ) {
                    isInsideScrollable = true;
                    break;
                }
                target = target.parentElement;
            }

            const touchMovePos = { x: e.touches[0]?.clientX ?? 0, y: e.touches[0]?.clientY ?? 0 };
            const dx = Math.abs(touchMovePos.x - touchStartPos.x);
            const dy = Math.abs(touchMovePos.y - touchStartPos.y);

            if (dx < 5 && dy < 5) return;

            if (!isInsideScrollable && e.cancelable) {
                e.preventDefault();
            }
        };

        const handleViewportShift = () => {
            const vOffset = window.visualViewport?.offsetTop ?? 0;
            const hOffset = window.visualViewport?.offsetLeft ?? 0;

            if (window.scrollY !== 0 || window.scrollX !== 0 || vOffset !== 0 || hOffset !== 0) {
                window.scrollTo(0, 0);
            }
        };

        let lastHeight = window.visualViewport?.height ?? window.innerHeight;

        const handleResize = () => {
            const currentHeight = window.visualViewport?.height ?? window.innerHeight;
            if (currentHeight > lastHeight + 150) {
                setTimeout(() => {
                    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                    handleViewportShift();
                }, 100);
            }
            lastHeight = currentHeight;
            handleViewportShift();
        };

        const handleFocusOut = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                setTimeout(() => {
                    window.scrollTo(0, 0);
                    handleViewportShift();
                }, 300);
            }
        };

        const watchdog = setInterval(handleViewportShift, 1000);

        window.addEventListener("touchstart", handleTouchStart, { passive: false });
        window.addEventListener("touchmove", preventScroll, { passive: false });
        window.addEventListener("touchend", handleViewportShift, { passive: true });
        window.addEventListener("touchcancel", handleViewportShift, { passive: true });
        window.addEventListener("scroll", handleViewportShift, { passive: true });
        document.addEventListener("focusout", handleFocusOut);

        const vv = window.visualViewport;
        if (vv) {
            vv.addEventListener("scroll", handleViewportShift);
            vv.addEventListener("resize", handleResize);
        }

        return () => {
            clearInterval(watchdog);
            document.documentElement.classList.remove("native-lock");
            document.body.classList.remove("native-lock");
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", preventScroll);
            window.removeEventListener("touchend", handleViewportShift);
            window.removeEventListener("touchcancel", handleViewportShift);
            window.removeEventListener("scroll", handleViewportShift);
            document.removeEventListener("focusout", handleFocusOut);
            if (vv) {
                vv.removeEventListener("scroll", handleViewportShift);
                vv.removeEventListener("resize", handleResize);
            }
        };
    }, [pathname]);

    return null;
}
