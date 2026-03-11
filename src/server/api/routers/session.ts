import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const sessionRouter = createTRPCRouter({
    getAll: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db.trainingSession.findMany({
            where: { userId: ctx.session.user.id },
            orderBy: { date: "desc" },
            include: { _count: { select: { boards: true } } },
        });
    }),

    getRecent: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db.trainingSession.findMany({
            where: { userId: ctx.session.user.id },
            orderBy: { updatedAt: "desc" },
            take: 5,
            include: { _count: { select: { boards: true } } },
        });
    }),

    create: protectedProcedure
        .input(z.object({
            title: z.string().min(1),
            sport: z.string().min(1),
            date: z.string().optional(),
            notes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.trainingSession.create({
                data: {
                    title: input.title,
                    sport: input.sport,
                    date: input.date ? new Date(input.date) : new Date(),
                    notes: input.notes ?? "",
                    userId: ctx.session.user.id,
                },
            });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const session = await ctx.db.trainingSession.findUnique({
                where: { id: input.id },
            });
            if (!session || session.userId !== ctx.session.user.id) {
                throw new Error("Session not found or unauthorized");
            }
            return ctx.db.trainingSession.delete({ where: { id: input.id } });
        }),
});
