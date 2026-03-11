import Link from "next/link";

interface SessionCardProps {
    id: string;
    title: string;
    sport: string;
    date: Date;
    boardCount: number;
    href?: string;
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("ca-ES", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

export function SessionCard({ id, title, sport, date, boardCount, href }: SessionCardProps) {
    const cardHref = href ?? `/dashboard/plans/${id}`;

    return (
        <Link href={cardHref} className="no-underline">
            <div className="group relative flex w-52 flex-shrink-0 cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                {/* Card image area */}
                <div className="relative h-28 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-indigo-200/60 flex items-center justify-center text-indigo-500 text-2xl">📅</div>
                    <div className="absolute top-2 right-2 bg-indigo-100 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {boardCount} pissarres
                    </div>
                </div>
                {/* Card body */}
                <div className="flex flex-col gap-1 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">{sport}</span>
                    <h3 className="text-sm font-bold text-slate-800 leading-tight line-clamp-2">{title}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(date)}</p>
                </div>
            </div>
        </Link>
    );
}
