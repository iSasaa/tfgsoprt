import Link from "next/link";
import { auth } from "~/server/auth";

export default async function DashboardPage() {
    const session = await auth();

    return (
        <div className="min-h-screen pb-12">

            {/* HERO BANNER SECTION (Matches "HOCKEY HOME" in mockup) */}
            <div className="relative h-48 w-full px-8 flex items-center overflow-hidden">
                {/* Decorative background overlay */}
                {/* The parent layout has the bg gradient, here we add text */}
                <div className="relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="h-12 w-2 bg-orange-400 transform -skew-x-12"></div>
                        <h1 className="text-5xl font-extrabold uppercase text-white tracking-tighter italic drop-shadow-lg">
                            Hockey <br />
                            <span className="text-orange-400">Home</span>
                        </h1>
                    </div>
                </div>

                {/* Abstract Image element if we had one, for now css patterns */}
            </div>

            <div className="px-6 mt-8">
                {/* SECTION 1: Recent Exercises */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-slate-700">↺ Recent Exercises</span>
                        </div>
                        <Link href="/dashboard/boards" className="text-sm font-bold text-orange-500 hover:underline">
                            View all drills
                        </Link>
                    </div>

                    {/* Horizontal Scroll Container */}
                    <div className="flex gap-4 overflow-x-auto pb-6 px-2 scrollbar-hide">
                        {/* Card 1 */}
                        <DrillCard
                            title="Changing the Point of Attack"
                            category="SHOOTING GOALSCORING"
                            rating={4}
                        />
                        {/* Card 2 */}
                        <DrillCard
                            title="Warm up exercise for vision"
                            category="WARM UP GAMES"
                            rating={3}
                        />
                        {/* Card 3 */}
                        <DrillCard
                            title="Utilising Space"
                            category="MOVING WITH THE BALL"
                            rating={5}
                        />
                        {/* Card 4 */}
                        <DrillCard
                            title="Pull Back"
                            category="MOVING WITH THE BALL"
                            rating={4}
                        />
                        {/* Card 5 */}
                        <DrillCard
                            title="Drag change direction"
                            category="MOVING WITH THE BALL"
                            rating={3}
                        />
                    </div>
                </div>

                {/* SECTION 2: Training Sessions */}
                <div>
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-slate-700">↺ Training sessions of the week</span>
                        </div>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-6 px-2 scrollbar-hide">
                        {/* Card 1 */}
                        <DrillCard
                            title="Weekly Prep: Zone Defense"
                            category="TACTICAL"
                            rating={5}
                        />
                        {/* Card 2 */}
                        <DrillCard
                            title="Conditioning & Speed"
                            category="FITNESS"
                            rating={4}
                        />
                        {/* Card 3 */}
                        <DrillCard
                            title="Set Pieces Review"
                            category="CORNERS"
                            rating={4}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}

function DrillCard({ title, category, rating }: { title: string; category: string; rating: number }) {
    return (
        <div className="min-w-[280px] w-[280px] bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow group">
            {/* Image Thumbnail Area */}
            <div className="w-full h-32 bg-[#4cae4c] relative border-b border-slate-100 flex items-center justify-center overflow-hidden">
                {/* Simulated Pitch Lines */}
                <div className="absolute inset-4 border border-white/30 rounded"></div>
                <div className="absolute top-1/2 w-full h-px bg-white/30"></div>
                {/* Player Dots */}
                <div className="absolute top-1/3 left-1/4 w-3 h-3 bg-red-500 rounded-full border border-white shadow-sm"></div>
                <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-blue-500 rounded-full border border-white shadow-sm"></div>

                {/* Play Button Overlay */}
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md pb-0.5">
                    <span className="text-xs text-slate-800">▶</span>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-4">
                <h3 className="text-lg font-bold text-slate-800 leading-tight h-12 line-clamp-2">
                    {title}
                </h3>

                <div className="mt-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={`text-xs ${star <= rating ? 'text-orange-400' : 'text-slate-200'}`}>★</span>
                    ))}
                </div>

                <div className="mt-3 border-t border-slate-100 pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">
                        {category}
                    </p>
                </div>
            </div>
        </div>
    );
}