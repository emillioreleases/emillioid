import z from "zod";

export const jwtZ = z.object({
  iat: z.number(),
  aud: z.string(),
  exp: z.number(),
  tt: z.string(),
  tid: z.string(),
  sid: z.string(),
  sid2: z.string(),
  ruri: z.string().optional(),
  scope: z.string().optional(),
});