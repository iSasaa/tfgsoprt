import { z } from "zod";
import { hash } from "bcryptjs";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
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
});
