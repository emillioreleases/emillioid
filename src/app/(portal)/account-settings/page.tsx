import { headers } from "next/headers";
import { auth } from "~/server/auth";

export default async function AccountSettings() {
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
    return <div>Account Settings</div>;
  } else {
    return <div>Not logged in</div>;
  }
}
