import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET() {
  const keys = await db.query.oauth2Keys.findMany({
    columns: {
      id: true,
      alg: true,
      public_key: true,
    },
  });
  return NextResponse.json({
    keys: keys.map((key) => ({
      alg: key.alg,
      kid: key.id,
      use: "sig",
      ...key.public_key
    })),
  })
}