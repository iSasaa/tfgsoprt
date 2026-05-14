import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const folderRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            name: z.string().min(1),
            type: z.string(),
            parentId: z.string().optional().nullable(),
            sport: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.folder.create({
                data: {
                    name: input.name,
                    type: input.type,
                    parentId: input.parentId ?? null,
                    sport: input.sport,
                    userId: ctx.session.user.id,
                },
            });
        }),

    getAll: protectedProcedure
        .input(z.object({
            type: z.string(),
            parentId: z.string().optional().nullable(),
            sport: z.string().optional(),
            search: z.string().optional(),
            sortBy: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            let orderByOptions: any = [ { order: "asc" }, { updatedAt: "desc" } ];
            if (input.sortBy === "nameAsc") orderByOptions = { name: "asc" };
            else if (input.sortBy === "nameDesc") orderByOptions = { name: "desc" };
            else if (input.sortBy === "recent") orderByOptions = { updatedAt: "desc" };
            else if (input.sortBy === "oldest") orderByOptions = { updatedAt: "asc" };
            else if (input.sortBy === "favorites") orderByOptions = [ { isFavorite: "desc" }, { order: "asc" } ];

            return ctx.db.folder.findMany({
                where: {
                    userId: ctx.session.user.id,
                    type: input.type,
                    ...(input.search ? {} : { parentId: input.parentId ?? null }),
                    ...(input.sport && {
                        sport: { equals: input.sport, mode: 'insensitive' }
                    }),
                    ...(input.search && {
                        name: { contains: input.search, mode: 'insensitive' }
                    })
                },
                orderBy: orderByOptions,
            });
        }),

    rename: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            const folder = await ctx.db.folder.findUnique({ where: { id: input.id } });
            if (!folder || folder.userId !== ctx.session.user.id) throw new Error("Unauthorized");
            
            return ctx.db.folder.update({
                where: { id: input.id },
                data: { name: input.name },
            });
        }),

    move: protectedProcedure
        .input(z.object({
            id: z.string(),
            parentId: z.string().nullable(),
        }))
        .mutation(async ({ ctx, input }) => {
            const folder = await ctx.db.folder.findUnique({ where: { id: input.id } });
            if (!folder || folder.userId !== ctx.session.user.id) throw new Error("Unauthorized");
            if (input.id === input.parentId) throw new Error("Cannot move folder into itself");
            
            return ctx.db.folder.update({
                where: { id: input.id },
                data: { parentId: input.parentId },
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const folder = await ctx.db.folder.findUnique({ where: { id: input.id } });
            if (!folder || folder.userId !== ctx.session.user.id) throw new Error("Unauthorized");
            
            return ctx.db.folder.delete({
                where: { id: input.id },
            });
        }),

    toggleFavorite: protectedProcedure
        .input(z.object({ id: z.string(), isFavorite: z.boolean() }))
        .mutation(async ({ ctx, input }) => {
            const folder = await ctx.db.folder.findUnique({
                where: { id: input.id },
            });
            if (!folder || folder.userId !== ctx.session.user.id) {
                throw new Error("Folder not found or unauthorized");
            }

            return ctx.db.folder.update({
                where: { id: input.id },
                data: { isFavorite: input.isFavorite },
            });
        }),

    updateOrder: protectedProcedure
        .input(z.array(z.object({ id: z.string(), order: z.number() })))
        .mutation(async ({ ctx, input }) => {
            const updates = input.map(({ id, order }) => 
                ctx.db.folder.update({
                    where: { id, userId: ctx.session.user.id },
                    data: { order }
                })
            );
            return ctx.db.$transaction(updates);
        }),

    getContents: protectedProcedure
        .input(z.object({
            type: z.string(),
            parentId: z.string().optional().nullable(),
            sport: z.string().optional(),
            search: z.string().optional(),
            sortBy: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;
            
            let folderOrderBy: any = [ { order: "asc" }, { updatedAt: "desc" } ];
            let itemOrderBy: any = [ { order: "asc" }, { updatedAt: "desc" } ];
            
            if (input.sortBy === "nameAsc") {
                folderOrderBy = { name: "asc" };
                itemOrderBy = { title: "asc" };
            } else if (input.sortBy === "nameDesc") {
                folderOrderBy = { name: "desc" };
                itemOrderBy = { title: "desc" };
            } else if (input.sortBy === "recent") {
                folderOrderBy = { updatedAt: "desc" };
                itemOrderBy = { updatedAt: "desc" };
            } else if (input.sortBy === "oldest") {
                folderOrderBy = { updatedAt: "asc" };
                itemOrderBy = { updatedAt: "asc" };
            } else if (input.sortBy === "favorites") {
                folderOrderBy = [ { isFavorite: "desc" }, { order: "asc" } ];
                itemOrderBy = [ { isFavorite: "desc" }, { order: "asc" } ];
            }

            const [folders, boards, sessions] = await Promise.all([
                ctx.db.folder.findMany({
                    where: {
                        userId,
                        type: input.type,
                        ...(input.search ? {} : { parentId: input.parentId ?? null }),
                        ...(input.sport && {
                            sport: { equals: input.sport, mode: 'insensitive' }
                        }),
                        ...(input.search && {
                            name: { contains: input.search, mode: 'insensitive' }
                        })
                    },
                    orderBy: folderOrderBy,
                }),
                input.type === "board" ? ctx.db.board.findMany({
                    where: {
                        userId,
                        sessionId: null,
                        ...(input.search ? {} : { folderId: input.parentId ?? null }),
                        ...(input.sport && {
                            sport: { equals: input.sport, mode: 'insensitive' }
                        }),
                        ...(input.search && {
                            title: { contains: input.search, mode: 'insensitive' }
                        })
                    },
                    select: {
                        id: true,
                        title: true,
                        sport: true,
                        createdAt: true,
                        updatedAt: true,
                        isFavorite: true,
                        order: true,
                        userId: true,
                        sessionId: true,
                        folderId: true,
                    },
                    orderBy: itemOrderBy,
                }) : [],
                input.type === "session" ? ctx.db.trainingSession.findMany({
                    where: {
                        userId,
                        ...(input.search ? {} : { folderId: input.parentId ?? null }),
                        ...(input.sport && {
                            sport: { equals: input.sport, mode: 'insensitive' }
                        }),
                        ...(input.search && {
                            title: { contains: input.search, mode: 'insensitive' }
                        })
                    },
                    include: {
                        _count: {
                            select: { boards: true }
                        }
                    },
                    orderBy: itemOrderBy,
                }) : []
            ]);

            return { folders, boards, sessions };
        }),
});
