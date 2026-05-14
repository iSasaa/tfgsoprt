import { z } from "zod";
import { hash, compare } from "bcryptjs";

import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const userRouter = createTRPCRouter({
    register: publicProcedure
        .input(z.object({
            name: z.string().min(1),
            email: z.string().email(),
            password: z.string().min(6),
        }))
        .mutation(async ({ input }) => {
            const exists = await db.user.findUnique({
                where: { email: input.email },
            });

            if (exists) {
                throw new Error("User already exists");
            }

            const hashedPassword = await hash(input.password, 10);

            const user = await db.user.create({
                data: {
                    name: input.name,
                    email: input.email,
                    password: hashedPassword,
                },
            });

            return { success: true, userId: user.id };
        }),

    updateProfile: protectedProcedure
        .input(z.object({
            name: z.string().min(1).optional(),
            email: z.string().email().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            console.log("Updating profile for user:", ctx.session.user.id, "with data:", input);
            const result = await ctx.db.user.update({
                where: { id: ctx.session.user.id },
                data: input,
            });
            console.log("Update result:", result);
            return result;
        }),

    updatePassword: protectedProcedure
        .input(z.object({
            oldPassword: z.string(),
            newPassword: z.string().min(6),
        }))
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.db.user.findUnique({
                where: { id: ctx.session.user.id },
            });

            if (!user?.password) throw new Error("User has no password set");

            const isValid = await compare(input.oldPassword, user.password);
            if (!isValid) throw new Error("Incorrect old password");

            const hashedPassword = await hash(input.newPassword, 10);
            return ctx.db.user.update({
                where: { id: ctx.session.user.id },
                data: { password: hashedPassword },
            });
        }),

    deleteAccount: protectedProcedure
        .mutation(async ({ ctx }) => {
            return ctx.db.user.delete({
                where: { id: ctx.session.user.id },
            });
        }),
});
