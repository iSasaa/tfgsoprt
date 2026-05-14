import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Desktop Required — TactixPro",
    description: "TactixPro requires a tablet or desktop device.",
};

export default function MobileNotSupportedPage() {
    return (
        <main className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0f2d40] px-6 text-center">
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-500/20 border-2 border-orange-500/40">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-10 w-10 text-orange-400"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3"
                    />
                </svg>
            </div>

            <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-3">
                Desktop Required
            </h1>

            <p className="text-white/50 text-sm font-medium max-w-xs leading-relaxed mb-2">
                The TactixPro dashboard is optimized for tablets and desktops.
            </p>
            <p className="text-white/30 text-xs font-medium max-w-xs leading-relaxed mb-10">
                Please open this page on a tablet, laptop, or desktop computer for the best experience.
            </p>

            <Link
                href="/"
                className="px-8 py-3 rounded-xl bg-orange-500 text-white text-sm font-bold uppercase tracking-widest hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
            >
                Back to Home
            </Link>

            <div className="mt-12 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                <span className="text-white/20 text-xs font-black uppercase tracking-widest">
                    Tactix<span className="text-orange-400">Pro</span>
                </span>
            </div>
        </main>
    );
}
