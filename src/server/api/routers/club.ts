
import { z } from "zod";

import {
    createTRPCRouter,
    protectedProcedure,
} from "~/server/api/trpc";

export const clubRouter = createTRPCRouter({
    getHierarchy: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db.club.findMany({
            where: {
                userId: ctx.session.user.id,
            },
            include: {
                sports: {
                    include: {
                        teams: true,
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
        });
    }),

    create: protectedProcedure
        .input(z.object({
            name: z.string().min(1),
            sports: z.array(z.object({
                name: z.string(),
                teams: z.array(z.string())
            })).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const sportsData = input.sports?.map(sport => {
                const teamData = (sport.teams ?? []).map(t => ({ name: t }));
                
                return {
                    name: sport.name,
                    teams: teamData.length > 0 ? {
                        create: teamData
                    } : undefined
                };
            }) ?? [];

            return ctx.db.club.create({
                data: {
                    name: input.name,
                    userId: ctx.session.user.id,
                    sports: sportsData.length > 0 ? {
                        create: sportsData
                    } : undefined
                },
                include: {
                    sports: {
                        include: {
                            teams: true
                        }
                    }
                }
            });
        }),

    addSport: protectedProcedure
        .input(z.object({
            clubId: z.string(),
            name: z.string().min(1),
            teamName: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const club = await ctx.db.club.findUnique({
                where: { id: input.clubId, userId: ctx.session.user.id },
            });
            if (!club) throw new Error("Club not found or unauthorized");

            return ctx.db.sport.create({
                data: {
                    name: input.name,
                    clubId: input.clubId,
                    teams: input.teamName ? {
                        create: { name: input.teamName }
                    } : undefined
                },
            });
        }),

    addTeam: protectedProcedure
        .input(z.object({
            sportId: z.string(),
            clubId: z.string(),
            name: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            const sport = await ctx.db.sport.findFirst({
                where: {
                    id: input.sportId,
                    club: { userId: ctx.session.user.id }
                }
            });
            if (!sport) throw new Error("Sport not found or unauthorized");
            return ctx.db.team.create({
                data: { name: input.name, sportId: input.sportId },
            });
        }),

    updateClub: protectedProcedure
        .input(z.object({ id: z.string(), name: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const club = await ctx.db.club.findUnique({ where: { id: input.id } });
            if (!club || club.userId !== ctx.session.user.id) throw new Error("Unauthorized");
            return ctx.db.club.update({ where: { id: input.id }, data: { name: input.name } });
        }),

    deleteClub: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const club = await ctx.db.club.findUnique({ where: { id: input.id } });
            if (!club || club.userId !== ctx.session.user.id) throw new Error("Unauthorized");
            return ctx.db.club.delete({ where: { id: input.id } });
        }),

    updateSport: protectedProcedure
        .input(z.object({ id: z.string(), name: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const sport = await ctx.db.sport.findFirst({
                where: { id: input.id, club: { userId: ctx.session.user.id } }
            });
            if (!sport) throw new Error("Unauthorized");
            return ctx.db.sport.update({ where: { id: input.id }, data: { name: input.name } });
        }),

    deleteSport: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const sport = await ctx.db.sport.findFirst({
                where: { id: input.id, club: { userId: ctx.session.user.id } }
            });
            if (!sport) throw new Error("Unauthorized");
            return ctx.db.sport.delete({ where: { id: input.id } });
        }),

    updateTeam: protectedProcedure
        .input(z.object({ id: z.string(), name: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const team = await ctx.db.team.findFirst({
                where: { id: input.id, sport: { club: { userId: ctx.session.user.id } } }
            });
            if (!team) throw new Error("Unauthorized");
            return ctx.db.team.update({ where: { id: input.id }, data: { name: input.name } });
        }),

    deleteTeam: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const team = await ctx.db.team.findFirst({
                where: { id: input.id, sport: { club: { userId: ctx.session.user.id } } }
            });
            if (!team) throw new Error("Unauthorized");
            return ctx.db.team.delete({ where: { id: input.id } });
        }),
});
