"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const res = await signIn("credentials", {
                redirect: false,
                email,
                password,
            });

            if (res?.error) {
                setError("Invalid email or password");
            } else {
                router.push("/");
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-white text-slate-800">
            {/* --- COLUMNA ESQUERRA (Visual / Màrqueting) --- */}
            <div className="relative hidden w-1/2 flex-col justify-center bg-slate-700 px-12 text-white lg:flex">
                {/* Imatge de fons simulada amb gradient/overlay */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=2090&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-slate-900/40"></div>

                <div className="relative z-10 max-w-xl space-y-6">
                    <div className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
                        TactixPro &gt; Coach Access
                    </div>
                    <h1 className="text-5xl font-bold uppercase leading-tight tracking-tight">
                        Next Gen <br />
                        <span className="text-orange-500">Sports Planning</span>
                    </h1>

                    {/* Elements flotants decoratius (Mockups) */}
                    <div className="mt-12 flex gap-4 opacity-90">
                        <div className="h-32 w-48 rounded-lg bg-white p-2 shadow-2xl transform rotate-[-6deg]">
                            <div className="h-full w-full bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs">
                                Drills Preview
                            </div>
                        </div>
                        <div className="h-32 w-48 rounded-lg bg-slate-800 p-2 shadow-2xl border border-slate-600 transform rotate-[6deg] mt-8">
                            <div className="h-full w-full bg-slate-700 rounded flex items-center justify-center text-slate-400 text-xs">
                                Tactic Board
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- COLUMNA DRETA (Formulari) --- */}
            <div className="flex w-full flex-col justify-center bg-white px-8 py-12 lg:w-1/2 lg:px-24">

                {/* Header mòbil */}
                <div className="mb-8 flex justify-end">
                    <Link href="/" className="text-sm font-bold text-slate-500 hover:text-slate-800">
                        BACK TO HOME
                    </Link>
                </div>

                <div className="mx-auto w-full max-w-md">
                    <h2 className="text-3xl font-bold text-slate-700">LOG IN</h2>
                    <p className="mt-2 text-slate-500">
                        Coach with confidence again. Log in to your account to get going.
                    </p>

                    {error && (
                        <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase text-slate-400">
                                    Email/Username
                                </label>
                                <input
                                    type="email"
                                    required
                                    className="w-full border-b-2 border-slate-200 bg-transparent px-2 py-2 text-slate-800 placeholder-slate-300 focus:border-orange-400 focus:outline-none transition-colors"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase text-slate-400">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    className="w-full border-b-2 border-slate-200 bg-transparent px-2 py-2 text-slate-800 placeholder-slate-300 focus:border-orange-400 focus:outline-none transition-colors"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-orange-400 focus:ring-orange-400" />
                                Stay signed in
                            </label>
                            <a href="#" className="text-sm text-slate-400 hover:text-slate-600">
                                Forgot your password?
                            </a>
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded bg-orange-400 py-3 text-sm font-bold text-white uppercase tracking-wider shadow-md transition-transform hover:bg-orange-500 hover:-translate-y-0.5"
                        >
                            Log In
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        New to TactixPro?{" "}
                        <Link href="/register" className="font-bold text-orange-400 hover:underline">
                            Register for FREE
                        </Link>
                    </div>

                    {/* Separador OR */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-white px-4 text-xs text-slate-400 uppercase">OR</span>
                        </div>
                    </div>

                    {/* Social Logins (Visuals) */}
                    <div className="space-y-3">
                        <button className="flex w-full items-center justify-center gap-3 rounded bg-[#3b5998] py-2.5 text-sm font-bold text-white shadow hover:bg-[#2d4373]">
                            <span className="text-lg">f</span> Log in with Facebook
                        </button>
                        <button className="flex w-full items-center justify-center gap-3 rounded border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                             Sign in with Apple
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}