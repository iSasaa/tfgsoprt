"use client";

import { useState, useRef, useEffect } from "react";

export function SportSelector() {
    const [sport, setSport] = useState("HOCKEY");
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const sports = ["HOCKEY", "HANDBALL", "BASKETBALL", "FUTSAL"];

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node | null;
            if (containerRef.current && target && !containerRef.current.contains(target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 font-semibold text-slate-300 hover:text-white transition-colors"
            >
                {sport} <span className="text-xs">▼</span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-40 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    {sports.map((s) => (
                        <button
                            key={s}
                            onClick={() => {
                                setSport(s);
                                setIsOpen(false);
                            }}
                            className={`block w-full px-4 py-2 text-left text-sm hover:bg-slate-100 ${sport === s ? "font-bold text-orange-500" : "text-slate-700"
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function ClubSelector() {
    const [club, setClub] = useState("CLUB");
    const [isOpen, setIsOpen] = useState(false);
    const [newClub, setNewClub] = useState("");
    const [clubs, setClubs] = useState(["My Local Club", "Pro Team A"]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node | null;
            if (containerRef.current && target && !containerRef.current.contains(target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAddClub = (e: React.FormEvent) => {
        e.preventDefault();
        if (newClub.trim()) {
            setClubs([...clubs, newClub.trim()]);
            setClub(newClub.trim());
            setNewClub("");
            setIsOpen(false);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 font-semibold text-slate-300 hover:text-white transition-colors"
            >
                {club} <span className="text-xs">▼</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-md bg-white p-2 shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="mb-2 max-h-40 overflow-y-auto">
                        <button
                            onClick={() => {
                                setClub("CLUB");
                                setIsOpen(false);
                            }}
                            className="block w-full rounded px-4 py-2 text-left text-sm text-slate-400 hover:bg-slate-50 italic"
                        >
                            Select generic...
                        </button>
                        {clubs.map((c, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setClub(c);
                                    setIsOpen(false);
                                }}
                                className={`block w-full rounded px-4 py-2 text-left text-sm hover:bg-slate-100 ${club === c ? "font-bold text-orange-500" : "text-slate-700"
                                    }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleAddClub} className="border-t border-slate-200 pt-2">
                        <input
                            type="text"
                            placeholder="Add new club..."
                            value={newClub}
                            onChange={(e) => setNewClub(e.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!newClub.trim()}
                            className="mt-2 w-full rounded bg-orange-500 py-1 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                        >
                            + Add Club
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
