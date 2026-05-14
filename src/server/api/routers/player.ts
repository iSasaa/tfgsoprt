import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const playerRouter = createTRPCRouter({
    getAll: protectedProcedure
        .input(z.object({ teamId: z.string() }))
        .query(({ ctx, input }) => {
            return ctx.db.player.findMany({
                where: { 
                    teamId: input.teamId,
                    team: input.teamId === "default" ? {} : { 
                        sport: { club: { userId: ctx.session.user.id } } 
                    }
                },
                orderBy: { order: "asc" },
            });
        }),

    create: protectedProcedure
        .input(z.object({
            name: z.string().min(1),
            surname: z.string().optional(),
            number: z.string().min(1),
            position: z.string().optional(),
            teamId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const team = await ctx.db.team.findFirst({
                where: { 
                    id: input.teamId,
                    sport: { club: { userId: ctx.session.user.id } }
                },
                select: { id: true }
            });
            if (!team) throw new Error("Unauthorized");

            const lastPlayer = await ctx.db.player.findFirst({
                where: { teamId: input.teamId },
                orderBy: { order: "desc" },
                select: { order: true }
            });
            const nextOrder = (lastPlayer?.order ?? -1) + 1;

            return ctx.db.player.create({
                data: {
                    name: input.name,
                    surname: input.surname ?? "",
                    number: input.number,
                    position: input.position ?? "",
                    teamId: input.teamId,
                    order: nextOrder,
                },
            });
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().optional(),
            number: z.string().optional(),
            surname: z.string().optional(),
            position: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            return ctx.db.player.update({
                where: { id },
                data,
            });
        }),

    updateStatus: protectedProcedure
        .input(z.object({ id: z.string(), status: z.enum(["active", "injured"]) }))
        .mutation(async ({ ctx, input }) => {
            const result = await ctx.db.player.updateMany({
                where: { 
                    id: input.id,
                    team: { sport: { club: { userId: ctx.session.user.id } } }
                },
                data: { status: input.status },
            });

            if (result.count === 0) throw new Error("Unauthorized or not found");
            return { id: input.id, status: input.status };
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const result = await ctx.db.player.deleteMany({
                where: { 
                    id: input.id,
                    team: { sport: { club: { userId: ctx.session.user.id } } }
                },
            });

            if (result.count === 0) throw new Error("Unauthorized or not found");
            return { id: input.id };
        }),

    updateOrder: protectedProcedure
        .input(z.array(z.object({ id: z.string(), order: z.number() })))
        .mutation(async ({ ctx, input }) => {
            const updates = input.map(({ id, order }) =>
                ctx.db.player.updateMany({
                    where: { 
                        id,
                        team: { sport: { club: { userId: ctx.session.user.id } } }
                    },
                    data: { order }
                })
            );
            return ctx.db.$transaction(updates);
        }),
});
