
import { z } from "zod";

import {
    createTRPCRouter,
    protectedProcedure,
} from "~/server/api/trpc";

export const clubRouter = createTRPCRouter({
    // Fetch the full hierarchy for the user: Clubs -> Sports -> Teams
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

    // Create a new Club (optionally with initial sports and their teams)
    create: protectedProcedure
        .input(z.object({
            name: z.string().min(1),
            // Updated input structure: Array of objects { name, teams[] }
            sports: z.array(z.object({
                name: z.string(),
                teams: z.array(z.string())
            })).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Map the structured input to Prisma create format
            const sportsToCreate = input.sports?.map(sport => ({
                name: sport.name,
                teams: (sport.teams ?? []).length > 0 ? {
                    create: (sport.teams ?? []).map((t) => ({ name: t }))
                } : undefined
            })) ?? [];

            return ctx.db.club.create({
                data: {
                    name: input.name,
                    userId: ctx.session.user.id,
                    sports: sportsToCreate.length > 0 ? {
                        create: sportsToCreate
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

    // Add a Sport to an existing Club
    addSport: protectedProcedure
        .input(z.object({
            clubId: z.string(),
            name: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            // Verify ownership
            const club = await ctx.db.club.findUnique({
                where: { id: input.clubId, userId: ctx.session.user.id },
            });
            if (!club) throw new Error("Club not found or unauthorized");

            return ctx.db.sport.create({
                data: {
                    name: input.name,
                    clubId: input.clubId,
                },
            });
        }),

    // Add a Team to an existing Sport
    addTeam: protectedProcedure
        .input(z.object({
            sportId: z.string(),
            clubId: z.string(), // Pass clubId to verify ownership easily
            name: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            // Verify ownership via Sport -> Club -> User
            // Optimizing: Just check if the sport belongs to a club owned by user
            const sport = await ctx.db.sport.findFirst({
                where: {
                    id: input.sportId,
                    club: {
                        userId: ctx.session.user.id
                    }
                }
            });

            if (!sport) throw new Error("Sport not found or unauthorized");

            return ctx.db.team.create({
                data: {
                    name: input.name,
                    sportId: input.sportId,
                },
            });
        }),
});
