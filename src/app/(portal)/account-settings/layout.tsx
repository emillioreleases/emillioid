import { headers } from "next/headers";
import { auth } from "~/server/auth";

export default async function AccountSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (session) {
    if (session.user.email.endsWith("@bloxvalschools.com")) {
      return (
        <div>
          You cannot access this page because you are a BCPS employee. Manage
          your account settings on EduNET
        </div>
      );
    }

    if (session.user.email.endsWith("@emillio.dev")) {
      return (
        <div>
          This page cannot be accessed because you are an ER employee. Manage
          your account settings on ERPortal
        </div>
      );
    }
    return (
      <>
        <div>Account Settings</div>
        {children}
      </>
    );
  } else {
    return <div>Not logged in</div>;
  }
}
