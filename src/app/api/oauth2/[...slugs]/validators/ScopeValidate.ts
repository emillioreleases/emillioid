// src/validators/tagValidator.ts
import { ValidationError } from "elysia";
import { OAuthScopes, type OAuthScopesValue } from "../Enums";
import { OAuthError } from "../OAuthError";
/**
 * Turn "?tags=foo+bar baz" → ["foo","bar","baz"]
 */
function splitTagString(raw: string | undefined): string[] {
  if (!raw) return [];
  // `+` is a literal plus, also a URL‑encoded space.
  // The regex matches either a space or a plus.
  return raw.split(/[ +]/).filter(Boolean);
}
/**
 * Validate that every token is a member of the `Tag` enum.
 * Returns a typed array (`TagValue[]`) or throws `ValidationError`.
 */
export function validateTagQuery(raw: string | undefined): OAuthScopesValue[] {
  const tokens = splitTagString(raw);
  // Fast‑path – empty query is allowed (you can change this if you need at least one tag)
  if (tokens.length === 0) return [];
  // Collect any token that is NOT in the enum
  const invalid = tokens.filter(
    (t) => !(Object.values(OAuthScopes) as string[]).includes(t),
  );
  if (invalid.length > 0) {
    // Elysia’s built‑in error class – the router will format it for you.
    throw new OAuthError(
      "invalid_scope",
      `Invalid scope(s): ${invalid.join(", ")}`,
      "",
    );
  }
  // At this point TS knows each token is a valid enum value.
  return tokens as OAuthScopesValue[];
}
