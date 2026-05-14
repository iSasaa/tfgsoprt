
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
import { userRouter } from "~/server/api/routers/user";
import { boardRouter } from "~/server/api/routers/board";

import { clubRouter } from "~/server/api/routers/club";
import { sessionRouter } from "~/server/api/routers/session";
import { calendarRouter } from "~/server/api/routers/calendar";
import { folderRouter } from "~/server/api/routers/folder";
import { playerRouter } from "~/server/api/routers/player";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  board: boardRouter,
  club: clubRouter,
  session: sessionRouter,
  calendar: calendarRouter,
  folder: folderRouter,
  player: playerRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
