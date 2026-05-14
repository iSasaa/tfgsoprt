"use client";

import React, { createContext, useContext, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface DashboardContextType {
  selectedSport: string;
  setSelectedSport: (sport: string) => void;
  selectedTeamId: string;
  setSelectedTeamId: (id: string) => void;
  selectedClubId: string;
  setSelectedClubId: (id: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

function URLSync() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { selectedSport, setSelectedSport, selectedTeamId, setSelectedTeamId, selectedClubId, setSelectedClubId } = useDashboard();

  useEffect(() => {
    const urlSport = searchParams.get("sport");
    const urlTeam = searchParams.get("team");
    const urlClub = searchParams.get("club");

    if (urlSport && urlSport !== selectedSport) setSelectedSport(urlSport);
    if (urlTeam && urlTeam !== selectedTeamId) setSelectedTeamId(urlTeam);
    if (urlClub && urlClub !== selectedClubId) setSelectedClubId(urlClub);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    let changed = false;

    if (selectedSport && params.get("sport") !== selectedSport) {
      params.set("sport", selectedSport);
      changed = true;
    }
    if (selectedTeamId && params.get("team") !== selectedTeamId) {
      params.set("team", selectedTeamId);
      changed = true;
    }
    if (selectedClubId && params.get("club") !== selectedClubId) {
      params.set("club", selectedClubId);
      changed = true;
    }

    if (changed && pathname.includes("/dashboard")) {
      const newUrl = `${pathname}?${params.toString()}`;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
    }
  }, [selectedSport, selectedTeamId, selectedClubId, pathname, searchParams]);

  return null;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [selectedSport, setSelectedSport] = useState("hockey");
  const [selectedTeamId, setSelectedTeamId] = useState("default");
  const [selectedClubId, setSelectedClubId] = useState("");

  return (
    <DashboardContext.Provider value={{
      selectedSport, setSelectedSport,
      selectedTeamId, setSelectedTeamId,
      selectedClubId, setSelectedClubId
    }}>
      <Suspense fallback={null}>
        <URLSync />
      </Suspense>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
