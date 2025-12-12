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
                    data: "{}", // Fet d'inici buit
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
});
