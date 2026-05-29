import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import * as jose from "https://esm.sh/jose@5.9.6";
import { verifyAppleJWS } from "./verifyAppleJWS.ts";

/** Regression: sync `verify()` returns Promise<boolean>; `promise && promise` is always truthy. */
Deno.test("sync X509Certificate.verify pattern is always truthy", () => {
  const verify = () => Promise.resolve(false);
  const syncChainCheck = verify() && verify();
  assertEquals(syncChainCheck instanceof Promise, true);
  assertEquals(!!syncChainCheck, true);
});

Deno.test("verifyAppleJWS rejects JWS with attacker-controlled x5c", async () => {
  const { privateKey, publicKey } = await jose.generateKeyPair("ES256");
  const cert = await jose.exportSPKI(publicKey);
  const leafB64 = cert
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s/g, "");

  const jws = await new jose.SignJWT({ forged: true })
    .setProtectedHeader({ alg: "ES256", x5c: [leafB64, leafB64] })
    .sign(privateKey);

  assertEquals(await verifyAppleJWS(jws), null);
});
