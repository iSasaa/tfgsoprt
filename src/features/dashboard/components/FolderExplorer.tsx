"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { FolderCard } from "./FolderCard";
import { DrillCard, DrillCardSkeleton } from "./DrillCard";
import { SessionCard, SessionCardSkeleton } from "./SessionCard";
import { ItemOptionsModal, type ItemType } from "./ItemOptionsModal";
import { ItemContextMenu } from "./ItemContextMenu";
import { MoveToModal } from "./MoveToModal";
import { ChevronRight, Plus, FolderPlus, ArrowLeft, Search, ArrowDownUp, Inbox } from "lucide-react";
import type {
    DragEndEvent,
    DragStartEvent,
} from '@dnd-kit/core';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableGridItem(props: { id: string, children: React.ReactNode, disabled?: boolean, activeId: string | null }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id, disabled: props.disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition || undefined,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.6 : 1,
        scale: isDragging ? "1.02" : "1",
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`${props.disabled ? "touch-auto" : "touch-none"} relative`}
        >
            <div className={`transition-opacity ${isDragging ? "pointer-events-none" : ""}`}>
                {props.children}
            </div>
        </div>
    );
}

interface FolderExplorerProps {
    type: "board" | "session";
    sport: string | null;
    onFolderChange?: (folderId: string | null) => void;
    onSelect?: (id: string, title: string, item?: any) => void;
    hideOptions?: boolean;
    excludeIds?: string[];
    onNewClick?: () => void;
}

export function FolderExplorer({ type, sport, onFolderChange, onSelect, hideOptions, excludeIds, onNewClick }: FolderExplorerProps) {
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string, name: string }[]>([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sortBy, setSortBy] = useState("manual");
    const [isReorderActive, setIsReorderActive] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
        return () => clearTimeout(t);
    }, [searchQuery]);

    const [contextMenuState, setContextMenuState] = useState<{
        isOpen: boolean;
        x: number;
        y: number;
        itemId: string | null;
        itemType: ItemType | null;
        isFavorite: boolean;
        title: string;
    }>({ isOpen: false, x: 0, y: 0, itemId: null, itemType: null, isFavorite: false, title: "" });

    const [moveToModalState, setMoveToModalState] = useState<{
        isOpen: boolean;
        itemId: string | null;
        itemType: ItemType | null;
    }>({ isOpen: false, itemId: null, itemType: null });

    const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
    const [isFoldersExpanded, setIsFoldersExpanded] = useState(false);

    const utils = api.useUtils();

    const { data: contents, isLoading } = api.folder.getContents.useQuery({
        type,
        parentId: currentFolderId,
        sport: sport ?? undefined,
        search: debouncedSearch || undefined,
        sortBy
    }, {
        staleTime: 30000, // 30 seconds
        gcTime: 300000,  // 5 minutes
    });

    const fetchedFolders = contents?.folders ?? [];
    const fetchedBoards = contents?.boards ?? [];
    const fetchedSessions = contents?.sessions ?? [];

    const folders = fetchedFolders;
    const boards = fetchedBoards;
    const sessions = (fetchedSessions as any[]);

    const moveBoard = api.board.updateMetadata.useMutation({
        onSuccess: () => {
            utils.folder.getContents.invalidate();
            utils.board.getRecent.invalidate();
        }
    });

    const moveFolder = api.folder.move.useMutation({
        onSuccess: () => utils.folder.getContents.invalidate()
    });

    const moveSession = api.session.updateMetadata.useMutation({
        onSuccess: () => {
            utils.folder.getContents.invalidate();
            utils.session.getRecent.invalidate();
        }
    });

    const toggleFavFolder = api.folder.toggleFavorite.useMutation({
        onSuccess: (updated) => {
            utils.folder.getContents.setData({ type, parentId: currentFolderId, sport: sport ?? undefined, search: debouncedSearch || undefined, sortBy }, (prev) => {
                if (!prev) return prev;
                return { ...prev, folders: prev.folders.map(f => f.id === updated.id ? { ...f, isFavorite: updated.isFavorite } : f) };
            });
        }
    });
    const toggleFavBoard = api.board.toggleFavorite.useMutation({
        onSuccess: (updated) => {
            utils.folder.getContents.setData({ type, parentId: currentFolderId, sport: sport ?? undefined, search: debouncedSearch || undefined, sortBy }, (prev) => {
                if (!prev) return prev;
                return { ...prev, boards: prev.boards.map(b => b.id === updated.id ? { ...b, isFavorite: updated.isFavorite } : b) };
            });
        }
    });
    const toggleFavSession = api.session.toggleFavorite.useMutation({
        onSuccess: (updated) => {
            utils.folder.getContents.setData({ type, parentId: currentFolderId, sport: sport ?? undefined, search: debouncedSearch || undefined, sortBy }, (prev) => {
                if (!prev) return prev;
                return { ...prev, sessions: prev.sessions.map((s: any) => s.id === updated.id ? { ...s, isFavorite: updated.isFavorite } : s) };
            });
        }
    });

    const renameFolder = api.folder.rename.useMutation({
        onSuccess: (updated) => {
            utils.folder.getContents.setData({ type, parentId: currentFolderId, sport: sport ?? undefined, search: debouncedSearch || undefined, sortBy }, (prev) => {
                if (!prev) return prev;
                return { ...prev, folders: prev.folders.map(f => f.id === updated.id ? { ...f, name: updated.name } : f) };
            });
        }
    });
    const renameBoard = api.board.updateMetadata.useMutation({
        onSuccess: (updated) => {
            utils.folder.getContents.setData({ type, parentId: currentFolderId, sport: sport ?? undefined, search: debouncedSearch || undefined, sortBy }, (prev) => {
                if (!prev) return prev;
                return { ...prev, boards: prev.boards.map(b => b.id === updated.id ? { ...b, title: updated.title } : b) };
            });
        }
    });
    const renameSession = api.session.updateMetadata.useMutation({
        onSuccess: (updated) => {
            utils.folder.getContents.setData({ type, parentId: currentFolderId, sport: sport ?? undefined, search: debouncedSearch || undefined, sortBy }, (prev) => {
                if (!prev) return prev;
                return { ...prev, sessions: prev.sessions.map((s: any) => s.id === updated.id ? { ...s, title: updated.title } : s) };
            });
        }
    });

    const handleRenameSubmit = (id: string, type: ItemType, newName: string, originalName: string) => {
        setRenamingItemId(null);
        if (!newName.trim() || newName === originalName) return;

        if (type === "folder") {
            setLocalFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
            renameFolder.mutate({ id, name: newName });
        } else if (type === "board") {
            setLocalBoards(prev => prev.map(b => b.id === id ? { ...b, title: newName } : b));
            renameBoard.mutate({ id, title: newName });
        } else if (type === "session") {
            setLocalSessions(prev => prev.map(s => s.id === id ? { ...s, title: newName } : s));
            renameSession.mutate({ id, title: newName });
        }
    };

    const updateFolderOrder = api.folder.updateOrder.useMutation({ onSuccess: () => utils.folder.getAll.invalidate() });
    const updateBoardOrder = api.board.updateOrder.useMutation({ onSuccess: () => utils.board.getAll.invalidate() });
    const updateSessionOrder = api.session.updateOrder.useMutation({ onSuccess: () => utils.session.getAll.invalidate() });

    const [localFolders, setLocalFolders] = useState<any[]>([]);
    const [localBoards, setLocalBoards] = useState<any[]>([]);
    const [localSessions, setLocalSessions] = useState<any[]>([]);

    useEffect(() => { if (contents?.folders) setLocalFolders(contents.folders); }, [contents?.folders]);
    useEffect(() => { if (contents?.boards) setLocalBoards(contents.boards); }, [contents?.boards]);
    useEffect(() => { if (contents?.sessions) setLocalSessions(contents.sessions as any[]); }, [contents?.sessions]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 15 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    const handleDragStart = (e: DragStartEvent) => {
        setActiveDragId(e.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent, itemType: "folder" | "board" | "session") => {
        setActiveDragId(null);
        if (debouncedSearch) return;

        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const isOverFolder = localFolders.some(f => f.id === over.id);
        if (isOverFolder && itemType !== "folder") {
            handleDrop(active.id as string, itemType, over.id as string);
            return;
        }

        if (isOverFolder && itemType === "folder") {
        }

        if (sortBy !== "manual") return;

        let list = itemType === "folder" ? localFolders : itemType === "board" ? localBoards : localSessions;
        const setLocalList = itemType === "folder" ? setLocalFolders : itemType === "board" ? setLocalBoards : setLocalSessions as any;

        const oldIndex = list.findIndex(item => item.id === active.id);
        const newIndex = list.findIndex(item => item.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const updatedList = arrayMove(list, oldIndex, newIndex);
        setLocalList(updatedList);

        const updates = updatedList
            .map((item, idx) => ({ id: item.id, order: idx }))
            .filter((item, idx) => list[idx].id !== item.id);

        if (updates.length === 0) return;

        if (itemType === "folder") updateFolderOrder.mutate(updates);
        else if (itemType === "board") updateBoardOrder.mutate(updates);
        else updateSessionOrder.mutate(updates);
    };

    const handleDrop = (elementId: string, elType: string, targetFolderId: string | null) => {
        if (elType === 'board') {
            setLocalBoards(prev => prev.filter(b => b.id !== elementId));
            moveBoard.mutate({ id: elementId, folderId: targetFolderId });
        } else if (elType === 'session') {
            setLocalSessions(prev => prev.filter(s => s.id !== elementId));
            moveSession.mutate({ id: elementId, folderId: targetFolderId });
        } else if (elType === 'folder') {
            if (elementId === targetFolderId) return;
            setLocalFolders(prev => prev.filter(f => f.id !== elementId));
            moveFolder.mutate({ id: elementId, parentId: targetFolderId });
        }
    };

    const navigateUp = (index: number) => {
        if (index === -1) {
            setCurrentFolderId(null);
            setBreadcrumbs([]);
            onFolderChange?.(null);
        } else {
            const newId = breadcrumbs[index]!.id;
            setCurrentFolderId(newId);
            setBreadcrumbs(prev => prev.slice(0, index + 1));
            onFolderChange?.(newId);
        }
    };

    const navigateToFolder = (id: string, name: string) => {
        setCurrentFolderId(id);
        setBreadcrumbs(prev => [...prev, { id, name }]);
        onFolderChange?.(id);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4 sticky top-0 z-20 bg-slate-100/80 backdrop-blur-md py-2 -mx-2 px-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-slate-700 whitespace-nowrap shrink-0">
                        <button
                            onClick={() => navigateUp(-1)}
                            className={`hover:text-orange-500 transition-colors ${currentFolderId === null ? "text-orange-500" : ""}`}
                        >
                            {type === 'board' ? 'Drills' : 'Sessions'}
                        </button>

                        {breadcrumbs.map((crumb, idx) => (
                            <div key={crumb.id} className="flex items-center gap-2">
                                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
                                <button
                                    onClick={() => navigateUp(idx)}
                                    className={`hover:text-orange-500 transition-colors ${idx === breadcrumbs.length - 1 ? "text-orange-500" : ""}`}
                                >
                                    {crumb.name}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="relative flex-1 min-w-[120px] max-w-md">
                        <input
                            type="text"
                            placeholder={`Search...`}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pr-4 py-1.5 bg-white/50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-orange-400 focus:bg-white transition-all placeholder:text-slate-300 shadow-sm"
                            style={{ paddingLeft: '48px' }}
                            suppressHydrationWarning
                        />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" strokeWidth={3} />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white/50 border-2 border-slate-200 rounded-xl px-2 py-1 focus-within:border-orange-400 transition-all shadow-sm">
                        <div className="pl-1 flex items-center gap-1.5 opacity-40">
                            <ArrowDownUp className="w-3 h-3" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 hidden lg:inline">Sort</span>
                        </div>
                        <select
                            value={sortBy}
                            onChange={e => { setSortBy(e.target.value); if (e.target.value !== 'manual') setIsReorderActive(false); }}
                            className="bg-transparent text-slate-600 text-[10px] font-black uppercase tracking-widest py-1 px-1 outline-none cursor-pointer"
                            suppressHydrationWarning
                        >
                            <option value="manual">Manual</option>
                            <option value="favorites">Favs</option>
                            <option value="nameAsc">A-Z</option>
                            <option value="nameDesc">Z-A</option>
                            <option value="recent">New</option>
                            <option value="oldest">Old</option>
                        </select>
                    </div>

                    {sortBy === 'manual' && (
                        <button
                            onClick={() => setIsReorderActive(!isReorderActive)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${isReorderActive ? 'bg-orange-500 border-orange-500 text-white shadow-orange-200' : 'bg-white border-slate-200 text-slate-400 hover:border-orange-400 hover:text-slate-600'}`}
                        >
                            {isReorderActive ? "DONE" : "REORDER"}
                        </button>
                    )}

                    {hideOptions && folders.length > 8 && (
                        <button
                            onClick={() => setIsFoldersExpanded(!isFoldersExpanded)}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all group px-2 py-1.5 rounded-lg bg-white/50 border-2 border-slate-200 shadow-sm"
                        >
                            {isFoldersExpanded ? "Less" : "More folders"}
                            <ChevronRight className={`h-3 w-3 transition-transform ${isFoldersExpanded ? "-rotate-90" : "rotate-90"}`} strokeWidth={3} />
                        </button>
                    )}
                </div>
            </div>

            {currentFolderId && (
                <div
                    className="flex items-center gap-2 p-3 w-64 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => navigateUp(breadcrumbs.length - 2)}
                    onDragOver={hideOptions ? undefined : e => {
                        e.preventDefault();
                        e.currentTarget.classList.add('bg-orange-50', 'border-orange-300');
                    }}
                    onDragLeave={hideOptions ? undefined : e => {
                        e.currentTarget.classList.remove('bg-orange-50', 'border-orange-300');
                    }}
                    onDrop={hideOptions ? undefined : e => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('bg-orange-50', 'border-orange-300');
                        const dataStr = e.dataTransfer.getData("application/json");
                        if (!dataStr) return;
                        try {
                            const data = JSON.parse(dataStr);
                            const targetFolderId = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2]!.id : null;
                            handleDrop(data.id, data.type, targetFolderId);
                        } catch { }
                    }}
                >
                    <ArrowLeft className="h-5 w-5" />
                    <span className="text-sm font-bold">Go back...</span>
                </div>
            )}

            {folders.length > 0 && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={e => handleDragEnd(e, "folder")}
                >
                    <SortableContext
                        items={(hideOptions && !isFoldersExpanded ? localFolders.slice(0, 8) : localFolders).map(f => f.id)}
                        strategy={rectSortingStrategy}
                    >
                        <div className={hideOptions ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-4 w-full" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-4 w-full"}>
                            {(hideOptions && !isFoldersExpanded ? localFolders.slice(0, 8) : localFolders).map((folder: any) => (
                                <SortableGridItem
                                    key={folder.id}
                                    id={folder.id}
                                    activeId={activeDragId}
                                    disabled={!isReorderActive || sortBy !== "manual" || !!debouncedSearch}
                                >
                                    <FolderCard
                                        id={folder.id}
                                        name={folder.name}
                                        onClick={() => navigateToFolder(folder.id, folder.name)}
                                        onOptionsClick={hideOptions ? undefined : (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setContextMenuState({
                                                isOpen: true,
                                                x: e.clientX,
                                                y: e.clientY,
                                                itemId: folder.id,
                                                itemType: "folder",
                                                isFavorite: folder.isFavorite ?? false,
                                                title: folder.name
                                            });
                                        }}
                                        isRenaming={renamingItemId === folder.id}
                                        onRenameSubmit={(newName) => handleRenameSubmit(folder.id, "folder", newName, folder.name)}
                                        onDropElement={hideOptions ? undefined : (elId, elType) => handleDrop(elId, elType, folder.id)}
                                    />
                                </SortableGridItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            <div className={`${hideOptions ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"} pb-4 mt-2 w-full`}>
                {onNewClick && (
                    <button
                        onClick={onNewClick}
                        className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 aspect-[3/2] transition-all hover:border-orange-400 hover:bg-orange-50 active:scale-95"
                    >
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 group-hover:text-orange-500 group-hover:scale-110 transition-all font-black text-xl">
                            +
                        </div>
                        <div className="mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-orange-600 italic">
                            Create New {type === "board" ? "Drill" : "Session"}
                        </div>
                    </button>
                )}
                {type === 'board' && (
                    isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => <DrillCardSkeleton key={i} />)
                    ) : boards.length === 0 && folders.length === 0 ? (
                        <div className="w-full py-20 text-center text-slate-300 flex flex-col items-center">
                            <Inbox className="w-16 h-16 mb-4 opacity-20" strokeWidth={1} />
                            <div className="text-sm font-bold uppercase tracking-widest opacity-40 italic">This folder is empty</div>
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={e => handleDragEnd(e, "board")}
                        >
                            <SortableContext
                                items={localBoards.filter((b: any) => !excludeIds?.includes(b.id)).map((b: any) => b.id)}
                                strategy={rectSortingStrategy}
                            >
                                {localBoards
                                    .filter((b: any) => !excludeIds?.includes(b.id))
                                    .map((board: any) => (
                                        <SortableGridItem
                                            key={board.id}
                                            id={board.id}
                                            activeId={activeDragId}
                                            disabled={!isReorderActive || sortBy !== "manual" || !!debouncedSearch}
                                        >
                                            <DrillCard
                                                id={board.id}
                                                title={board.title}
                                                category={board.sport.toUpperCase()}
                                                href={onSelect ? undefined : `/whiteboard/${board.id}?returnTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')}`}
                                                onClick={onSelect ? () => onSelect(board.id, board.title, board) : undefined}
                                                boardData={board.data}
                                                type="board"
                                                isFavorite={board.isFavorite}
                                                onOptionsClick={hideOptions ? undefined : (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setContextMenuState({
                                                        isOpen: true,
                                                        x: e.clientX,
                                                        y: e.clientY,
                                                        itemId: board.id,
                                                        itemType: "board",
                                                        isFavorite: board.isFavorite ?? false,
                                                        title: board.title
                                                    });
                                                }}
                                                onToggleFavorite={hideOptions ? undefined : () => {
                                                    const newFavoriteState = !(board.isFavorite ?? false);
                                                    setLocalBoards(prev => prev.map(b => b.id === board.id ? { ...b, isFavorite: newFavoriteState } : b));
                                                    toggleFavBoard.mutate({ id: board.id, isFavorite: newFavoriteState });
                                                }}
                                                isRenaming={renamingItemId === board.id}
                                                onRenameSubmit={(newName) => handleRenameSubmit(board.id, "board", newName, board.title)}
                                            />
                                        </SortableGridItem>
                                    ))}
                            </SortableContext>
                        </DndContext>
                    )
                )}

                {type === 'session' && (
                    isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => <SessionCardSkeleton key={i} />)
                    ) : sessions.length === 0 && folders.length === 0 ? (
                        <div className="w-full py-20 text-center text-slate-300 flex flex-col items-center">
                            <Inbox className="w-16 h-16 mb-4 opacity-20" strokeWidth={1} />
                            <div className="text-sm font-bold uppercase tracking-widest opacity-40 italic">This folder is empty</div>
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={e => handleDragEnd(e, "session")}
                        >
                            <SortableContext
                                items={localSessions.filter((s: any) => !excludeIds?.includes(s.id)).map((s: any) => s.id)}
                                strategy={rectSortingStrategy}
                            >
                                {localSessions
                                    .filter((s: any) => !excludeIds?.includes(s.id))
                                    .map((s: any) => (
                                        <SortableGridItem
                                            key={s.id}
                                            id={s.id}
                                            activeId={activeDragId}
                                            disabled={!isReorderActive || sortBy !== "manual" || !!debouncedSearch}
                                        >
                                            <SessionCard
                                                id={s.id}
                                                title={s.title ?? "Untitled Session"}
                                                sport={s.sport ?? sport ?? "hockey"}
                                                notes={s.notes ?? ""}
                                                boardCount={s._count?.boards ?? 0}
                                                firstBoardData={null}
                                                isFavorite={s.isFavorite ?? false}
                                                href={onSelect ? undefined : `/dashboard/sessions/${s.id}`}
                                                onClick={onSelect ? () => onSelect(s.id, s.title ?? "Untitled Session", s) : undefined}
                                                onOptionsClick={hideOptions ? undefined : (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setContextMenuState({
                                                        isOpen: true,
                                                        x: e.clientX,
                                                        y: e.clientY,
                                                        itemId: s.id,
                                                        itemType: "session",
                                                        isFavorite: s.isFavorite ?? false,
                                                        title: s.title
                                                    });
                                                }}
                                                onToggleFavorite={hideOptions ? undefined : () => {
                                                    const newFavoriteState = !(s.isFavorite ?? false);
                                                    setLocalSessions(prev => prev.map(session => session.id === s.id ? { ...session, isFavorite: newFavoriteState } : session));
                                                    toggleFavSession.mutate({ id: s.id, isFavorite: newFavoriteState });
                                                }}
                                                isRenaming={renamingItemId === s.id}
                                                onRenameSubmit={(newName) => handleRenameSubmit(s.id, "session", newName, s.title)}
                                            />
                                        </SortableGridItem>
                                    ))}
                            </SortableContext>
                        </DndContext>
                    )
                )}
            </div>

            <ItemContextMenu
                isOpen={contextMenuState.isOpen}
                onClose={() => setContextMenuState(prev => ({ ...prev, isOpen: false }))}
                x={contextMenuState.x}
                y={contextMenuState.y}
                itemId={contextMenuState.itemId}
                itemType={contextMenuState.itemType}
                isFavorite={contextMenuState.isFavorite}
                onRename={() => {
                    if (contextMenuState.itemId && contextMenuState.itemType) {
                        setRenamingItemId(contextMenuState.itemId);
                    }
                }}
                onMove={() => {
                    if (contextMenuState.itemId && contextMenuState.itemType) {
                        setMoveToModalState({
                            isOpen: true,
                            itemId: contextMenuState.itemId,
                            itemType: contextMenuState.itemType
                        });
                    }
                }}
            />

            {moveToModalState.isOpen && moveToModalState.itemId && moveToModalState.itemType && (
                <MoveToModal
                    isOpen={moveToModalState.isOpen}
                    onClose={() => setMoveToModalState(prev => ({ ...prev, isOpen: false }))}
                    itemId={moveToModalState.itemId}
                    itemType={moveToModalState.itemType}
                    currentFolderId={currentFolderId}
                    onMove={(targetFolderId) => {
                        if (moveToModalState.itemId && moveToModalState.itemType) {
                            handleDrop(moveToModalState.itemId, moveToModalState.itemType, targetFolderId);
                        }
                    }}
                />
            )}
        </div>
    );
}
