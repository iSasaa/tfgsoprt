"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";

// --- Constants ---
const DEFAULT_SPORTS_LIST = ["HOCKEY", "HANDBALL", "BASKETBALL", "FUTSAL", "FOOTBALL", "VOLLEYBALL", "RUGBY"];

export function DashboardHeader({ children }: { children?: React.ReactNode }) {
    // --- Data Fetching ---
    const { data: clubs = [], isLoading, refetch } = api.club.getHierarchy.useQuery();

    // Mutations
    const createClubMutation = api.club.create.useMutation({
        onSuccess: () => refetch(),
        onError: (e) => alert(`Failed to create club: ${e.message}\nMake sure your server is running and database is synced.`)
    });
    const addSportMutation = api.club.addSport.useMutation({ onSuccess: () => refetch() });
    const addTeamMutation = api.club.addTeam.useMutation({ onSuccess: () => refetch() });

    // Local Selection State (Ids)
    const [selectedClubId, setSelectedClubId] = useState<string>("");
    const [selectedSportName, setSelectedSportName] = useState<string>("");
    const [selectedTeamId, setSelectedTeamId] = useState<string>("");

    // UI State
    const [isAddingClub, setIsAddingClub] = useState(false);
    const [newClubName, setNewClubName] = useState("");

    // --- Derived State & Auto-Selection Logic ---
    useEffect(() => {
        if (!isLoading && clubs.length > 0) {
            // Auto-select first club if none selected or selected one disappeared
            // AND we are not in the middle of adding a new one (unless we just finished)
            const currentClub = clubs.find(c => c.id === selectedClubId);
            if (!currentClub && !isAddingClub) {
                const firstClub = clubs[0];
                setSelectedClubId(firstClub.id);
            }
        }
    }, [clubs, isLoading, selectedClubId, isAddingClub]);

    // Derived Objects
    const selectedClub = clubs.find((c) => c.id === selectedClubId) || clubs[0];

    // Auto-select first sport if changed
    useEffect(() => {
        if (selectedClub && (!selectedSportName || !selectedClub.sports.find(s => s.name === selectedSportName))) {
            if (selectedClub.sports.length > 0) {
                setSelectedSportName(selectedClub.sports[0].name);
            } else {
                setSelectedSportName("");
            }
        }
    }, [selectedClub, selectedSportName]);

    const currentClubSport = selectedClub?.sports.find((s) => s.name === selectedSportName);
    const availableTeams = currentClubSport?.teams || [];

    // Auto-select first team
    useEffect(() => {
        if (currentClubSport && (!selectedTeamId || !currentClubSport.teams.find(t => t.id === selectedTeamId))) {
            if (currentClubSport.teams.length > 0) {
                setSelectedTeamId(currentClubSport.teams[0].id);
            } else {
                setSelectedTeamId("");
            }
        }
    }, [currentClubSport, selectedTeamId]);

    const selectedTeam = availableTeams.find((t) => t.id === selectedTeamId) || { name: availableTeams.length > 0 ? "Select Team..." : "No Teams" };

    // --- Actions ---

    // Triggered by "Add Club" dropdown option
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

    const handleAddSport = (sportName: string) => {
        if (selectedClub && !selectedClub.sports.find(s => s.name === sportName)) {
            addSportMutation.mutate({
                clubId: selectedClub.id,
                name: sportName
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
                setIsAddingClub(false); // Close wizard if open
            }
        });
    };

    // --- Render ---

    // Show wizard if no clubs exist OR user explicitly wants to add one
    const showOnboarding = (!isLoading && clubs.length === 0) || isAddingClub;

    const userClubSports = selectedClub?.sports.map(s => s.name) || [];
    const allAvailableSports = Array.from(new Set([...DEFAULT_SPORTS_LIST, ...userClubSports]));

    if (isLoading) return <div className="h-16 flex items-center px-4 text-white/50 animate-pulse">Loading settings...</div>;

    return (
        <div className="flex w-full items-center justify-between px-4 text-white relative">

            {showOnboarding && (
                <OnboardingWizard
                    initialName={isAddingClub ? newClubName : ""}
                    onFinish={handleOnboardingFinish}
                    onCancel={clubs.length > 0 ? () => setIsAddingClub(false) : undefined}
                />
            )}

            <div className="flex items-center gap-4">
                {/* Logo Area */}
                <a href="/dashboard" className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 font-bold text-white">
                        T
                    </div>
                    <span className="text-lg font-bold tracking-tight">
                        Tactix<span className="text-orange-400 italic">Pro</span>
                    </span>
                </a>

                {/* LEFT: Sport & Team Selectors */}
                {clubs.length > 0 && (
                    <div className="ml-8 flex items-center gap-6 text-sm font-semibold text-slate-300">
                        {/* Sport Selector */}
                        <ConfigurableSportSelector
                            selected={selectedSportName || "Select Sport"}
                            allOptions={allAvailableSports}
                            userOptions={userClubSports}
                            onSelect={handleAddSport}
                            activeColor="text-white"
                        />

                        {/* Team Selector */}
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
                        />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                {/* RIGHT: Club Selector */}
                {clubs.length > 0 && (
                    <div className="mr-4 text-sm font-semibold text-slate-300">
                        <InputDropdown
                            label={selectedClub?.name || "Select Club"}
                            options={clubs.map(c => c.name)}
                            onSelect={(name) => {
                                const c = clubs.find(cl => cl.name === name);
                                if (c) setSelectedClubId(c.id);
                            }}
                            onAdd={handleTriggerAddClub}
                            placeholder="+ Add Club..."
                        />
                    </div>
                )}

                {children}
            </div>
        </div>
    );
}

// --- ONBOARDING WIZARD COMPONENT ---

function OnboardingWizard({ onFinish, onCancel, initialName }: {
    onFinish: (club: string, sportsData: { name: string; teams: string[] }[]) => void;
    onCancel?: () => void;
    initialName?: string;
}) {
    // If initialName is provided, skip Step 1
    const [step, setStep] = useState(initialName ? 2 : 1);
    const [clubName, setClubName] = useState(initialName || "");
    const [selectedSports, setSelectedSports] = useState<string[]>([]);

    // Config state
    const [currentSportIndex, setCurrentSportIndex] = useState(0);
    const [teamMap, setTeamMap] = useState<Record<string, string[]>>({}); // { "Hockey": ["U16"], "Rugby": ["Senior"] }
    const [newTeam, setNewTeam] = useState("");

    const currentSportConfiguring = selectedSports[currentSportIndex];
    const currentTeams = currentSportConfiguring ? (teamMap[currentSportConfiguring] || []) : [];

    const handleNext = () => {
        if (step === 2 && selectedSports.length > 0) {
            // Initialize map for selected sports if empty
            const initialMap: Record<string, string[]> = { ...teamMap };
            selectedSports.forEach(s => {
                if (!initialMap[s]) initialMap[s] = [];
            });
            setTeamMap(initialMap);
            setStep(3);
            setCurrentSportIndex(0);
        } else if (step === 3) {
            // Check if we have more sports to configure
            if (currentSportIndex < selectedSports.length - 1) {
                setCurrentSportIndex(currentSportIndex + 1);
                setNewTeam(""); // Reset input for next sport
            } else {
                // Done with all sports
                const finalData = selectedSports.map(sport => ({
                    name: sport,
                    teams: teamMap[sport] || []
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
                // Do not allow going back to Step 1 if initialName was provided
                // Maybe trigger Cancel if onCancel exists?
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
                {/* Progress Bar */}
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
                                    placeholder={`Add category for ${currentSportConfiguring}`}
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
                            (step === 3 && currentTeams.length === 0 && false) // Allow empty teams if they want
                        }
                        className="rounded-full bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:bg-slate-800 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {step === 3
                            ? (currentSportIndex < selectedSports.length - 1 ? `NEXT: ${selectedSports[currentSportIndex + 1]}` : "FINISH & START")
                            : "NEXT STEP"
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- GENERIC DROPDOWN COMPONENTS ---

function ConfigurableSportSelector({
    selected,
    onSelect,
    allOptions,
    userOptions = [],
    activeColor = "text-orange-500"
}: {
    selected: string;
    onSelect: (val: string) => void;
    allOptions: string[];
    userOptions?: string[];
    activeColor?: string
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isConfiguring, setIsConfiguring] = useState(false);

    // Initialize visible sports:
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

    const toggleSportVisibility = (sport: string) => {
        if (visibleSports.includes(sport)) {
            setVisibleSports(visibleSports.filter(s => s !== sport));
        } else {
            setVisibleSports([...visibleSports, sport]);
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
                            {/* Standard Selection Mode */}
                            <div className="max-h-60 overflow-y-auto">
                                {visibleSports.length === 0 && <p className="px-4 py-2 text-xs text-slate-400 italic">No sports visible</p>}
                                {visibleSports.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => { onSelect(opt); setIsOpen(false); }}
                                        className={`block w-full px-4 py-2 text-left text-sm hover:bg-slate-100 ${selected === opt ? `font-bold ${activeColor.replace('text-white', 'text-orange-500')}` : ''}`}
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
                            {/* Configuration Mode */}
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
                                        <span className={`text-sm ${visibleSports.includes(sport) ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                                            {sport}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function InputDropdown({ label, options, onSelect, onAdd, placeholder, emptyLabel = "Select..." }: { label: string; options: string[]; onSelect: (val: string) => void; onAdd: (val: string) => void; placeholder: string; emptyLabel?: string }) {
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
                        <button type="submit" disabled={!newValue.trim()} className="mt-2 w-full rounded bg-orange-500 py-1 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50">
                            Add
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) return;
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
