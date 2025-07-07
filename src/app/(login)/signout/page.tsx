import LoginTemplate from "../signin/login-template";
import { InvalidFlow } from "~/app/_components/invalid-flow";
import { db } from "~/server/db";
import ActionButtons from "./action";
import { oauth2LogoutSession } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export default async function SignOut({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string }>;
}) {
  const sp = await searchParams;

  if (!sp.flow) {
    return <InvalidFlow />;
  }

  const flow = await db
    .delete(oauth2LogoutSession)
    .where(eq(oauth2LogoutSession.id, sp.flow))
    .returning();

  if (!flow[0]) {
    return <InvalidFlow />;
  }

  const client = await db.query.oauth2Client.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, flow[0]!.client_id);
    },
    columns: {
      name: true,
    },
  });

  return (
    <LoginTemplate
      title="Would you like to be signed out globally?"
      description={
        <>
          You are already being signed out from <b>{client?.name}</b>. Would you
          like to be signed out from all other apps?
        </>
      }
    >
      <div className="flex w-full flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
        <ActionButtons finalRedirect={flow[0].post_logout_redirect_uri} />
      </div>
    </LoginTemplate>
  );
}
