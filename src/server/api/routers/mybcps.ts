import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const mybcpsRouter = createTRPCRouter({
  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});