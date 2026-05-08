import { Elysia, t } from "elysia";
import { OAuthError } from "./OAuthError";
import { OAuthPromptTypes, OAuthResponseTypes, OAuthScopes } from "./Enums";
import { db } from "~/server/db";
import { redirect } from "next/navigation";

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
  .get(P
    "/authorize",
    async ({ query }) => {
      const client = await db.query.oauth2Client.findFirst({
        columns: {
          id: true,
          redirectUris: true,
        },
        where(fields, operators) {
          return operators.eq(fields.id, query.client_id);
        },
      });
      if (!client) {
        throw new OAuthError("invalid_client", "Client not found", query.state);
      }
      if (!client.redirectUris.includes(query.redirect_uri)) {
        throw new OAuthError(
          "invalid_request",
          "Invalid redirect_uri",
          query.state,
        );
      }
      redirect(`/login?flow=${query.state}`);
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
        // Replace the original string with the array for the validator.
        query.scope = parts as unknown as OAuthScopes[];
      },
      query: t.Object({
        scope: t.Array(t.Enum(OAuthScopes)),
        response_type: t.Enum(OAuthResponseTypes),
        client_id: t.String(),
        redirect_uri: t.String(),
        state: t.String(),
        nonce: t.Optional(t.String()),
        prompt: t.Optional(t.Enum(OAuthPromptTypes)),
        max_age: t.Optional(t.Number()),
      }),
    },
  );

export const GET = app.fetch;
export const POST = app.fetch;
