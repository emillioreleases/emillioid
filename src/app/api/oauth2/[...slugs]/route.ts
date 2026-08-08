import { Elysia, t } from "elysia";
import { OAuthError } from "./errors/OAuthError";
import { OAuthPromptTypes, OAuthResponseTypes, OAuthScopes } from "./Enums";
import { db } from "~/server/db";
import { approveOAuthRequest, clientValidity, generateIDToken, generateToken, getTokenData } from "./helpers";
import { flowPopup, oauth2LoginSession } from "~/server/db/schema";
import { env } from "~/env";
import { compactDecrypt, jwtVerify, SignJWT } from "jose";
import type { FlowAttestationPayload } from "~/utils/types";
import { CalculateNextStage } from "~/utils/calculate-next-stage";
import { eq } from "drizzle-orm";

const encryptSecret = new TextEncoder().encode(env.OAUTH2_TOKEN_ENCRYPT_KEY);

const app = new Elysia({ prefix: "/api/oauth2" })
  .error({ OAuthError })
  .onError(({ code, error, query }) => {
    if (code == "OAuthError") {
      return error;
    }
    if (code == "VALIDATION") {
      return new OAuthError("invalid_request", "", query.state!);
    }
    if (code == "INTERNAL_SERVER_ERROR") {
      return new OAuthError("server_error", "", query.state!);
    }
  })
  .get("/userinfo", async ({ headers }) => {
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new OAuthError("invalid_request", "Missing or invalid token");
    }

    const accessToken = authHeader.substring(7);
    const tokenData = await getTokenData(accessToken);

    if (!tokenData || tokenData.type !== "at" || Date.now() > parseInt(tokenData.exp) || Date.now() < parseInt(tokenData.iat)) {
      throw new OAuthError("invalid_token", "Invalid access token");
    }

    const session = await db.query.oauth2LoginSession.findFirst({
      columns: {
        id: true
      },
      where(fields, operators) {
        return operators.eq(fields.id, tokenData.session_id);
      },
      with: {
        socialUser: true,
      },
    });

    if (!session) {
      throw new OAuthError("invalid_token", "Invalid access token");
    }

    return Response.json({
      sub: session.socialUser.accountType + "|" + session.socialUser.accountId,
      name: `${session.socialUser.display_name} (@${session.socialUser.username})`,
      nickname: session.socialUser.display_name,
      preferred_username: session.socialUser.username,
      picture: session.socialUser.image,
      email: `${session.socialUser.accountId}@${session.socialUser.accountType}.accounts.emillio.dev`,
      email_verified: true,
    });
  }, {
    headers: t.Object({
      authorization: t.String(),
    }),
  })
  .get("/jwks", async () => {
    const keys = await db.query.oauth2Keys.findMany({
      columns: {
        id: true,
        alg: true,
        public_key: true,
      },
    });
    return Response.json({
      keys: keys.map((key) => ({
        alg: key.alg,
        kid: key.id,
        use: "sig",
        ...key.public_key,
      })),
    });
  })
  .get(
    "/authorize",
    async ({
      query,
      redirect,
      request,
      cookie: {
        "emillioid.flow-attestation": flowAttestationCookie,
        "emillioid.session": sessionCookie,
      },
    }) => {
      const [authSession, additionalClientInfo] = await Promise.all([
        sessionCookie.value
          ? db.query.session.findFirst({
            where(fields, operators) {
              return operators.eq(fields.token, sessionCookie.value!);
            },
          })
          : null,
        clientValidity(query),
      ]);

      if (sessionCookie.value && authSession) {
        if (flowAttestationCookie.value) {
          const verifyToken = await jwtVerify<FlowAttestationPayload>(
            flowAttestationCookie.value,
            new TextEncoder().encode(env.BETTER_AUTH_SECRET),
            {
              issuer: env.BETTER_AUTH_URL,
            }
          ).catch(() => null);

          if (verifyToken) {
            const flow = await db.query.flowPopup.findFirst({
              where(fields, operators) {
                return operators.eq(fields.id, verifyToken.payload.flow);
              },
            });

            if (flow) {
              if (
                flow.returnUrl ==
                new URL(request.url).pathname + new URL(request.url).search &&
                flow.session_id == authSession.id
              ) {
                if (flow.status == "complete") {
                  const result = await approveOAuthRequest(
                    query,
                    additionalClientInfo,
                    flow,
                    authSession,
                  );
                  await db.delete(flowPopup)
                    .where(eq(flowPopup.id, flow.id));
                  return redirect(result);
                } else {
                  return redirect(`${env.BETTER_AUTH_URL}/signin?flow=${flow.id}`);
                }
              }
            }
          }
        }
      }
      let hasConsent = false;
      if (authSession) {
        const consent = await db.query.oauth2Consent.findFirst({
          columns: {
            id: true
          },
          where(fields, operators) {
            return operators.and(
              operators.eq(fields.client_id, query.client_id),
              operators.eq(fields.user_id, authSession.userId),
            );
          },
        });
        if (consent) {
          hasConsent = true;
        }
      }

      const flowSetup: typeof flowPopup.$inferSelect = {
        id: crypto.randomUUID(),
        client_id: query.client_id,
        returnUrl: new URL(request.url).pathname + new URL(request.url).search,
        provided_consent: hasConsent
          ? hasConsent
          : !additionalClientInfo.consentNeeded,
        saml_request: null,
        selected_account: null,
        session_id: authSession ? authSession.id : null,
        status: "forced_login"
      };

      authSession ? flowSetup.status = await CalculateNextStage(flowSetup, additionalClientInfo) : null;

      switch (query.prompt) {
        case OAuthPromptTypes.None:
          throw new OAuthError(
            "login_required",
            "User is not authenticated or has not consented",
            query.state,
          );
        case OAuthPromptTypes.Consent:
          if (flowSetup.status !== "link_account") {
            flowSetup.provided_consent = false;
            flowSetup.status = "consent_needed";
          }
        case OAuthPromptTypes.SelectAccount:
          flowSetup.status = "select_account";
        case OAuthPromptTypes.Login || !authSession:
          flowSetup.status = "forced_login";
      }

      await db.insert(flowPopup).values(flowSetup).returning();

      flowAttestationCookie.set({
        secure: process.env.NODE_ENV === "production",
        value: await new SignJWT({ flow: flowSetup.id })
          .setProtectedHeader({ alg: "HS512" })
          .setIssuer(env.BETTER_AUTH_URL)
          .setIssuedAt()
          .setExpirationTime("30m")
          .sign(new TextEncoder().encode(env.BETTER_AUTH_SECRET)),
        httpOnly: true,
        path: '/',
        maxAge: 30 * 60,
      });
      return redirect(`${env.BETTER_AUTH_URL}/signin?flow=${flowSetup.id}`);
    },
    {
      transform({ query }) {
        // `+` is the URL‑encoded space, but browsers may also send a real space.
        // Replace `+` with a space, split on whitespace, filter empties.
        const raw = (query.scope as unknown as string).replace(/\+/g, " ");
        const parts = raw
          .trim()
          .split(/\s+/) // split on one‑or‑more spaces
          .filter(Boolean); // drop empty strings
        // Validate each part against the enum.
        // If any part is invalid, we can abort with a 400.
        for (const p of parts) {
          if (!Object.values(OAuthScopes).includes(p as any)) {
            // `status(400)` ends the request early.
            throw new OAuthError(
              "invalid_scope",
              `Invalid scope: ${p}`,
              query.state,
            );
          }
        }

        const responseTypeRaw = (
          query.response_type as unknown as string
        ).replace(/\+/g, " ");
        const responseTypeParts = responseTypeRaw
          .trim()
          .split(/\s+/) // split on one‑or‑more spaces
          .filter(Boolean); // drop empty strings
        // Validate each part against the enum.
        // If any part is invalid, we can abort with a 400.
        for (const p of responseTypeParts) {
          if (!Object.values(OAuthResponseTypes).includes(p as any)) {
            // `status(400)` ends the request early.
            throw new OAuthError(
              "invalid_request",
              `Invalid response_type: ${p}`,
              query.state,
            );
          }
        }
        // Replace the original string with the array for the validator.
        query.scope = parts as unknown as OAuthScopes[];
        query.response_type =
          responseTypeParts as unknown as OAuthResponseTypes[];
      },
      query: t.Object({
        scope: t.Array(t.Enum(OAuthScopes)),
        response_type: t.Array(t.Enum(OAuthResponseTypes)),
        client_id: t.String(),
        redirect_uri: t.String(),
        state: t.String(),
        nonce: t.Optional(t.String()),
        prompt: t.Optional(t.Enum(OAuthPromptTypes)),
        max_age: t.Optional(t.Number()),
      }),
      cookie: t.Object({
        "emillioid.session": t.Optional(t.String()),
        "emillioid.flow-attestation": t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/token",
    async ({ body }) => {
      console.log(body)
      const client = await db.query.oauth2Client.findFirst({
        columns: {
          id: true,
          clientSecret: true,
          jwtSigningAlgorithm: true,
        },
        where(fields, operators) {
          return operators.and(
            operators.eq(fields.id, body.client_id?.toString()!),
            operators.eq(
              fields.clientSecret,
              body.client_secret?.toString()!,
            ),
          );
        },
      });

      if (!client) {
        throw new OAuthError("invalid_grant", "Invalid client credentials.");
      }

      switch (body.grant_type) {
        case "authorization_code":
          const tokenData = await getTokenData(body.code?.toString()!);
          console.log(tokenData)
          if (!tokenData || tokenData.type !== "ac" || Date.now() > parseInt(tokenData.exp) || Date.now() < parseInt(tokenData.iat)) {
            throw new OAuthError("invalid_grant", "Invalid authorization code.");
          }
          const [oauth2SessionData] = await db.batch([
            db.query.oauth2LoginSession.findFirst({
              where(fields, operators) {
                return operators.and(
                  operators.eq(fields.has_authorization_code_been_used, false),
                  operators.eq(fields.id, tokenData.session_id),
                  operators.eq(fields.client_id, client.id)
                );
              },
              with: {
                socialUser: true,
              },
            }),
          ]);

          if (!client) {
            throw new OAuthError("invalid_client", "Client not found.");
          }

          if (client.clientSecret !== body.client_secret?.toString()) {
            throw new OAuthError(
              "invalid_client",
              "Invalid client credentials.",
            );
          }

          if (!oauth2SessionData) {
            throw new OAuthError("invalid_grant", "Invalid authorization code.");
          }

          const sessionData = await db.query.session.findFirst({
            where(fields, operators) {
              return operators.eq(fields.id, oauth2SessionData?.session_id!);
            },
          });

          if (!sessionData) {
            throw new Error("Something went wrong fetching parent session.");
          }

          const rtid = crypto.randomUUID();
          const [at, rt, idt] = await Promise.all([
            generateToken(
              crypto.randomUUID(),
              tokenData.session_id,
              "at"
            ),
            generateToken(
              rtid,
              tokenData.session_id,
              "rt"
            ),
            generateIDToken(
              { id: oauth2SessionData.client_id, jwtSigningAlgorithm: client.jwtSigningAlgorithm },
              oauth2SessionData.socialUser,
              sessionData,
            ),
          ]);

          const responseFinal = {
            access_token: at,
            token_type: "Bearer",
            expires_in: 300,
            refresh_token: rt,
            id_token: idt,
          };

          await db.update(oauth2LoginSession).set({
            has_authorization_code_been_used: true,
            active_rtoken: rtid
          }).where(eq(oauth2LoginSession.id, oauth2SessionData.id));

          return Response.json(responseFinal);
        case "refresh_token":
          const tokenData2 = await getTokenData(body.refresh_token?.toString()!);
          if (!tokenData2 || tokenData2.type !== "rt" || Date.now() > parseInt(tokenData2.exp) || Date.now() < parseInt(tokenData2.iat)) {
            throw new OAuthError("invalid_grant", "Invalid/expired refresh token.");
          }
          const oauth2Session = await db.query.oauth2LoginSession.findFirst({
            where(fields, operators) {
              return operators.and(
                operators.eq(fields.client_id, client.id),
                operators.eq(
                  fields.active_rtoken,
                  tokenData2.token_id,
                ),
              );
            },
            columns: {
              id: true,
              client_id: true,
              session_id: true,
            },
            with: {
              socialUser: true,
              session: true,
            }
          });

          if (!oauth2Session) {
            throw new OAuthError("invalid_grant", "Refresh token is expired.");
          }

          const rtid2 = crypto.randomUUID();

          const [at2, rt2, idt2] = await Promise.all([
            generateToken(
              crypto.randomUUID(),
              oauth2Session.session_id,
              "at"
            ),
            generateToken(
              rtid2,
              oauth2Session.session_id,
              "rt",
              parseInt(tokenData2.exp)
            ),
            generateIDToken(
              { id: oauth2Session.client_id, jwtSigningAlgorithm: client.jwtSigningAlgorithm },
              oauth2Session.socialUser,
              oauth2Session.session,
            ),
          ]);

          const response = {
            access_token: at2,
            token_type: "Bearer",
            expires_in: 300,
            refresh_token: rt2,
            id_token: idt2,
          };

          await db.update(oauth2LoginSession).set({
            active_rtoken: rt2
          }).where(eq(oauth2LoginSession.id, oauth2Session.id));

          return Response.json(response);
        default:
          throw new OAuthError(
            "unsupported_grant_type",
            "Grant type is not supported.",
          );
      }
    },
    {
      body: t.Union([
        t.Object({
          grant_type: t.Literal("refresh_token"),
          client_id: t.String(),
          client_secret: t.String(),
          refresh_token: t.String(),
        }),
        t.Object({
          grant_type: t.Literal("authorization_code"),
          code: t.String(),
          client_id: t.String(),
          client_secret: t.String(),
        }),
      ]),
      parse: "application/x-www-form-urlencoded"
    },
  );

export const GET = app.fetch;
export const POST = app.fetch;
export type OAuth2API = typeof app;
