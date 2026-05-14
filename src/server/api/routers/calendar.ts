import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const calendarRouter = createTRPCRouter({
    getEvents: protectedProcedure
        .input(z.object({
            teamId: z.string().optional(),
            sport: z.string().optional(),
            clubId: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            return ctx.db.calendarEvent.findMany({
                where: {
                    userId: ctx.session.user.id,
                    ...(input.teamId ? { teamId: input.teamId } : {}),
                    ...(input.sport ? { sport: input.sport.toLowerCase() } : {}),
                    ...(input.clubId ? { clubId: input.clubId } : {}),
                },
                include: {
                    drills: {
                        select: {
                            id: true,
                            eventId: true,
                            boardId: true,
                            localTitle: true,
                            durationMin: true,
                            sport: true,
                            order: true,
                            boardData: true,
                        },
                        orderBy: { order: "asc" }
                    }
                },
                orderBy: { date: "asc" }
            });
        }),

    addEvent: protectedProcedure
        .input(z.object({
            title: z.string(),
            date: z.date(),
            time: z.string().optional(),
            endTime: z.string().optional(),
            type: z.string(),
            teamId: z.string().optional(),
            sport: z.string().optional(),
            clubId: z.string().optional(),
            sessionId: z.string().optional(),
            notes: z.string().optional(),
            drills: z.array(z.object({
                boardId: z.string().nullable().optional(),
                localTitle: z.string(),
                durationMin: z.number(),
                boardData: z.any(),
                sport: z.string().optional(),
                order: z.number(),
            })).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const now = new Date();
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            
            void ctx.db.calendarEvent.deleteMany({
                where: { userId: ctx.session.user.id, date: { lt: ninetyDaysAgo } }
            }).catch(e => console.error("Auto-cleanup failed:", e));

            const { drills, ...eventData } = input;
            
            const event = await ctx.db.calendarEvent.create({
                data: {
                    ...eventData,
                    userId: ctx.session.user.id,
                }
            });

            let drillsToCreate = drills || [];

            if (drillsToCreate.length === 0 && input.sessionId) {
                const session = await ctx.db.trainingSession.findUnique({
                    where: { id: input.sessionId },
                    include: { boards: true }
                });
                if (session) {
                    drillsToCreate = session.boards.map((b, i) => ({
                        boardId: b.id,
                        localTitle: b.title,
                        durationMin: 10,
                        boardData: b.data as any,
                        sport: b.sport,
                        order: i,
                    }));
                }
            }

            if (drillsToCreate.length > 0) {
                await ctx.db.eventDrill.createMany({
                    data: drillsToCreate.map(d => ({
                        eventId: event.id,
                        boardId: d.boardId,
                        localTitle: d.localTitle,
                        durationMin: d.durationMin,
                        boardData: d.boardData as any,
                        sport: d.sport || event.sport || "hockey",
                        order: d.order,
                    }))
                });
            }

            return event;
        }),

    updateEvent: protectedProcedure
        .input(z.object({
            id: z.string(),
            title: z.string().optional(),
            date: z.date().optional(),
            time: z.string().optional(),
            endTime: z.string().optional(),
            type: z.string().optional(),
            sport: z.string().optional(),
            notes: z.string().optional(),
            drills: z.array(z.object({
                id: z.string().optional(),
                boardId: z.string().nullable().optional(),
                localTitle: z.string(),
                durationMin: z.number(),
                boardData: z.any().optional(),
                sport: z.string().optional(),
                order: z.number(),
            })).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, drills, ...updates } = input;
            
            const event = await ctx.db.calendarEvent.findUnique({ where: { id } });
            if (!event || event.userId !== ctx.session.user.id) throw new Error("Unauthorized");

            if (drills) {
                const incomingIds = drills.filter(d => d.id).map(d => d.id!);
                
                await ctx.db.eventDrill.deleteMany({
                    where: {
                        eventId: id,
                        id: { notIn: incomingIds }
                    }
                });

                for (const d of drills) {
                    if (d.id) {
                        await ctx.db.eventDrill.update({
                            where: { id: d.id },
                            data: {
                                boardId: d.boardId,
                                localTitle: d.localTitle,
                                durationMin: d.durationMin,
                                boardData: d.boardData as any,
                                sport: d.sport || event.sport || "hockey",
                                order: d.order
                            }
                        });
                    } else {
                        await ctx.db.eventDrill.create({
                            data: {
                                eventId: id,
                                boardId: d.boardId,
                                localTitle: d.localTitle,
                                durationMin: d.durationMin,
                                boardData: d.boardData as any,
                                sport: d.sport || event.sport || "hockey",
                                order: d.order
                            }
                        });
                    }
                }
            }

            return ctx.db.calendarEvent.update({
                where: { id },
                data: updates
            });
        }),

    getRecentActivity: protectedProcedure
        .input(z.object({
            teamId: z.string().optional(),
            sport: z.string().optional(),
            clubId: z.string().optional(),
            limit: z.number().default(5),
        }))
        .query(async ({ ctx, input }) => {
            if (!input.teamId) return { sessions: [], drills: [] };

            const sessions = await ctx.db.calendarEvent.findMany({
                where: {
                    userId: ctx.session.user.id,
                    teamId: input.teamId,
                    type: "session",
                    ...(input.sport ? { sport: { equals: input.sport, mode: "insensitive" } } : {}),
                    ...(input.clubId ? { clubId: input.clubId } : {}),
                },
                include: {
                    drills: {
                        orderBy: { order: "asc" }
                    }
                },
                orderBy: { date: "desc" },
                take: input.limit,
            });

            const drills = sessions.flatMap((s: any) => s.drills.map((d: any) => ({
                ...d,
                eventTitle: s.title,
                eventDate: s.date,
            })));

            return {
                sessions,
            };
        }),

    getDashboardData: protectedProcedure
        .input(z.object({
            teamId: z.string().optional(),
            sport: z.string().optional(),
            clubId: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            if (!input.teamId) return { nextSession: null, pastSessions: [] };

            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const drillSelect = {
                id: true,
                eventId: true,
                boardId: true,
                localTitle: true,
                durationMin: true,
                sport: true,
                order: true,
                boardData: true,
            };

            const [nextSession, pastSessions] = await Promise.all([
                ctx.db.calendarEvent.findFirst({
                    where: {
                        userId: ctx.session.user.id,
                        teamId: input.teamId,
                        type: "session",
                        date: { gte: startOfToday },
                        ...(input.sport ? { sport: { equals: input.sport, mode: "insensitive" } } : {}),
                    },
                    include: {
                        drills: {
                            select: drillSelect,
                            orderBy: { order: "asc" }
                        }
                    },
                    orderBy: { date: "asc" },
                }),
                
                ctx.db.calendarEvent.findMany({
                    where: {
                        userId: ctx.session.user.id,
                        teamId: input.teamId,
                        type: "session",
                        date: { lt: startOfToday },
                        ...(input.sport ? { sport: { equals: input.sport, mode: "insensitive" } } : {}),
                    },
                    include: {
                        drills: {
                            select: drillSelect,
                            orderBy: { order: "asc" }
                        }
                    },
                    orderBy: { date: "desc" },
                    take: 5,
                })
            ]);

            return {
                nextSession,
                pastSessions,
            };
        }),

    removeEvent: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const event = await ctx.db.calendarEvent.findUnique({ where: { id: input.id } });
            if (!event || event.userId !== ctx.session.user.id) throw new Error("Unauthorized");

            return ctx.db.calendarEvent.delete({
                where: { id: input.id }
            });
        }),

    getEventDrillById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const drill = await ctx.db.eventDrill.findUnique({
                where: { id: input.id },
                include: { event: true }
            });
            
            if (!drill || drill.event.userId !== ctx.session.user.id) {
                throw new Error("Drill not found or unauthorized");
            }
            
            return {
                id: drill.id,
                title: drill.localTitle,
                data: drill.boardData,
                sport: drill.sport || drill.event.sport || "hockey",
                eventId: drill.eventId,
                eventTitle: drill.event.title
            };
        }),

    updateEventDrillData: protectedProcedure
        .input(z.object({
            id: z.string(),
            data: z.any()
        }))
        .mutation(async ({ ctx, input }) => {
            const drill = await ctx.db.eventDrill.findUnique({
                where: { id: input.id },
                include: { event: true }
            });
            
            if (!drill || drill.event.userId !== ctx.session.user.id) {
                throw new Error("Unauthorized");
            }

            return ctx.db.eventDrill.update({
                where: { id: input.id },
                data: { boardData: input.data }
            });
        }),
});
