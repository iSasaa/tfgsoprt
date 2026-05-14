"use client";

import { useState } from "react";
import { PersonalTeamsTree } from "~/features/dashboard/components/PersonalTeamsTree";
import { PersonalCalendar } from "~/features/dashboard/components/PersonalCalendar";
import { PersonalLibrary } from "~/features/dashboard/components/PersonalLibrary";
import { Users, Calendar, Library } from "lucide-react";

type Tab = "teams" | "calendar" | "library";

const TABS: { id: Tab; icon: React.ReactNode; label: string; sublabel: string }[] = [
  { id: "teams",    icon: <Users size={24} />, label: "Teams",    sublabel: "Clubs & rosters" },
  { id: "calendar", icon: <Calendar size={24} />, label: "Calendar", sublabel: "All-teams view" },
  { id: "library",  icon: <Library size={24} />, label: "Library",  sublabel: "Drills & sessions" },
];

export default function PersonalPage() {
  const [activeTab, setActiveTab] = useState<Tab>("teams");

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">

      <div className="relative shrink-0 h-20 w-full px-8 flex items-center overflow-hidden">
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-8 w-1.5 bg-orange-400 transform -skew-x-12" />
          <div>
            <h1 className="text-3xl font-extrabold uppercase text-white tracking-tighter italic drop-shadow-lg leading-none">
              My <span className="text-orange-400">Hub</span>
            </h1>
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mt-0.5">
              Personal coaching command centre
            </p>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-6 -mt-2">
        <div style={{ display: "flex", flexDirection: "row", gap: "8px", width: "100%" }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <div
                key={tab.id}
                id={`personal-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: "1 1 0",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "10px",
                  padding: "14px 20px",
                  borderRadius: "12px",
                  border: isActive ? "2px solid #f97316" : "1px solid #e2e8f0",
                  background: isActive
                    ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                    : "rgba(255,255,255,0.9)",
                  boxShadow: isActive
                    ? "0 4px 12px rgba(15,23,42,0.2)"
                    : "0 1px 4px rgba(0,0,0,0.04)",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  userSelect: "none",
                  minWidth: 0,
                }}
              >
                <div style={{ 
                  flexShrink: 0, 
                  color: isActive ? "#f97316" : "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {tab.icon}
                </div>
                <span style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                  color: isActive ? "#fff" : "#334155",
                  lineHeight: 1,
                }}>
                  {tab.label}
                </span>
                {isActive && (
                  <span style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#f97316",
                    flexShrink: 0,
                    marginLeft: "auto",
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-6 pt-4">
        {activeTab === "teams" && (
          <div className="w-full flex-1 overflow-y-auto">
            <PersonalTeamsTree />
          </div>
        )}
        {activeTab === "calendar" && (
          <div className="flex-1 min-h-0 flex flex-col">
            <PersonalCalendar />
          </div>
        )}
        {activeTab === "library" && (
          <div className="flex-1 overflow-y-auto">
            <PersonalLibrary />
          </div>
        )}
      </div>
    </div>
  );
}
