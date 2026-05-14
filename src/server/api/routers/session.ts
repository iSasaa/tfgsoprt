import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const SessionEntrySchema = z.object({
    boardId: z.string(),
    localTitle: z.string().optional(),
    durationMin: z.number().optional(),
    sessionOnly: z.boolean().optional(),
});

const ENTRIES_MARKER = "<!--entries:";
const ENTRIES_END = ":entries-->";

type EntryType = { boardId: string; localTitle?: string; durationMin?: number; sessionOnly?: boolean };

function extractEntries(notes: string): EntryType[] {
    const start = notes.indexOf(ENTRIES_MARKER);
    const end = notes.indexOf(ENTRIES_END);
    if (start === -1 || end === -1) return [];
    try {
        return JSON.parse(notes.slice(start + ENTRIES_MARKER.length, end)) as EntryType[];
    } catch {
        return [];
    }
}

function extractHumanNotes(notes: string): string {
    const start = notes.indexOf(ENTRIES_MARKER);
    if (start === -1) return notes;
    return notes.slice(0, start).trimEnd();
}

function packNotes(humanNotes: string, entries: EntryType[]): string {
    return `${humanNotes}\n${ENTRIES_MARKER}${JSON.stringify(entries)}${ENTRIES_END}`.trim();
}

export const sessionRouter = createTRPCRouter({
    getAll: protectedProcedure
        .input(z.object({ 
            sport: z.string().optional(),
            folderId: z.string().optional().nullable(),
            search: z.string().optional(),
            sortBy: z.string().optional(),
            withBoards: z.boolean().optional().default(false),
        }))
        .query(async ({ ctx, input }) => {
            let orderByOptions: any = [ { order: "asc" }, { updatedAt: "desc" } ];
            if (input.sortBy === "nameAsc") orderByOptions = { title: "asc" };
            else if (input.sortBy === "nameDesc") orderByOptions = { title: "desc" };
            else if (input.sortBy === "recent") orderByOptions = { updatedAt: "desc" };
            else if (input.sortBy === "oldest") orderByOptions = { updatedAt: "asc" };
            else if (input.sortBy === "favorites") orderByOptions = [ { isFavorite: "desc" }, { order: "asc" } ];

            const sessions = await ctx.db.trainingSession.findMany({
                where: { 
                    userId: ctx.session.user.id,
                    ...(input.search ? {} : input.folderId !== undefined ? { folderId: input.folderId } : {}),
                    ...(input.sport ? { 
                        sport: input.sport.toLowerCase()
                    } : {}),
                    ...(input.search && {
                        title: { contains: input.search, mode: 'insensitive' }
                    })
                },
                orderBy: orderByOptions,
                include: {
                    _count: { select: { boards: true } },
                    ...(input.withBoards ? {
                        boards: { select: { id: true, title: true, sport: true } }
                    } : {}),
                },
            });

            if (!input.withBoards) {
                return sessions.map(s => ({ ...s, firstBoardData: null }));
            }

            const sessionWithEntries = sessions.map(s => ({
                ...s,
                entries: extractEntries(s.notes ?? "")
            }));
            
            return sessionWithEntries.map(s => ({ ...s, firstBoardData: null }));
        }),

    getRecent: protectedProcedure
        .input(z.object({ 
            sport: z.string().optional(),
            withBoards: z.boolean().optional().default(false)
        }))
        .query(async ({ ctx, input }) => {
            const sessions = await ctx.db.trainingSession.findMany({
                where: { 
                    userId: ctx.session.user.id,
                    ...(input.sport ? { 
                        sport: { equals: input.sport, mode: 'insensitive' }
                    } : {}),
                },
                orderBy: { updatedAt: "desc" },
                take: 5,
                include: {
                    _count: { select: { boards: true } },
                    ...(input.withBoards ? {
                        boards: { select: { id: true, title: true, sport: true } }
                    } : {}),
                },
            });

            if (!input.withBoards) {
                return sessions.map(s => ({ ...s, firstBoardData: null }));
            }

            const sessionWithEntries = sessions.map(s => ({
                ...s,
                entries: extractEntries(s.notes ?? "")
            }));

            const firstBoardIds = sessionWithEntries
                .map(s => s.entries[0]?.boardId)
                .filter(Boolean) as string[];

            const sessionsWithoutEntries = sessionWithEntries.filter(s => s.entries.length === 0);

            const previewBoards = await ctx.db.board.findMany({
                where: {
                    OR: [
                        { id: { in: firstBoardIds } },
                        { sessionId: { in: sessionsWithoutEntries.map(s => s.id) } }
                    ]
                },
                select: { id: true, sessionId: true }
            });

            return sessionWithEntries.map(s => {
                const firstId = s.entries[0]?.boardId;
                const firstBoard = previewBoards.find(b => b.id === firstId)
                    || previewBoards.find(b => b.sessionId === s.id);
                return {
                    ...s,
                    firstBoardData: null
                };
            });
        }),

    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const session = await ctx.db.trainingSession.findUnique({
                where: { id: input.id },
            });
            if (!session) return null;
            if (session.userId !== ctx.session.user.id) throw new Error("Unauthorized");

            const entries = extractEntries(session.notes ?? "");
            const boardIds = entries.map(e => e.boardId);

            const boards = await ctx.db.board.findMany({
                where: {
                    OR: [
                        { id: { in: boardIds } },
                        { sessionId: input.id }
                    ]
                }
            });

            return { ...session, boards };
        }),

    create: protectedProcedure
        .input(z.object({
            title: z.string().min(1),
            sport: z.string().min(1),
            notes: z.string().optional(),
            folderId: z.string().optional().nullable(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.trainingSession.create({
                data: {
                    title: input.title,
                    sport: input.sport,
                    date: new Date(),
                    notes: input.notes ?? "",
                    userId: ctx.session.user.id,
                    folderId: input.folderId ?? null,
                },
            });
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            title: z.string().min(1).optional(),
            sport: z.string().optional(),
            notes: z.string().optional(),
            entries: z.array(SessionEntrySchema).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.trainingSession.findUnique({ where: { id: input.id } });
            if (!session || session.userId !== ctx.session.user.id) throw new Error("Unauthorized");

            let notes = session.notes ?? "";
            if (input.entries !== undefined) {
                const existingNotes = extractHumanNotes(notes);
                notes = packNotes(existingNotes, input.entries);
            } else if (input.notes !== undefined) {
                const existingEntries = extractEntries(notes);
                notes = packNotes(input.notes, existingEntries);
            }

            return ctx.db.trainingSession.update({
                where: { id: input.id },
                data: {
                    ...(input.title ? { title: input.title } : {}),
                    ...(input.sport ? { sport: input.sport } : {}),
                    notes,
                },
            });
        }),

    addBoard: protectedProcedure
        .input(z.object({
            sessionId: z.string(),
            boardId: z.string(),
            localTitle: z.string().optional(),
            durationMin: z.number().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.trainingSession.findUnique({ where: { id: input.sessionId } });
            if (!session || session.userId !== ctx.session.user.id) throw new Error("Unauthorized");

            // We no longer update the board's sessionId here.
            // If the board was created as sessionOnly, it already has the sessionId set.
            // If it's a global board, we want to leave its sessionId as null so it remains in the library.

            const entries = extractEntries(session.notes ?? "");
            const alreadyExists = entries.some(e => e.boardId === input.boardId);
            if (!alreadyExists) {
                entries.push({
                    boardId: input.boardId,
                    localTitle: input.localTitle ?? "",
                    durationMin: input.durationMin ?? 10,
                });
            }
            const humanNotes = extractHumanNotes(session.notes ?? "");
            await ctx.db.trainingSession.update({
                where: { id: input.sessionId },
                data: { notes: packNotes(humanNotes, entries) },
            });
        }),

    removeBoard: protectedProcedure
        .input(z.object({ sessionId: z.string(), boardId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.trainingSession.findUnique({ where: { id: input.sessionId } });
            if (!session || session.userId !== ctx.session.user.id) throw new Error("Unauthorized");

            const board = await ctx.db.board.findUnique({ where: { id: input.boardId } });
            if (!board) return;

            const entries = extractEntries(session.notes ?? "");
            if (board.sessionId === input.sessionId) {
                // This board was created exclusively for this session, so delete it when removed
                await ctx.db.board.delete({ where: { id: input.boardId } });
            }
            // If it's a global board (sessionId: null), we do nothing to the board itself, 
            // we just remove it from the session's entries below.

            const newEntries = entries.filter(e => e.boardId !== input.boardId);
            const humanNotes = extractHumanNotes(session.notes ?? "");
            await ctx.db.trainingSession.update({
                where: { id: input.sessionId },
                data: { notes: packNotes(humanNotes, newEntries) },
            });
        }),

    updateEntry: protectedProcedure
        .input(z.object({
            sessionId: z.string(),
            boardId: z.string(),
            localTitle: z.string().optional(),
            durationMin: z.number().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.trainingSession.findUnique({ where: { id: input.sessionId } });
            if (!session || session.userId !== ctx.session.user.id) throw new Error("Unauthorized");

            const entries = extractEntries(session.notes ?? "");
            const updated = entries.map(e => e.boardId === input.boardId ? {
                ...e,
                ...(input.localTitle !== undefined ? { localTitle: input.localTitle } : {}),
                ...(input.durationMin !== undefined ? { durationMin: input.durationMin } : {}),
            } : e);
            const humanNotes = extractHumanNotes(session.notes ?? "");
            await ctx.db.trainingSession.update({
                where: { id: input.sessionId },
                data: { notes: packNotes(humanNotes, updated) },
            });
        }),

    reorderBoards: protectedProcedure
        .input(z.object({
            sessionId: z.string(),
            boardIds: z.array(z.string()),
        }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.trainingSession.findUnique({ where: { id: input.sessionId } });
            if (!session || session.userId !== ctx.session.user.id) throw new Error("Unauthorized");

            const entries = extractEntries(session.notes ?? "");
            const reordered = input.boardIds.map(bid => entries.find(e => e.boardId === bid) ?? { boardId: bid }).filter(Boolean) as typeof entries;
            const humanNotes = extractHumanNotes(session.notes ?? "");
            await ctx.db.trainingSession.update({
                where: { id: input.sessionId },
                data: { notes: packNotes(humanNotes, reordered) },
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.trainingSession.findUnique({ where: { id: input.id } });
            if (!session || session.userId !== ctx.session.user.id) throw new Error("Session not found or unauthorized");
            return ctx.db.trainingSession.delete({ where: { id: input.id } });
        }),

    updateMetadata: protectedProcedure
        .input(z.object({
            id: z.string(),
            title: z.string().optional(),
            folderId: z.string().optional().nullable(),
        }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.trainingSession.findUnique({ where: { id: input.id } });
            if (!session || session.userId !== ctx.session.user.id) throw new Error("Unauthorized");

            return ctx.db.trainingSession.update({
                where: { id: input.id },
                data: {
                    ...(input.title && { title: input.title }),
                    ...(input.folderId !== undefined && { folderId: input.folderId }),
                },
            });
        }),

    duplicate: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.trainingSession.findUnique({
                where: { id: input.id },
            });
            if (!session || session.userId !== ctx.session.user.id) {
                throw new Error("Session not found or unauthorized");
            }

            const newSession = await ctx.db.trainingSession.create({
                data: {
                    title: `Copy of ${session.title}`,
                    sport: session.sport,
                    date: new Date(),
                    notes: session.notes,
                    userId: ctx.session.user.id,
                    folderId: session.folderId,
                },
            });

            const sessionBoards = await ctx.db.board.findMany({
                where: { sessionId: session.id },
            });

            const boardIdMap = new Map<string, string>();

            for (const board of sessionBoards) {
                const newBoard = await ctx.db.board.create({
                    data: {
                        title: board.title,
                        sport: board.sport,
                        userId: ctx.session.user.id,
                        sessionId: newSession.id,
                        folderId: null,
                        data: board.data ?? {},
                    },
                });
                boardIdMap.set(board.id, newBoard.id);
            }

            const entries = extractEntries(newSession.notes ?? "");
            for (const entry of entries) {
                if (boardIdMap.has(entry.boardId)) {
                    entry.boardId = boardIdMap.get(entry.boardId)!;
                }
            }
            const humanNotes = extractHumanNotes(newSession.notes ?? "");
            await ctx.db.trainingSession.update({
                where: { id: newSession.id },
                data: { notes: packNotes(humanNotes, entries) },
            });

            return newSession;
        }),

    toggleFavorite: protectedProcedure
        .input(z.object({ id: z.string(), isFavorite: z.boolean() }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.trainingSession.findUnique({
                where: { id: input.id },
            });
            if (!session || session.userId !== ctx.session.user.id) {
                throw new Error("Session not found or unauthorized");
            }

            return ctx.db.trainingSession.update({
                where: { id: input.id },
                data: { isFavorite: input.isFavorite },
            });
        }),

    updateOrder: protectedProcedure
        .input(z.array(z.object({ id: z.string(), order: z.number() })))
        .mutation(async ({ ctx, input }) => {
            const updates = input.map(({ id, order }) => 
                ctx.db.trainingSession.updateMany({
                    where: { id, userId: ctx.session.user.id },
                    data: { order }
                })
            );
            return ctx.db.$transaction(updates);
        }),
});
