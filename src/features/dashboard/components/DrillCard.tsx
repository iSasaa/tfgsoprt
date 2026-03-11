import Link from "next/link";

interface DrillCardProps {
    title: string;
    category: string;
    rating?: number;
    href?: string;
    subtitle?: string;
}

export function DrillCard({ title, category, rating = 3, href, subtitle }: DrillCardProps) {
    const card = (
        <div className="group relative flex w-52 flex-shrink-0 cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            {/* Card image area */}
            <div className="relative h-28 bg-white flex items-center justify-center border-b border-slate-100 overflow-hidden p-1">
                {/* Dynamically load the correct sport pitch SVG based on category */}
                <img 
                    src={`/img/pitch_${category.toLowerCase()}.svg`} 
                    alt={`${category} pitch`}
                    className="w-full h-full object-contain opacity-80"
                />
                <div className="absolute top-2 right-2 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`text-xs drop-shadow-sm ${i < rating ? "text-orange-400" : "text-slate-300"}`}>★</span>
                    ))}
                </div>
            </div>
            {/* Card body */}
            <div className="flex flex-col gap-1 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500">{category}</span>
                <h3 className="text-sm font-bold text-slate-800 leading-tight line-clamp-2">{title}</h3>
                {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="no-underline">
                {card}
            </Link>
        );
    }

    return card;
}
