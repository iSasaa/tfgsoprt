import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#f0f2f5] text-slate-800">
            <div className="max-w-4xl mx-auto px-6 py-12">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 mb-8 transition-colors">
                    <ArrowLeft size={16} /> Back to home
                </Link>
                <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-slate-200 prose prose-slate prose-blue max-w-none">
                    {children}
                </div>
            </div>
        </div>
    );
}
