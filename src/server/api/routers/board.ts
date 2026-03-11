import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const boardRouter = createTRPCRouter({
    create: protectedProcedure
        .input(z.object({
            title: z.string().min(1),
            sport: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            const board = await ctx.db.board.create({
                data: {
                    title: input.title,
                    sport: input.sport,
                    userId: ctx.session.user.id,
                    data: {}, // Initial empty JSON object
                },
            });
            return board;
        }),

    getAll: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db.board.findMany({
            where: {
                userId: ctx.session.user.id,
            },
            orderBy: {
                updatedAt: "desc",
            },
        });
    }),

    getRecent: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db.board.findMany({
            where: { userId: ctx.session.user.id },
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
            if (!board) return null;
            // Verify ownership if needed, though for now we just return it. 
            // In a strict multi-user app, we should check board.userId === ctx.session.user.id
            if (board.userId !== ctx.session.user.id) {
                return null; // or throw unauthorized
            }
            return board;
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            data: z.any(), // Json type handling
        }))
        .mutation(async ({ ctx, input }) => {
            // Verify ownership
            const board = await ctx.db.board.findUnique({
                where: { id: input.id, userId: ctx.session.user.id },
            });

            if (!board) {
                throw new Error("Board not found or unauthorized");
            }

            return ctx.db.board.update({
                where: { id: input.id },
                data: {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    data: input.data,
                },
            });
        }),
});
