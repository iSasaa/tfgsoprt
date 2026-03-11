import Link from "next/link";
import { auth } from "~/server/auth";
import { UserNav } from "~/components/user-nav";
import { SportCarousel } from "~/components/sport-carousel";

export default async function HomePage() {
    const session = await auth();

    return (
        <main className="relative min-h-screen w-full overflow-hidden bg-white text-slate-800 selection:bg-orange-200">

            <div className="absolute top-0 right-0 h-full w-[60%] origin-top-right -skew-x-12 translate-x-32 transform bg-[#536575] md:w-[55%] lg:w-[50%]" />


            <header className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
                <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold tracking-tighter text-slate-700">
                        Tactix<span className="italic text-orange-500">Pro</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {session ? (
                        <div className="hidden items-center gap-4 md:flex">
                            <UserNav user={session.user} theme="light" />
                            <Link
                                href="/dashboard"
                                className="rounded bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 shadow-md"
                            >
                                GO TO DASHBOARD
                            </Link>
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="flex items-center gap-2 text-base font-bold text-white transition-colors hover:text-orange-200"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            Log in
                        </Link>
                    )}

                    <div className="cursor-pointer space-y-1 md:hidden">
                        <span className="block h-0.5 w-6 bg-slate-700 dark:bg-white"></span>
                        <span className="block h-0.5 w-6 bg-slate-700 dark:bg-white"></span>
                        <span className="block h-0.5 w-6 bg-slate-700 dark:bg-white"></span>
                    </div>
                </div>
            </header>


            <div className="relative z-10 mx-auto grid min-h-[calc(100vh-100px)] max-w-7xl grid-cols-1 items-center px-6 lg:grid-cols-2">


                <div className="flex flex-col items-start gap-6 py-12 pr-8 lg:py-0">
                    <h1 className="text-5xl font-extrabold uppercase leading-tight tracking-tight text-slate-700 sm:text-6xl md:text-[5rem]">
                        Tactical <span className="text-orange-500">Planning</span>
                        <br />
                        <span className="font-serif italic font-light text-slate-400">Reimagined</span>
                    </h1>

                    <p className="max-w-lg text-lg text-slate-500 font-medium">
                        Go beyond static physical whiteboards. An intuitive digital tool for planning, animating, and analyzing plays for Hockey, Futsal, Handball, and more.
                    </p>

                    <div className="space-y-3 text-lg text-slate-500">
                        <div className="flex items-center gap-3">
                            <span className="h-4 w-2 -skew-x-12 bg-orange-400"></span>
                            <p>Interactive & Animated Boards</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="h-4 w-2 -skew-x-12 bg-orange-400"></span>
                            <p>Organize Training Sessions</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="h-4 w-2 -skew-x-12 bg-orange-400"></span>
                            <p>Build your Digital Playbook</p>
                        </div>
                    </div>

                    <div className="mt-6">
                        {session ? (
                            <Link
                                href="/dashboard"
                                className="inline-block transform rounded bg-orange-400 px-8 py-4 text-center text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 hover:shadow-lg"
                            >
                                Enter Workspace &rarr;
                            </Link>
                        ) : (
                            <Link
                                href="/register"
                                className="inline-block transform rounded bg-orange-400 px-8 py-4 text-center text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-orange-500 hover:shadow-lg"
                            >
                                Choose Sport
                            </Link>
                        )}
                    </div>
                </div>


                <div className="relative hidden h-full w-full items-center justify-center lg:flex lg:pl-10">
                    <div className="relative w-full max-w-md">



                        <div className="relative z-10 overflow-hidden rounded-xl bg-white shadow-2xl transition-transform hover:scale-[1.02]">
                            <div className="bg-slate-100 p-3 border-b border-slate-200 flex gap-2">
                                <div className="h-3 w-3 rounded-full bg-red-400"></div>
                                <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                                <div className="h-3 w-3 rounded-full bg-green-400"></div>
                            </div>
                        <div className="p-6">
                                <h3 className="text-xl font-bold text-slate-700 mb-2">Tactical Board</h3>
                                <SportCarousel />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}