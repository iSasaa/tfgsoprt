"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";
import { useDashboard } from "~/context/DashboardContext";
import Link from "next/link";


const DEFAULT_SPORTS_LIST = ["hockey", "handball", "basketball", "futsal", "football"];

export function DashboardHeader({ children }: { children?: React.ReactNode }) {
    const {
        selectedSport: selectedSportName,
        setSelectedSport: setSelectedSportName,
        selectedTeamId,
        setSelectedTeamId,
        selectedClubId,
        setSelectedClubId
    } = useDashboard();

    const { data: clubs = [], isLoading, refetch } = api.club.getHierarchy.useQuery();

    const createClubMutation = api.club.create.useMutation({
        onSuccess: () => { void refetch(); },
        onError: (e) => alert(`Failed to create club: ${e.message}\nMake sure your server is running and database is synced.`)
    });
    const addSportMutation = api.club.addSport.useMutation({ onSuccess: () => { void refetch(); } });
    const addTeamMutation = api.club.addTeam.useMutation({ onSuccess: () => { void refetch(); } });

    const [isAddingClub, setIsAddingClub] = useState(false);
    const [newClubName, setNewClubName] = useState("");


    useEffect(() => {
        if (!isLoading && clubs.length > 0) {
            const currentClub = clubs.find(c => c.id === selectedClubId);
            if (!currentClub && !isAddingClub) {
                const firstClub = clubs[0];
                if (firstClub) setSelectedClubId(firstClub.id);
            }
        }
    }, [clubs, isLoading, selectedClubId, isAddingClub, setSelectedClubId]);


    const selectedClub = clubs.find((c) => c.id === selectedClubId) ?? clubs[0];


    useEffect(() => {
        if (selectedClub && (!selectedSportName || !selectedClub.sports.find(s => s.name.toLowerCase() === selectedSportName.toLowerCase()))) {
            if (selectedClub.sports.length > 0) {
                const firstSport = selectedClub.sports[0];
                if (firstSport) setSelectedSportName(firstSport.name);
            } else {
                setSelectedSportName("");
            }
        }
    }, [selectedClub, selectedSportName, setSelectedSportName]);

    const currentClubSport = selectedClub?.sports.find((s) => s.name.toLowerCase() === selectedSportName?.toLowerCase());
    const availableTeams = currentClubSport?.teams ?? [];


    useEffect(() => {
        if (currentClubSport && (!selectedTeamId || !currentClubSport.teams.find(t => t.id === selectedTeamId))) {
            if (currentClubSport.teams.length > 0) {
                const firstTeam = currentClubSport.teams[0];
                if (firstTeam) setSelectedTeamId(firstTeam.id);
            } else {
                setSelectedTeamId("");
            }
        }
    }, [currentClubSport, selectedTeamId, setSelectedTeamId]);

    const selectedTeam = availableTeams.find((t) => t.id === selectedTeamId) ?? { id: "", name: availableTeams.length > 0 ? "Select Team..." : "No Teams" };




    const handleTriggerAddClub = (name: string) => {
        setNewClubName(name);
        setIsAddingClub(true);
    };

    const handleAddTeam = (teamName: string) => {
        if (!selectedClubId || !currentClubSport) return;
        addTeamMutation.mutate({
            clubId: selectedClubId,
            sportId: currentClubSport.id,
            name: teamName
        });
    };

    const handleAddSport = (sportName: string, teamName?: string) => {
        if (selectedClub && !selectedClub.sports.find(s => s.name.toLowerCase() === sportName.toLowerCase())) {
            addSportMutation.mutate({
                clubId: selectedClub.id,
                name: sportName,
                teamName: teamName
            });
        }
        setSelectedSportName(sportName);
    }

    const handleOnboardingFinish = (clubName: string, sportsData: { name: string; teams: string[] }[]) => {
        createClubMutation.mutate({
            name: clubName,
            sports: sportsData
        }, {
            onSuccess: (newClub) => {
                setSelectedClubId(newClub.id);
                setIsAddingClub(false);
            }
        });
    };




    const showOnboarding = (!isLoading && clubs.length === 0) || isAddingClub;

    const userClubSports = Array.from(new Set(selectedClub?.sports.map(s => s.name.toLowerCase()) ?? []));
    const allAvailableSports = Array.from(new Set([...DEFAULT_SPORTS_LIST, ...userClubSports]));

    if (isLoading) return <div className="h-16 flex items-center px-4 text-white/50 animate-pulse">Loading settings...</div>;

    return (
        <div className="flex w-full items-center justify-between px-4 text-white relative">

            {showOnboarding && typeof document !== 'undefined' && createPortal(
                <OnboardingWizard
                    initialName={isAddingClub ? newClubName : ""}
                    onFinish={handleOnboardingFinish}
                    onCancel={clubs.length > 0 ? () => setIsAddingClub(false) : undefined}
                    isSaving={createClubMutation.isPending}
                />,
                document.body
            )}

            <div className="flex items-center gap-4">
                <Link
                    href={`/dashboard${selectedSportName || selectedTeamId ? '?' : ''}${selectedSportName ? `sport=${selectedSportName.toLowerCase()}` : ''}${selectedSportName && selectedTeamId ? '&' : ''}${selectedTeamId ? `team=${selectedTeamId}` : ''}`}
                    className="flex items-center gap-2"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 font-bold text-white">
                        T
                    </div>
                    <span className="text-lg font-bold tracking-tight">
                        Tactix<span className="text-orange-400 italic">Pro</span>
                    </span>
                </Link>
                {clubs.length > 0 && (
                    <div className="ml-8 flex items-center gap-6 text-sm font-semibold text-slate-300">
                        <ConfigurableSportSelector
                            selected={selectedSportName || "Select Sport"}
                            allOptions={allAvailableSports}
                            userOptions={userClubSports}
                            onSelect={handleAddSport}
                            activeColor="text-white"
                        />

                        <InputDropdown
                            label={selectedTeam.id ? selectedTeam.name : "Select Team"}
                            options={availableTeams.map(t => t.name)}
                            onSelect={(name) => {
                                const t = availableTeams.find(team => team.name === name);
                                if (t) setSelectedTeamId(t.id);
                            }}
                            onAdd={handleAddTeam}
                            placeholder="+ Add Category..."
                            emptyLabel="No teams yet"
                            isPending={addTeamMutation.isPending}
                        />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                {clubs.length > 0 && (
                    <div className="mr-4 text-sm font-semibold text-slate-300">
                        <InputDropdown
                            label={selectedClub?.name ?? "Select Club"}
                            options={clubs.map(c => c.name)}
                            onSelect={(name) => {
                                const cl = clubs.find(club => club.name === name);
                                if (cl) setSelectedClubId(cl.id);
                            }}
                            onAdd={handleTriggerAddClub}
                            isPending={createClubMutation.isPending}
                            placeholder="+ Add Club..."
                        />
                    </div>
                )}

                {children}
            </div>
        </div>
    );
}



function OnboardingWizard({ onFinish, onCancel, initialName, isSaving }: {
    onFinish: (club: string, sportsData: { name: string; teams: string[] }[]) => void;
    onCancel?: () => void;
    initialName?: string;
    isSaving?: boolean;
}) {

    const [step, setStep] = useState(initialName ? 2 : 1);
    const [clubName, setClubName] = useState(initialName ?? "");
    const [selectedSports, setSelectedSports] = useState<string[]>([]);


    const [currentSportIndex, setCurrentSportIndex] = useState(0);
    const [teamMap, setTeamMap] = useState<Record<string, string[]>>({});
    const [newTeam, setNewTeam] = useState("");

    const currentSportConfiguring = selectedSports[currentSportIndex];
    const currentTeams = currentSportConfiguring ? (teamMap[currentSportConfiguring] ?? []) : [];

    const handleNext = () => {
        if (step === 2 && selectedSports.length > 0) {
            const initialMap: Record<string, string[]> = { ...teamMap };
            selectedSports.forEach(s => {
                initialMap[s] ??= [];
            });
            setTeamMap(initialMap);
            setStep(3);
            setCurrentSportIndex(0);
        } else if (step === 3) {
            if (currentSportIndex < selectedSports.length - 1) {
                setCurrentSportIndex(currentSportIndex + 1);
                setNewTeam("");
            } else {
                const finalData = selectedSports.map(sport => ({
                    name: sport,
                    teams: teamMap[sport] ?? []
                }));
                onFinish(clubName, finalData);
            }
        } else {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        if (step === 3) {
            if (currentSportIndex > 0) {
                setCurrentSportIndex(currentSportIndex - 1);
            } else {
                setStep(2);
            }
        } else if (step === 2) {
            if (initialName) {
                if (onCancel) onCancel();
            } else {
                setStep(1);
            }
        } else {
            setStep(step - 1);
        }
    };

    const toggleSport = (sport: string) => {
        if (selectedSports.includes(sport)) {
            setSelectedSports(selectedSports.filter(s => s !== sport));
        } else {
            setSelectedSports([...selectedSports, sport]);
        }
    };

    const addTeam = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTeam.trim() && currentSportConfiguring) {
            const updatedTeams = [...currentTeams, newTeam.trim()];
            setTeamMap({
                ...teamMap,
                [currentSportConfiguring]: updatedTeams
            });
            setNewTeam("");
        }
    };

    const removeTeam = (index: number) => {
        if (!currentSportConfiguring) return;
        const updatedTeams = currentTeams.filter((_, i) => i !== index);
        setTeamMap({
            ...teamMap,
            [currentSportConfiguring]: updatedTeams
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-8 text-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 h-1 bg-slate-100 w-full">
                    <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }}></div>
                </div>

                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold uppercase tracking-tight text-slate-900">
                        {step === 1 && "Welcome, Coach!"}
                        {step === 2 && "Choose Your Sports"}
                        {step === 3 && `Build ${currentSportConfiguring} Squad`}
                    </h2>
                    <p className="mt-2 text-slate-500">
                        {step === 1 && "Let's start by naming your club or organization."}
                        {step === 2 && "Select all the sports you will be coaching."}
                        {step === 3 && `Add the categories or teams for ${currentSportConfiguring}.`}
                    </p>
                </div>

                <div className="mb-8 min-h-[120px]">
                    {step === 1 && (
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase text-slate-400">Club Name</label>
                            <input
                                autoFocus
                                type="text"
                                className="w-full rounded-lg border-2 border-slate-200 px-4 py-3 text-lg font-bold focus:border-orange-500 focus:outline-none"
                                placeholder="e.g. My Local Club"
                                value={clubName}
                                onChange={(e) => setClubName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && clubName && handleNext()}
                            />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="grid grid-cols-2 gap-3">
                            {DEFAULT_SPORTS_LIST.map((sport) => {
                                const isSelected = selectedSports.includes(sport);
                                return (
                                    <button
                                        key={sport}
                                        onClick={() => toggleSport(sport)}
                                        className={`rounded-lg border-2 px-4 py-3 text-sm font-bold transition-all ${isSelected
                                            ? "border-orange-500 bg-orange-500 text-white shadow-md transform scale-105"
                                            : "border-slate-100 bg-white text-slate-600 hover:border-orange-300"
                                            }`}
                                    >
                                        {sport} {isSelected && "✓"}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <div className="mb-3 flex justify-between text-xs font-bold uppercase text-slate-400">
                                <span>Configuring {currentSportIndex + 1} of {selectedSports.length}</span>
                            </div>
                            <form onSubmit={addTeam} className="flex gap-2 mb-4">
                                <input
                                    autoFocus
                                    type="text"
                                    className="flex-1 rounded-lg border-2 border-slate-200 px-4 py-3 text-sm font-bold focus:border-orange-500 focus:outline-none"
                                    placeholder={`Add team for ${currentSportConfiguring}`}
                                    value={newTeam}
                                    onChange={(e) => setNewTeam(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!newTeam.trim()}
                                    className="rounded-lg bg-orange-500 px-6 font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                                >
                                    ADD
                                </button>
                            </form>

                            <div className="flex flex-wrap gap-2">
                                {currentTeams.length === 0 && <span className="text-slate-400 italic text-sm">No teams added yet.</span>}
                                {currentTeams.map((t, i) => (
                                    <span key={i} className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                        {t}
                                        <button onClick={() => removeTeam(i)} className="text-red-400 hover:text-red-600">×</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-6">
                    {(step > 1 && !(step === 2 && initialName)) ? (
                        <button onClick={handleBack} className="text-sm font-bold text-slate-400 hover:text-slate-600">
                            Back
                        </button>
                    ) : (
                        onCancel ? (
                            <button onClick={onCancel} className="text-sm font-bold text-red-500 hover:text-red-700">
                                Cancel
                            </button>
                        ) : <div></div>
                    )}

                    <button
                        onClick={handleNext}
                        disabled={
                            (step === 1 && !clubName.trim()) ||
                            (step === 2 && selectedSports.length === 0) ||
                            (step === 3 && currentTeams.length === 0) ||
                            isSaving
                        }
                        className="rounded-full bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:bg-slate-800 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                    >
                        {isSaving && <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {step === 3
                            ? (isSaving ? "CREATING..." : (currentSportIndex < selectedSports.length - 1 ? `NEXT: ${selectedSports[currentSportIndex + 1]}` : "FINISH & START"))
                            : "NEXT STEP"
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}



function ConfigurableSportSelector({
    selected,
    onSelect,
    allOptions,
    userOptions = [],
    activeColor = "text-orange-500"
}: {
    selected: string;
    onSelect: (val: string, teamName?: string) => void;
    allOptions: string[];
    userOptions?: string[];
    activeColor?: string
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isConfiguring, setIsConfiguring] = useState(false);

    const initialVisible = userOptions.length > 0
        ? userOptions
        : allOptions.slice(0, 3);

    const [visibleSports, setVisibleSports] = useState<string[]>(initialVisible);

    useEffect(() => {
        if (userOptions.length > 0) {
            setVisibleSports(userOptions);
        }
    }, [userOptions]);

    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, () => {
        setIsOpen(false);
        setIsConfiguring(false);
    });

    const [sportToBeAdded, setSportToBeAdded] = useState<string | null>(null);
    const [tempTeamName, setTempTeamName] = useState("");

    const toggleSportVisibility = (sport: string) => {
        if (visibleSports.includes(sport)) {
            setVisibleSports(visibleSports.filter(s => s !== sport));
        } else {
            const isReallyNew = !userOptions.includes(sport);
            if (isReallyNew) {
                setSportToBeAdded(sport);
                setTempTeamName("");
            } else {
                setVisibleSports(prev => Array.from(new Set([...prev, sport])));
            }
        }
    };

    const confirmNewSport = (e: React.FormEvent) => {
        e.preventDefault();
        if (sportToBeAdded && tempTeamName.trim()) {
            onSelect(sportToBeAdded, tempTeamName.trim());
            setVisibleSports([...visibleSports, sportToBeAdded]);
            setSportToBeAdded(null);
            setTempTeamName("");
        }
    };

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1 hover:text-white transition-colors uppercase">
                {selected} <span className="text-xs">▼</span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 rounded-md bg-white py-1 shadow-lg z-50 text-slate-700 font-normal">
                    {!isConfiguring ? (
                        <>
                            <div className="max-h-60 overflow-y-auto">
                                {visibleSports.length === 0 && <p className="px-4 py-2 text-xs text-slate-400 italic">No sports visible</p>}
                                {visibleSports.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => { onSelect(opt); setIsOpen(false); }}
                                        className={`block w-full px-4 py-2 text-left text-sm hover:bg-slate-100 uppercase ${selected === opt ? `font-bold ${activeColor.replace('text-white', 'text-orange-500')}` : ''}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>

                            <div className="border-t border-slate-200 mt-1 pt-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsConfiguring(true); }}
                                    className="block w-full px-4 py-2 text-left text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                                >
                                    <span>⚙️</span> Configure List...
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                                <span className="text-xs font-bold text-slate-600">Select Sports to Show</span>
                                <button
                                    onClick={() => setIsConfiguring(false)}
                                    className="text-xs text-orange-500 font-bold hover:underline"
                                >
                                    Done
                                </button>
                            </div>
                            <div className="max-h-60 overflow-y-auto p-2">
                                {allOptions.map(sport => (
                                    <label key={sport} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={visibleSports.includes(sport)}
                                            onChange={() => toggleSportVisibility(sport)}
                                            className="accent-orange-500 h-4 w-4 rounded border-slate-300"
                                        />
                                        <span className={`text-sm uppercase ${visibleSports.includes(sport) ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                                            {sport}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}
                    {sportToBeAdded && (
                        <div className="absolute top-0 left-full ml-4 w-64 rounded-xl bg-white p-4 shadow-2xl border border-slate-200 z-[110]">
                            <div className="mb-3">
                                <h4 className="text-sm font-bold text-slate-800 uppercase">
                                    New Sport: <span className="text-orange-500">{sportToBeAdded}</span>
                                </h4>
                                <p className="text-[10px] text-slate-500 font-medium">Every sport needs at least one team to start.</p>
                            </div>
                            <form onSubmit={confirmNewSport}>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                    Initial Team Name
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 outline-none mb-3"
                                    placeholder="e.g. Senior A"
                                    value={tempTeamName}
                                    onChange={e => setTempTeamName(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSportToBeAdded(null)}
                                        className="flex-1 px-3 py-1.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!tempTeamName.trim()}
                                        className="flex-1 px-3 py-1.5 rounded bg-orange-500 text-[10px] font-bold text-white hover:bg-orange-600 disabled:opacity-50 transition-all shadow-lg shadow-orange-500/20"
                                    >
                                        ADD SPORT
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function InputDropdown({ label, options, onSelect, onAdd, placeholder, emptyLabel = "Select...", isPending }: { label: string; options: string[]; onSelect: (val: string) => void; onAdd: (val: string) => void; placeholder: string; emptyLabel?: string; isPending?: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [newValue, setNewValue] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, () => setIsOpen(false));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newValue.trim()) {
            onAdd(newValue.trim());
            setNewValue("");
            setIsOpen(false);
        }
    };

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1 hover:text-white transition-colors uppercase min-w-[100px] justify-end">
                {label} <span className="text-xs">▼</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-md bg-white p-2 shadow-lg z-50 text-slate-700">
                    <div className="max-h-40 overflow-y-auto mb-2">
                        {options.length === 0 && <p className="px-4 py-2 text-xs text-slate-400 italic">{emptyLabel}</p>}
                        {options.map((opt, i) => (
                            <button key={i} onClick={() => { onSelect(opt); setIsOpen(false); }} className={`block w-full rounded px-4 py-2 text-left text-sm hover:bg-slate-100 ${label === opt ? 'font-bold text-orange-500' : ''}`}>
                                {opt}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={handleSubmit} className="border-t border-slate-200 pt-2">
                        <input
                            autoFocus
                            type="text"
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-orange-500 outline-none"
                            placeholder={placeholder}
                            value={newValue}
                            onChange={e => setNewValue(e.target.value)}
                        />
                        <button type="submit" disabled={!newValue.trim() || isPending} className="mt-2 w-full rounded bg-orange-500 py-1 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
                            {isPending && <span className="h-3 w-3 border border-white/30 border-t-white rounded-full animate-spin" />}
                            {isPending ? "Adding..." : "Add"}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node | null;
            if (!ref.current || !target || ref.current.contains(target)) return;
            handler();
        };
        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);
        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
    }, [ref, handler]);
}
