import { exportJWK, generateKeyPair, generateSecret } from "jose";
import { db } from "~/server/db";
import { oauth2Keys } from "~/server/db/schema";


void generateKeyPair("RS512", {
  extractable: true,
}).then(async (res) => {
  const yes = {
    id: crypto.randomUUID(),
    alg: "RS512",
    public_key: await exportJWK(res.publicKey),
    private_key: await exportJWK(res.privateKey),
  }
  console.log(await db.insert(oauth2Keys).values(yes).returning());
});

