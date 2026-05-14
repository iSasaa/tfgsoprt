"use client";

import { useMemo, useCallback } from "react";
import { api } from "~/trpc/react";
import { format } from "date-fns";

export type EventType = "session" | "match" | "training" | "other";

export interface CalendarEvent {
    id: string;
    title: string;
    sport?: string;
    teamId?: string;
    clubId?: string;
    sessionId?: string;
    type: EventType;
    time?: string;
    endTime?: string;
    notes?: string;
    drills?: {
        id?: string;
        boardId: string | null;
        localTitle: string;
        durationMin: number;
        boardData: any;
        sport?: string;
        order: number;
    }[];
}

type CalendarStore = Record<string, CalendarEvent[]>; // key: "YYYY-MM-DD"

export function useCalendarSchedule(teamId?: string, sport?: string, clubId?: string) {
    const utils = api.useUtils();

    const { data: dbEvents = [], isLoading } = api.calendar.getEvents.useQuery(
        { teamId, sport, clubId },
        {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 30 * 60 * 1000,    // 30 minutes
            refetchOnWindowFocus: false,
        }
    );

    const addMutation = api.calendar.addEvent.useMutation({
        onSuccess: () => utils.calendar.getEvents.invalidate(),
    });
    const updateMutation = api.calendar.updateEvent.useMutation({
        onSuccess: () => utils.calendar.getEvents.invalidate(),
    });
    const removeMutation = api.calendar.removeEvent.useMutation({
        onSuccess: () => utils.calendar.getEvents.invalidate(),
    });

    const store = useMemo(() => {
        const result: CalendarStore = {};
        dbEvents.forEach((event: any) => {
            const dateKey = format(new Date(event.date), "yyyy-MM-dd");
            if (!result[dateKey]) result[dateKey] = [];

            const mappedEvent: CalendarEvent = {
                ...event,
                type: event.type as EventType,
                drills: event.drills?.map((d: any) => ({
                    ...d,
                }))
            };

            result[dateKey].push(mappedEvent);
        });
        return result;
    }, [dbEvents]);

    const addEvent = useCallback(async (dateKey: string, event: Omit<CalendarEvent, "id">) => {
        return await addMutation.mutateAsync({
            ...event,
            date: new Date(dateKey),
            type: event.type,
            teamId: teamId || event.teamId,
            sport: sport || event.sport,
            clubId: clubId || event.clubId,
        });
    }, [addMutation, teamId, sport, clubId]);

    const removeEvent = useCallback(async (_dateKey: string, eventId: string) => {
        if (!eventId) {
            console.error("removeEvent called without eventId", { _dateKey, eventId });
            return;
        }
        return await removeMutation.mutateAsync({ id: eventId });
    }, [removeMutation]);

    const updateEvent = useCallback(async (_dateKey: string, eventId: string, updates: Partial<CalendarEvent>) => {
        const drillsForDb = updates.drills?.map((d, index) => ({
            boardId: d.boardId,
            localTitle: d.localTitle,
            durationMin: d.durationMin,
            boardData: d.boardData,
            order: d.order ?? index,
        }));

        return await updateMutation.mutateAsync({
            id: eventId,
            title: updates.title,
            time: updates.time,
            endTime: updates.endTime,
            type: updates.type,
            notes: updates.notes,
            ...(drillsForDb ? { drills: drillsForDb } : {}),
            ...(updates.sessionId ? {} : {}),
        });
    }, [updateMutation]);

    const getEventsForDate = useCallback((dateKey: string): CalendarEvent[] => {
        return store[dateKey] ?? [];
    }, [store]);

    return {
        store,
        addEvent,
        removeEvent,
        updateEvent,
        getEventsForDate,
        isAdding: addMutation.isPending,
        isUpdating: updateMutation.isPending,
        isRemoving: removeMutation.isPending,
        isHydrated: !isLoading
    };
}
