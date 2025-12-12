"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

const SPORTS = [
    { id: "hockey", name: "Roller Hockey", icon: "🏑" },
    { id: "football", name: "Football", icon: "⚽" },
    { id: "basketball", name: "Basketball", icon: "🏀" },
    { id: "handball", name: "Handball", icon: "🤾" },
    { id: "futsal", name: "Futsal", icon: "🥅" },
];

export default function NewBoardPage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [selectedSport, setSelectedSport] = useState(SPORTS[0]?.id);

    const createBoard = api.board.create.useMutation({
        onSuccess: (board) => {
            // Redirect to the new board
            router.push(`/whiteboard/${board.id}`);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSport) return;
        createBoard.mutate({ title, sport: selectedSport });
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-2">Create New Tactic</h1>
            <p className="text-gray-400 mb-8">Choose a sport and give your tactic a name to get started.</p>

            <form onSubmit={handleSubmit} className="space-y-8 bg-[#15162c] p-8 rounded-xl border border-white/10">

                {/* Title Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tactic Name</label>
                    <input
                        type="text"
                        required
                        className="w-full bg-[#0f1016] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                        placeholder="e.g. Offensive Play - Variation A"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                {/* Sport Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-4">Select Sport</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {SPORTS.map((sport) => (
                            <button
                                key={sport.id}
                                type="button"
                                onClick={() => setSelectedSport(sport.id)}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${selectedSport === sport.id
                                        ? "bg-purple-600/20 border-purple-500 text-white"
                                        : "bg-[#0f1016] border-white/5 text-gray-400 hover:bg-white/5 hover:text-gray-200"
                                    }`}
                            >
                                <span className="text-3xl mb-2">{sport.icon}</span>
                                <span className="text-sm font-medium">{sport.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={createBoard.isPending}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {createBoard.isPending ? "Creating Tactic Board..." : "Create Tactic Board"}
                    </button>
                </div>
            </form>
        </div>
    );
}
