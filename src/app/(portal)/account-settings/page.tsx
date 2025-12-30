import { headers } from "next/headers";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import fetchUser from "~/app/(login)/consent/fetch-user";
import { auth } from "~/server/auth";

export default async function AccountSettings() {
  const user = await auth.api.getSession({
    headers: await headers(),
  });
  const [discordUser, robloxUser] = await Promise.all([
    fetchUser(user!.user.id, { discord_direct: true }),
    fetchUser(user!.user.connectedRobloxAccount || "", {
      discord_direct: false,
    }),
  ]);

  return (
    <>
      <div className="flex w-full flex-col gap-4 md:flex-row">
        <div className="w-full border-b border-b-gray-500 pb-4 md:border-r md:border-b-0 md:border-r-gray-500 md:pb-0">
          <h6>Roblox</h6>
          {typeof robloxUser == "string" ? (
            <>
              <h1 className="text-4xl font-bold">ACCOUNT NOT LINKED</h1>
              <Button>Link account</Button>
            </>
          ) : (
            <>
              <div className="flex flex-row items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={robloxUser.picture ?? ""}
                    alt={`${robloxUser.name}'s avatar`}
                  />
                  <AvatarFallback>
                    {robloxUser.name
                      .split(" ")
                      .map((s) => s.charAt(0))
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold">
                    {robloxUser.name.split(" ")[0]}
                  </h1>
                  <h2 className="text-lg font-light">
                    {robloxUser.name
                      .split(" ")[1]
                      ?.substring(1, robloxUser.name.split(" ")[1]!.length - 1)}
                  </h2>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="w-full">
          <h6>Discord</h6>
          {typeof discordUser == "string" ? (
            <>
              <h1 className="text-4xl font-bold">ACCOUNT NOT LINKED</h1>
              <Button>Link account</Button>
            </>
          ) : (
            <>
              <div className="flex flex-row items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={discordUser.picture ?? ""}
                    alt={`${discordUser.name}'s avatar`}
                  />
                  <AvatarFallback>
                    {discordUser.name
                      .split(" ")
                      .map((s) => s.charAt(0))
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold">
                    {discordUser.name.split(" ")[0]}
                  </h1>
                  <h2 className="text-lg font-light">
                    {discordUser.name
                      .split(" ")[1]
                      ?.substring(
                        1,
                        discordUser.name.split(" ")[1]!.length - 1,
                      )}
                  </h2>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
