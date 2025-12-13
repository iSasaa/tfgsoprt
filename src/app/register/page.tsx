"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const registerMutation = api.user.register.useMutation({
        onSuccess: () => {
            router.push("/login?registered=true");
        },
        onError: (e) => {
            try {
                // Try to parse Zod error array
                // Example: [ { "validation": "email", ... }, { "code": "too_small", ... } ]
                const issues = JSON.parse(e.message);
                if (Array.isArray(issues)) {
                    // Create a friendly list of errors
                    const messages = issues.map((issue: any) => {
                        if (issue.validation === "email") return "Please enter a valid email address.";
                        if (issue.code === "too_small" && issue.path?.includes("password")) return "Password must be at least 6 characters.";
                        return issue.message || "Invalid input.";
                    });
                    setError(messages.join(" "));
                    return;
                }
            } catch {
                // Not JSON, use raw message
            }
            setError(e.message);
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        registerMutation.mutate({ name, email, password });
    };

    return (
        <div className="flex min-h-screen w-full bg-white text-slate-800">
            {/* --- COLUMNA ESQUERRA (Visual / Màrqueting) --- */}
            <div className="relative hidden w-1/2 flex-col justify-center bg-slate-700 px-12 text-white lg:flex">
                {/* Imatge de fons diferent per distingir del Login */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-slate-900/40"></div>

                <div className="relative z-10 max-w-xl space-y-6">
                    <div className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
                        Home &gt; Register
                    </div>
                    <h1 className="text-5xl font-bold uppercase leading-tight tracking-tight">
                        Join the <br />
                        <span className="text-orange-400">Revolution</span>
                    </h1>

                    <p className="text-lg text-slate-300 max-w-md">
                        Stop relying on static papers. Start using advanced digital tools for professional tactical analysis.
                    </p>

                    {/* Elements flotants decoratius (Mockups) */}
                    <div className="mt-8 flex gap-4 opacity-90">
                        {/* Mockup estilitzat per Register */}
                        <div className="h-32 w-full max-w-sm rounded-lg bg-white/10 p-4 shadow-2xl backdrop-blur-sm border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-8 rounded-full bg-orange-400 flex items-center justify-center font-bold">1</div>
                                <div className="text-sm font-semibold">Select Sport</div>
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-8 rounded-full bg-slate-500 flex items-center justify-center font-bold">2</div>
                                <div className="text-sm font-semibold text-slate-400">Build Plan</div>
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
                    <h2 className="text-3xl font-bold text-slate-700">CREATE ACCOUNT</h2>
                    <p className="mt-2 text-slate-500">
                        Start your coaching journey today. It only takes a minute.
                    </p>

                    {error && (
                        <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-8 space-y-5">

                        {/* Camp Nom (Nou respecte al Login) */}
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-400">
                                Full Name
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full border-b-2 border-slate-200 bg-transparent px-2 py-2 text-slate-800 placeholder-slate-300 focus:border-orange-400 focus:outline-none transition-colors"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-400">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                className="w-full border-b-2 border-slate-200 bg-transparent px-2 py-2 text-slate-800 placeholder-slate-300 focus:border-orange-400 focus:outline-none transition-colors"
                                placeholder="coach@example.com"
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
                                placeholder="Create a strong password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div className="flex items-start gap-2 pt-2">
                            <input
                                type="checkbox"
                                required
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-400 focus:ring-orange-400"
                            />
                            <p className="text-sm text-slate-500">
                                I agree to the TactixPro <a href="#" className="font-bold hover:underline">Terms of Service</a> and <a href="#" className="font-bold hover:underline">Privacy Policy</a>.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={registerMutation.isPending}
                            className="w-full rounded bg-orange-400 py-3 text-sm font-bold text-white uppercase tracking-wider shadow-md transition-transform hover:bg-orange-500 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {registerMutation.isPending ? "Creating Account..." : "Join Now"}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        Already have an account?{" "}
                        <Link href="/login" className="font-bold text-orange-400 hover:underline">
                            Log in instead
                        </Link>
                    </div>

                    {/* Separador OR */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-white px-4 text-xs text-slate-400 uppercase">OR REGISTER WITH</span>
                        </div>
                    </div>

                    {/* Social Logins */}
                    <div className="grid grid-cols-2 gap-3">
                        <button className="flex w-full items-center justify-center gap-2 rounded bg-[#3b5998] py-2.5 text-sm font-bold text-white shadow hover:bg-[#2d4373]">
                            Facebook
                        </button>
                        <button className="flex w-full items-center justify-center gap-2 rounded border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                            Google
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}