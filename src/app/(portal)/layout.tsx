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

  const getEmailDomain = (email: string | null | undefined): string | null => {
    if (!email) return null;
    const atIndex = email.lastIndexOf("@");
    if (atIndex === -1 || atIndex === email.length - 1) {
      return null;
    }
    return email.slice(atIndex + 1).toLowerCase();
  };

  const emailDomain = getEmailDomain(session?.user.email);

  if (
    emailDomain !== "bloxvalschools.com" &&
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
