import Link from "next/link";
import { auth } from "~/server/auth";
import { UserNav } from "~/components/layout/user-nav";
import { SportCarousel } from "~/components/layout/sport-carousel";
import { 
  ArrowRight, 
  Layout, 
  Users, 
  Globe,
  Trophy,
  BarChart3,
  Play,
  Sparkles,
  Target,
  CalendarDays,
  RefreshCw
} from "lucide-react";

export default async function HomePage() {
    const session = await auth();

    return (
        <main className="relative min-h-screen w-full overflow-x-hidden bg-[#f0f2f5] text-slate-800 font-sans">


            <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-slate-200/60">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
                    <Link href="/" className="flex items-center gap-2.5">
                        <span className="text-xl font-extrabold tracking-tight text-slate-800">
                            Tactix<span className="text-orange-500">Pro</span>
                        </span>
                    </Link>

                    <div className="flex items-center gap-3">
                        {session ? (
                            <>
                                <UserNav user={session.user} theme="light" />
                                <Link href="/dashboard"
                                      className="ml-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-all active:scale-95">
                                    Dashboard
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/login"
                                      className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600 transition-colors">
                                    Log in
                                </Link>
                                <Link href="/register"
                                      className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-orange-500 text-white rounded-lg shadow-md hover:bg-orange-600 hover:shadow-lg transition-all active:scale-95">
                                    Sign Up Free
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>


            <section className="relative overflow-hidden">
                <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10 pt-20 pb-10 md:pt-28 md:pb-16">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">

                        <div className="max-w-xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-8">
                                <Sparkles size={14} className="text-blue-500" />
                                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">New: Multi-Sport Animations</span>
                            </div>

                            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
                                Plan. Draw.{" "}
                                <span className="text-orange-500">Win.</span>
                            </h1>

                            <p className="text-lg text-slate-500 leading-relaxed mb-10 max-w-md">
                                The tactical whiteboard for modern coaches. Design plays, animate drills, and manage your team sessions — all from one platform.
                            </p>

                            <div className="flex flex-wrap items-center gap-4 mb-10">
                                <Link href="/register"
                                      className="group inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/25 transition-all active:scale-95">
                                    Start for Free
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>

                            <div className="flex items-center gap-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 bg-green-400 rounded-full" />
                                    5 Sports
                                </div>
                            </div>
                        </div>


                        <div className="relative">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                                <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-100">
                                    <div className="flex gap-1.5">
                                        <div className="h-3 w-3 rounded-full bg-red-400/60" />
                                        <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
                                        <div className="h-3 w-3 rounded-full bg-green-400/60" />
                                    </div>
                                    <div className="flex-1 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Tactical Editor</span>
                                    </div>
                                </div>
                                <div className="p-2 md:p-6">
                                    <SportCarousel />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            <section className="relative z-10 py-12">
                <div className="mx-auto max-w-4xl px-6 md:px-10">
                    <div className="flex flex-wrap justify-center gap-3">
                        {[
                            { label: "Football", emoji: "⚽" },
                            { label: "Hockey", emoji: "🏑" },
                            { label: "Futsal", emoji: "🥅" },
                            { label: "Basketball", emoji: "🏀" },
                            { label: "Handball", emoji: "🤾" },
                        ].map((s) => (
                            <div key={s.label}
                                 className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-bold text-slate-600 shadow-sm hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default">
                                <span className="text-base">{s.emoji}</span>
                                {s.label}
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            <section className="relative z-10 py-24">
                <div className="mx-auto max-w-7xl px-6 md:px-10">
                    <div className="text-center max-w-2xl mx-auto mb-20">
                        <span className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-3 block">Features</span>
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
                            Everything you need to{" "}
                            <span className="text-blue-600">coach smarter</span>
                        </h2>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            From real-time drawing to cloud sync, TactixPro is your all-in-one tactical command center.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { title: "Tactical Designer",  desc: "Draw plays on interactive sport-specific fields with drag-and-drop players.", icon: Layout, color: "blue" },
                            { title: "Step-by-Step Plays", desc: "Build multi-step drills with animated player movements you can replay and refine.", icon: RefreshCw, color: "orange" },
                            { title: "Multi-Sport Fields", desc: "Pre-built pitches for Football, Hockey, Futsal, Basketball, and Handball.", icon: Play, color: "blue" },
                            { title: "Calendar Planning",  desc: "Organize your training sessions on a visual calendar. Plan weeks ahead at a glance.", icon: CalendarDays, color: "orange" },
                            { title: "Team Management",   desc: "Organize squads, assign roles, and track player participation easily.", icon: Users, color: "blue" },
                            { title: "Session Analytics",  desc: "Review training volume, drill frequency, and session history at a glance.", icon: BarChart3, color: "orange" },
                        ].map((f, i) => (
                            <div key={i}
                                 className="group p-8 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-blue-200/60 transition-all duration-300">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 ${
                                    f.color === "blue"
                                        ? "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
                                        : "bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white"
                                }`}>
                                    <f.icon size={24} />
                                </div>
                                <h3 className="text-lg font-extrabold tracking-tight mb-2 text-slate-800">{f.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            <section className="relative z-10 py-24 bg-white border-y border-slate-100">
                <div className="mx-auto max-w-5xl px-6 md:px-10">
                    <div className="text-center mb-20">
                        <span className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3 block">How It Works</span>
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                            Three steps to{" "}
                            <span className="text-orange-500">better sessions</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-10">
                        {[
                            { step: "01", title: "Create a Session", desc: "Pick your sport and build a training plan with custom drills and objectives." },
                            { step: "02", title: "Design on the Board", desc: "Use our interactive whiteboard to draw formations, arrows, and player movements." },
                            { step: "03", title: "Replay, Save & Edit", desc: "Review your plays, save them to your library, and refine them as many times as you need." },
                        ].map((s, i) => (
                            <div key={i} className="text-center">
                                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-extrabold text-xl mb-6 shadow-lg shadow-blue-500/20">
                                    {s.step}
                                </div>
                                <h3 className="text-xl font-extrabold tracking-tight mb-3">{s.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            <section className="relative z-10 py-28">
                <div className="mx-auto max-w-5xl px-6 md:px-10">
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-12 md:p-20 text-center shadow-2xl shadow-blue-600/20">
                        <div className="absolute top-4 right-4 opacity-[0.06] pointer-events-none">
                            <Trophy size={320} />
                        </div>

                        <div className="relative z-10 max-w-2xl mx-auto">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full mb-8">
                                <Target size={14} className="text-orange-300" />
                                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-200">Free for all coaches</span>
                            </div>
                            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                                Ready to upgrade your playbook?
                            </h2>
                            <p className="text-blue-100/70 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
                                Join coaches who are already planning smarter sessions with TactixPro.
                            </p>
                            <Link href="/register"
                                  className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-blue-700 rounded-xl text-sm font-extrabold uppercase tracking-wider shadow-xl hover:bg-orange-500 hover:text-white transition-all active:scale-95">
                                Create Free Account
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>


            <footer className="relative z-10 bg-white border-t border-slate-100 py-12">
                <div className="mx-auto max-w-7xl px-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <span className="text-xl font-extrabold tracking-tight text-slate-800">
                        Tactix<span className="text-orange-500">Pro</span>
                    </span>
                    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm font-medium text-slate-500">
                        <Link href="/legal/avis-legal" className="hover:text-blue-600 transition-colors">Legal Notice</Link>
                        <Link href="/legal/privacitat" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
                        <Link href="/legal/cookies" className="hover:text-blue-600 transition-colors">Cookie Policy</Link>
                        <Link href="/legal/termes" className="hover:text-blue-600 transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}