import { randomUUID } from "crypto";
import { importJWK, SignJWT } from "jose";
import fetchUser from "~/app/(login)/consent/fetch-user";
import { db } from "~/server/db";

export async function signOutApp(
  session: { user_id: string; session_id: string },
  client?: {
    id: string;
    backchannelLogoutUri: string;
    jwtSigningAlgorithm: string;
    with_discord_direct: boolean;
    with_no_staff: boolean;
  },
) {
  if (client?.backchannelLogoutUri) {
    const [key, account] = await db.batch([
      db.query.oauth2Keys.findFirst({
        columns: {
          alg: true,
          private_key: true,
        },
        where(fields, operators) {
          return operators.eq(fields.alg, client.jwtSigningAlgorithm);
        },
      }),
      db.query.account.findFirst({
        columns: {
          providerId: true,
          accountId: true,
        },
        where(fields, operators) {
          return operators.eq(fields.userId, session.user_id);
        },
      }),
    ]);
    const jwtKey = await importJWK(key!.private_key, key?.alg);
    const yes = await fetchUser(
      account!.providerId === "microsoft"
        ? session.user_id
        : account!.accountId,
      account!.providerId,
      {
        discord_direct: client.with_discord_direct,
        no_staff: client.with_no_staff,
      },
    );

    if (typeof yes == "string") {
      return;
    }

    const newJwt = await new SignJWT({
      sid: session.session_id,
      events: {
        "http://schemas.openid.net/event/backchannel-logout": {},
      },
    })
      .setProtectedHeader({ alg: key!.alg })
      .setIssuedAt()
      .setAudience(client.id)
      .setSubject(yes.subject)
      .setJti(randomUUID())
      .setIssuer("https://accounts.bloxvalschools.com")
      .setExpirationTime("30s")
      .sign(jwtKey);

    const formData = new URLSearchParams();
    formData.append("logout_token", newJwt);

    await fetch(client.backchannelLogoutUri, {
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
  }
}
