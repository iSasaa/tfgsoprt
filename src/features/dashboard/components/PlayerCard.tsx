"use client";

import { User } from "lucide-react";

interface PlayerCardProps {
    number: string;
    name: string;
    position: string;
    status?: "active" | "baixa";
}

export function PlayerCard({ number, name, position, status = "active" }: PlayerCardProps) {
    return (
        <div className="group relative flex w-44 flex-shrink-0 cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between px-2 pt-2">
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded tracking-tighter">
                    #{number}
                </span>
                {status === "baixa" && (
                    <span className="text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        BAIXA
                    </span>
                )}
            </div>

            <div className="flex h-24 items-center justify-center py-2">
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-orange-50 group-hover:text-orange-200 transition-colors shadow-inner border border-slate-50">
                    <User size={36} strokeWidth={1.5} />
                </div>
            </div>

            <div className="flex flex-col border-t border-slate-50 p-3 bg-slate-50/50">
                <h4 className="truncate text-sm font-bold text-slate-700 leading-tight mb-0.5">
                    {name}
                </h4>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {position}
                </p>
            </div>
        </div>
    );
}

export function PlayerCardSkeleton() {
    return (
        <div className="flex w-44 flex-shrink-0 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm animate-pulse">
            <div className="flex items-center justify-between px-2 pt-2 h-6">
                <div className="h-3 w-8 bg-slate-100 rounded" />
            </div>
            <div className="flex h-24 items-center justify-center py-2">
                <div className="h-16 w-16 rounded-full bg-slate-100" />
            </div>
            <div className="flex flex-col border-t border-slate-50 p-3 bg-slate-50/50 gap-2">
                <div className="h-3 w-3/4 bg-slate-100 rounded" />
                <div className="h-2 w-1/2 bg-slate-100 rounded" />
            </div>
        </div>
    );
}
