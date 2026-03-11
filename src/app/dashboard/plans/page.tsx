"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { SessionCard } from "~/features/dashboard/components/SessionCard";

const SPORTS = [
    "hockey", "football", "basketball", "handball", "futsal", "volleyball", "rugby",
];

export default function PlansPage() {
    const { data: sessions = [], refetch } = api.session.getAll.useQuery();
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [sport, setSport] = useState("hockey");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState("");

    const createSession = api.session.create.useMutation({
        onSuccess: () => {
            void refetch();
            setTitle("");
            setNotes("");
            setShowForm(false);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        createSession.mutate({ title, sport, date, notes });
    };

    return (
        <div className="min-h-screen pb-12">
            {/* Header */}
            <div className="relative h-48 w-full px-8 flex items-center overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="h-12 w-2 bg-orange-400 transform -skew-x-12"></div>
                        <h1 className="text-5xl font-extrabold uppercase text-white tracking-tighter italic drop-shadow-lg">
                            Training <br />
                            <span className="text-orange-400">Plans</span>
                        </h1>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="absolute right-8 bottom-8 flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-orange-600 transition-colors"
                >
                    + New Session
                </button>
            </div>

            <div className="px-6 mt-8">

                {/* New Session Form */}
                {showForm && (
                    <div className="mb-8 rounded-2xl bg-white border border-slate-200 shadow-md p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Nova Sessió d&apos;Entrenament</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Títol *</label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="ex. Sessió de tirs lliures"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Data *</label>
                                    <input
                                        type="date"
                                        required
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Esport *</label>
                                    <select
                                        value={sport}
                                        onChange={(e) => setSport(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none capitalize"
                                    >
                                        {SPORTS.map((s) => (
                                            <option key={s} value={s} className="capitalize">{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Notes</label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Opcional..."
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={createSession.isPending}
                                    className="rounded-lg bg-orange-500 px-6 py-2 text-sm font-bold text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                                >
                                    {createSession.isPending ? "Creant..." : "Crear Sessió"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="rounded-lg border border-slate-200 px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel·lar
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Sessions List */}
                {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white py-20 text-center">
                        <div className="text-5xl mb-4">📅</div>
                        <h2 className="text-xl font-bold text-slate-700 mb-2">Cap sessió planificada</h2>
                        <p className="text-slate-400 text-sm mb-6">Crea la teva primera sessió d&apos;entrenament.</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="rounded-lg bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600 transition-colors"
                        >
                            New Session
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {sessions.map((s) => (
                            <SessionCard
                                key={s.id}
                                id={s.id}
                                title={s.title}
                                sport={s.sport}
                                date={s.date}
                                boardCount={s._count.boards}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
