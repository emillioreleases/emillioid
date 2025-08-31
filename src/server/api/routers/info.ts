import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const infoRouter = createTRPCRouter({
  details: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.session.user.email.endsWith("bloxvalschools.com")) {
      return {
        name: ctx.session.user.name,
        image: ctx.session.user.image,
        email: ctx.session.user.email,
      }
    } else {
      if (ctx.session.user.connectedRobloxAccount) {
        const [userFetch, avatarFetch] = await Promise.all([
          fetch(`https://users.roblox.com/v1/users/${ctx.session.user.connectedRobloxAccount}`),
          fetch(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ctx.session.user.connectedRobloxAccount}&format=Png&size=720x720`,
          ),
        ]);
        const [userData, avatar] = (await Promise.all([
          userFetch.json(),
          avatarFetch.json(),
        ])) as [
          { displayName: string; name: string; id: string; profileUrl: string },
          {
            data: {
              imageUrl: string;
            }[];
          },
        ];
        return {
          name: `${userData.displayName} (@${userData.name})`,
          image: avatar.data[0]!.imageUrl,
          email: `${userData.id}@accounts.emillio.dev`,
        }
      } else {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
    }
  }),
});
