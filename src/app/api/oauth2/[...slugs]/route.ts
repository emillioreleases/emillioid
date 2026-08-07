import { Elysia, t } from "elysia";
import { OAuthError } from "./errors/OAuthError";
import { OAuthPromptTypes, OAuthResponseTypes, OAuthScopes } from "./Enums";
import { db } from "~/server/db";
import { approveOAuthRequest, clientValidity, generateToken } from "./helpers";
import { flowPopup, oauth2LoginSession } from "~/server/db/schema";
import { env } from "~/env";
import { SignJWT } from "jose";

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
        "emillioid.flow": flowCookie,
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
        if (flowCookie.value) {
          const flow = await db.query.flowPopup.findFirst({
            where(fields, operators) {
              return operators.eq(fields.id, flowCookie.value!);
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
                return redirect(result);
              } else {
                return redirect(`${env.BETTER_AUTH_URL}/signin?flow=${flow.id}`);
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

      const flowSetup: typeof flowPopup.$inferInsert = {
        id: crypto.randomUUID(),
        client_id: query.client_id,
        returnUrl: new URL(request.url).pathname + new URL(request.url).search,
        provided_consent: hasConsent
          ? hasConsent
          : !additionalClientInfo.consentNeeded,
        status: "forced_login"
      };

      switch (query.prompt) {
        case OAuthPromptTypes.None:
          throw new OAuthError(
            "login_required",
            "User is not authenticated or has not consented",
            query.state,
          );
        case OAuthPromptTypes.Consent:
          flowSetup.provided_consent = false;
          flowSetup.status = "consent_needed";
        case OAuthPromptTypes.SelectAccount:
          flowSetup.status = "select_account";
        case OAuthPromptTypes.Login || !authSession:
          flowSetup.status = "forced_login";
      }

      await db.insert(flowPopup).values(flowSetup).returning();

      flowCookie.set({
        secure: process.env.NODE_ENV === "production",
        value: flowSetup.id,
        httpOnly: true,
        path: '/',
        maxAge: 30 * 60,
      });

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
        "emillioid.flow": t.Optional(t.String()),
        "emillioid.flow-attestation": t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/token",
    async ({ body }) => {
      const client = await db.query.oauth2Client.findFirst({
        columns: {
          id: true,
        },
        where(fields, operators) {
          return operators.and(
            operators.eq(fields.id, body.get("client_id")?.toString()!),
            operators.eq(
              fields.clientSecret,
              body.get("client_secret")?.toString()!,
            ),
          );
        },
      });

      if (!client) {
        throw new OAuthError("invalid_grant", "Invalid client credentials.");
      }

      switch (body.get("grant_type")) {
        case "refresh_token":
          const oauth2Session = await db.query.oauth2LoginSession.findFirst({
            where(fields, operators) {
              return operators.and(
                operators.eq(fields.client_id, client.id),
                operators.eq(
                  fields.refresh_token,
                  body.get("refresh_token")?.toString()!,
                ),
                operators.gt(
                  fields.updated_at,
                  new Date(Date.now() - 5400 * 1000),
                ),
              );
            },
          });

          if (!oauth2Session) {
            throw new OAuthError("invalid_grant", "Refresh token is expired.");
          }

          const session = await db.query.session.findFirst({
            where(fields, operators) {
              return operators.eq(fields.id, oauth2Session?.session_id!);
            },
          });

          if (!session) {
            throw new Error("Something went wrong fetching parent session.");
          }

          const response = {
            access_token: await generateToken(
              { client_id: oauth2Session.client_id },
              session,
              "at",
            ),
            token_type: "Bearer",
            expires_in: 3600,
            refresh_token: await generateToken(
              { client_id: oauth2Session.client_id },
              session,
              "rt",
            ),
          };

          await db.update(oauth2LoginSession).set({
            access_token: response.access_token,
            refresh_token: response.refresh_token,
          });
          return Response.json(response);
      }
    },
    {
      body: t.Union([
        t.Form({
          grant_type: t.Literal("refresh_token"),
          client_id: t.String(),
          client_secret: t.String(),
          refresh_token: t.String(),
        }),
        t.Form({
          grant_type: t.Literal("authorization_code"),
          code: t.String(),
          client_id: t.String(),
          client_secret: t.String(),
        }),
      ]),
    },
  );

export const GET = app.fetch;
export const POST = app.fetch;
export type OAuth2API = typeof app;
