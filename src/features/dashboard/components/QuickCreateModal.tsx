"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useVisualViewport } from "~/hooks/useVisualViewport";

interface QuickCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (title: string) => void;
    type: "drill" | "session" | "folder";
    sport?: string;
    isPending: boolean;
}

export function QuickCreateModal({ isOpen, onClose, onConfirm, type, sport, isPending }: QuickCreateModalProps) {
    const [title, setTitle] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const { height, offsetTop, isKeyboardOpen } = useVisualViewport();

    useEffect(() => {
        if (isOpen) {
            setTitle("");
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            onConfirm(title.trim());
        }
    };

    const handleBackdropTouch = (e: React.TouchEvent) => {
        e.preventDefault();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100]" style={{ touchAction: "none" }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onTouchEnd={handleBackdropTouch}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <div
                        className="fixed inset-0 flex justify-center p-4"
                        style={{ 
                            top: `${offsetTop}px`,
                            height: height ? `${height}px` : '100dvh',
                            alignItems: isKeyboardOpen ? 'flex-start' : 'center',
                            pointerEvents: 'none'
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md flex flex-col rounded-2xl bg-white shadow-2xl pointer-events-auto overflow-hidden"
                            style={{ 
                                touchAction: "pan-y",
                                maxHeight: 'calc(100% - 2rem)',
                                marginTop: isKeyboardOpen ? '1rem' : '0'
                            }}
                        >
                            <div className="bg-[#0f2d40] px-6 py-4 text-white flex-shrink-0">
                                <h3 className="text-lg font-bold uppercase tracking-tight">
                                    Create New {type.charAt(0).toUpperCase() + type.slice(1)}
                                </h3>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
                                <div className="p-6 overflow-y-auto flex-1 no-scrollbar">
                                    <div className="mb-2">
                                        {type !== "folder" && sport && (
                                            <label className="mb-2 block text-xs font-bold uppercase text-slate-400">
                                                Sport: <span className="text-orange-500">{sport}</span>
                                            </label>
                                        )}
                                        <label className="mb-2 block text-xs font-bold uppercase text-slate-400">
                                            Title
                                        </label>
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            required
                                            placeholder={`e.g. My New ${type}`}
                                            className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-lg font-bold text-slate-900 focus:border-orange-500 focus:outline-none transition-all"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            autoComplete="off"
                                            autoCorrect="off"
                                            autoCapitalize="off"
                                            spellCheck={false}
                                        />
                                    </div>
                                </div>

                                <div className="p-6 pt-0 flex gap-3 flex-shrink-0 border-t border-slate-50 bg-white">
                                    <button
                                        type="button"
                                        onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
                                        className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isPending || !title.trim()}
                                        className="flex-1 rounded-xl bg-orange-500 py-3 font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-50"
                                    >
                                        {isPending ? "Creating..." : "Confirm"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
