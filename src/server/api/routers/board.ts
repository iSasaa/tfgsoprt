import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const ElementTypeSchema = z.enum([
    "player-home",
    "player-away",
    "player-third",
    "player-fourth",
    "player-5",
    "player-6",
    "player-7",
    "player-8",
    "ball",
    "cone",
    "goal",
]);

const PointSchema = z.object({
    x: z.number(),
    y: z.number(),
});

const StepSnapshotItemSchema = z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    rotation: z.number().optional(),
    wp1: PointSchema.nullable().optional(),
    wp2: PointSchema.nullable().optional(),
    ballOwner: z.string().nullable().optional(),
});

const FrameSchema = z.object({
    x: z.number(),
    y: z.number(),
    time: z.number(),
});

const FreeStepSnapshotSchema = z.object({
    initial: z.array(StepSnapshotItemSchema),
    recordings: z.record(z.array(FrameSchema)),
});

const DrawLineSchema = z.object({
    id: z.string(),
    points: z.array(z.number()),
    color: z.string(),
    size: z.number(),
    isEraser: z.boolean().optional(),
    type: z.string().optional(),
});

const ShapeDataSchema = z.object({
    id: z.string(),
    type: ElementTypeSchema,
    x: z.number(),
    y: z.number(),
    rotation: z.number().optional(),
    fill: z.string(),
    label: z.string().optional(),
    ballOwner: z.string().nullable().optional(),
    isGlobal: z.boolean().optional(),
});

const BoardDataSchema = z.object({
    shapes: z.array(ShapeDataSchema).optional(),
    steps: z.array(z.array(StepSnapshotItemSchema)).optional(),
    freeSteps: z.array(FreeStepSnapshotSchema).optional(),
    drawLines: z.array(DrawLineSchema).optional(),
});

export const boardRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            title: z.string().min(1),
            sport: z.string().min(1),
            folderId: z.string().optional().nullable(),
        }))
        .mutation(async ({ ctx, input }) => {
            const board = await ctx.db.board.create({
                data: {
                    title: input.title,
                    sport: input.sport,
                    userId: ctx.session.user.id,
                    folderId: input.folderId ?? null,
                    data: {},
                },
            });
            return board;
        }),

    createForSession: protectedProcedure
        .input(z.object({
            title: z.string().min(1),
            sport: z.string().min(1),
            sessionId: z.string(),
            folderId: z.string().optional().nullable(),
            sessionOnly: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const board = await ctx.db.board.create({
                data: {
                    title: input.title,
                    sport: input.sport,
                    userId: ctx.session.user.id,
                    sessionId: input.sessionId,
                    folderId: input.folderId ?? null,
                    data: {},
                },
            });
            return board;
        }),

    getAll: protectedProcedure
        .input(z.object({
            sport: z.string().optional(),
            folderId: z.string().optional().nullable(),
            search: z.string().optional(),
            sortBy: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            let orderByOptions: any = [{ order: "asc" }, { updatedAt: "desc" }];
            if (input.sortBy === "nameAsc") orderByOptions = { title: "asc" };
            else if (input.sortBy === "nameDesc") orderByOptions = { title: "desc" };
            else if (input.sortBy === "recent") orderByOptions = { updatedAt: "desc" };
            else if (input.sortBy === "oldest") orderByOptions = { updatedAt: "asc" };
            else if (input.sortBy === "favorites") orderByOptions = [{ isFavorite: "desc" }, { order: "asc" }];

            return ctx.db.board.findMany({
                where: {
                    userId: ctx.session.user.id,
                    sessionId: null,
                    ...(input.search ? {} : input.folderId !== undefined ? { folderId: input.folderId } : {}),
                    ...(input.sport ? {
                        sport: input.sport.toLowerCase()
                    } : {}),
                    ...(input.search && {
                        title: { contains: input.search, mode: 'insensitive' }
                    })
                },
                orderBy: orderByOptions,
            });
        }),

    getRecent: protectedProcedure
        .input(z.object({ sport: z.string().optional() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.board.findMany({
                where: {
                    userId: ctx.session.user.id,
                    sessionId: null,
                    ...(input.sport ? {
                        sport: input.sport.toLowerCase()
                    } : {}),
                },
                orderBy: { updatedAt: "desc" },
                take: 5,
            });
        }),

    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const board = await ctx.db.board.findUnique({
                where: { id: input.id },
            });

            if (board) {
                if (board.userId !== ctx.session.user.id) throw new Error("Unauthorized");
                return board;
            }

            const drill = await ctx.db.eventDrill.findUnique({
                where: { id: input.id },
                include: { event: true }
            });

            if (drill) {
                if (drill.event.userId !== ctx.session.user.id) throw new Error("Unauthorized");
                return {
                    id: drill.id,
                    title: drill.localTitle,
                    sport: drill.sport || drill.event.sport || "hockey",
                    data: drill.boardData,
                    updatedAt: drill.event.updatedAt,
                    userId: drill.event.userId,
                    isSnapshot: true
                };
            }

            return null;
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            data: BoardDataSchema,
        }))
        .mutation(async ({ ctx, input }) => {
            const board = await ctx.db.board.findUnique({
                where: { id: input.id },
            });

            if (board) {
                if (board.userId !== ctx.session.user.id) throw new Error("Unauthorized");
                return ctx.db.board.update({
                    where: { id: input.id },
                    data: {
                        data: input.data as any,
                    },
                });
            }

            const drill = await ctx.db.eventDrill.findUnique({
                where: { id: input.id },
                include: { event: true }
            });

            if (drill) {
                if (drill.event.userId !== ctx.session.user.id) throw new Error("Unauthorized");
                return ctx.db.eventDrill.update({
                    where: { id: input.id },
                    data: {
                        boardData: input.data as any,
                    },
                });
            }

            throw new Error("Board or Drill not found or unauthorized");
        }),

    updateMetadata: protectedProcedure
        .input(z.object({
            id: z.string(),
            title: z.string().optional(),
            folderId: z.string().optional().nullable(),
        }))
        .mutation(async ({ ctx, input }) => {
            const board = await ctx.db.board.findUnique({ where: { id: input.id } });
            if (!board || board.userId !== ctx.session.user.id) throw new Error("Unauthorized");

            return ctx.db.board.update({
                where: { id: input.id },
                data: {
                    ...(input.title && { title: input.title }),
                    ...(input.folderId !== undefined && { folderId: input.folderId }),
                },
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const board = await ctx.db.board.findUnique({
                where: { id: input.id },
            });
            if (!board || board.userId !== ctx.session.user.id) {
                throw new Error("Unauthorized or not found");
            }

            return ctx.db.board.delete({
                where: { id: input.id },
            });
        }),

    duplicate: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const board = await ctx.db.board.findUnique({
                where: { id: input.id },
            });
            if (!board || board.userId !== ctx.session.user.id) {
                throw new Error("Unauthorized or not found");
            }

            const newBoard = await ctx.db.board.create({
                data: {
                    title: `Copy of ${board.title}`,
                    sport: board.sport,
                    userId: ctx.session.user.id,
                    sessionId: board.sessionId,
                    folderId: board.folderId,
                    data: board.data ?? {},
                },
            });
            return newBoard;
        }),

    toggleFavorite: protectedProcedure
        .input(z.object({ id: z.string(), isFavorite: z.boolean() }))
        .mutation(async ({ ctx, input }) => {
            const board = await ctx.db.board.findUnique({
                where: { id: input.id },
            });
            if (!board || board.userId !== ctx.session.user.id) {
                throw new Error("Unauthorized or not found");
            }

            return ctx.db.board.update({
                where: { id: input.id },
                data: { isFavorite: input.isFavorite },
            });
        }),

    updateOrder: protectedProcedure
        .input(z.array(z.object({ id: z.string(), order: z.number() })))
        .mutation(async ({ ctx, input }) => {
            const updates = input.map(({ id, order }) =>
                ctx.db.board.updateMany({
                    where: { id, userId: ctx.session.user.id },
                    data: { order }
                })
            );
            return ctx.db.$transaction(updates);
        }),
});
