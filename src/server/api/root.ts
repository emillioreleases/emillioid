import { postRouter } from "~/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { accountManagementRouter } from "~/server/api/routers/accountManagement";
import { infoRouter } from "~/server/api/routers/info";
import { consentRouter } from "~/server/api/routers/consent";
import { loginRouter } from "~/server/api/routers/login";
import { oauth2Router } from "~/server/api/routers/oauth2";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  info: infoRouter,
  accountManagement: accountManagementRouter,
  consent: consentRouter,
  login: loginRouter,
  oauth2: oauth2Router
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
