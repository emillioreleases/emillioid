import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import UserProfile from "~/app/_components/user-profile";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/signin");
  }

  if (
    !session?.user.email.endsWith("bloxvalschools.com") &&
    !session?.user.connectedRobloxAccount
  ) {
    redirect("/signin");
  }

  return (
    <div className="flex h-full w-full flex-col items-start justify-start bg-black">
      <div className="flex w-full items-center justify-between p-4">
        <Image
          src={"/logo.png"}
          alt={"Logo"}
          width={150}
          height={67.5}
          className="h-[50px] object-cover"
        />
        <div>Portal</div>
        <div>
          <UserProfile />
        </div>
      </div>
      <div className="w-full p-4">{children}</div>
    </div>
  );
}
