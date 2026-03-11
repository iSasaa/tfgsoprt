"use client";

import Link from "next/link";
import { useEffect } from "react";
import confetti from "canvas-confetti";

export default function RegistrationSuccessPage() {
    useEffect(() => {

        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => {
            return Math.random() * (max - min) + min;
        };

        const interval: NodeJS.Timeout = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            void confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            void confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-white text-slate-800">
            <div className="mx-auto w-full max-w-md px-6 text-center">
                <div className="mb-6 flex justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-500">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M20 6 9 17l-5-5" />
                        </svg>
                    </div>
                </div>

                <h1 className="mb-2 text-3xl font-bold text-slate-800">Welcome Aboard!</h1>
                <p className="mb-8 text-lg text-slate-500">
                    User registered successfully. Your coaching journey begins now.
                </p>

                <div className="space-y-4">
                    <Link
                        href="/dashboard"
                        className="inline-flex w-full items-center justify-center rounded-lg bg-orange-500 px-8 py-3 text-center text-sm font-bold text-white shadow-lg transition-transform hover:bg-orange-600 hover:-translate-y-0.5"
                    >
                        Continue to Dashboard
                    </Link>

                </div>
            </div>
        </div>
    );
}
