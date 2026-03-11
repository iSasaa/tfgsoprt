"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface NavUser {
    name?: string | null;
    email?: string | null;
    image?: string | null;
}

export function UserNav({ user, theme = "dark" }: { user: NavUser; theme?: "dark" | "light" }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    const initials = user?.name
        ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
        : "U";

    const isDark = theme === "dark";

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 rounded-full py-1.5 pl-2 pr-4 transition-colors ${isDark
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                    }`}
            >

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 font-bold text-white shadow-sm">
                    {initials}
                </div>


                <div className="hidden text-sm font-medium md:block">
                    {user?.name ?? "User"}
                </div>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform ${isOpen ? "rotate-180" : ""} ${isDark ? "text-slate-300" : "text-slate-500"}`}
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>


            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md border border-slate-600 bg-[#465663] py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="border-b border-slate-500/50 px-4 py-2 text-xs text-slate-300">
                        Connectat com <br />
                        <span className="font-medium text-white">{user?.email}</span>
                    </div>

                    <Link
                        href="/dashboard/profile"
                        className="block px-4 py-2 text-sm text-slate-200 hover:bg-white/10 hover:text-white"
                        onClick={() => setIsOpen(false)}
                    >
                        Profile Settings
                    </Link>

                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="block w-full px-4 py-2 text-left text-sm text-red-300 hover:bg-white/10 hover:text-red-200"
                    >
                        Sign Out
                    </button>
                </div>
            )}
        </div>
    );
}
