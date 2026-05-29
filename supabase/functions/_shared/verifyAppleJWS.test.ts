import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import * as jose from "https://esm.sh/jose@5.9.6";
import { X509CertificateGenerator } from "https://esm.sh/@peculiar/x509@1.12.3";
import { verifyAppleJWS } from "./verifyAppleJWS.ts";

async function selfSignedCertB64(): Promise<string> {
  const alg = {
    name: "RSASSA-PKCS1-v1_5",
    hash: "SHA-256",
    publicExponent: new Uint8Array([1, 0, 1]),
    modulusLength: 2048,
  };
  const keys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]);
  const cert = await X509CertificateGenerator.createSelfSigned({
    serialNumber: "01",
    name: "CN=attacker-test",
    notBefore: new Date(0),
    notAfter: new Date("2099-01-01"),
    signingAlgorithm: alg,
    keys,
  });
  const der = new Uint8Array(cert.rawData);
  let binary = "";
  for (let i = 0; i < der.length; i++) binary += String.fromCharCode(der[i]);
  return btoa(binary);
}

/** Regression: sync `verify()` returns Promise<boolean>; `promise && promise` is always truthy. */
Deno.test("sync X509Certificate.verify pattern is always truthy", () => {
  const verify = () => Promise.resolve(false);
  const syncChainCheck = verify() && verify();
  assertEquals(syncChainCheck instanceof Promise, true);
  assertEquals(!!syncChainCheck, true);
});

Deno.test("verifyAppleJWS rejects JWS with attacker-controlled x5c", async () => {
  const { privateKey } = await jose.generateKeyPair("ES256");
  const leafB64 = await selfSignedCertB64();
  const interB64 = await selfSignedCertB64();

  const jws = await new jose.SignJWT({ forged: true })
    .setProtectedHeader({ alg: "ES256", x5c: [leafB64, interB64] })
    .sign(privateKey);

  assertEquals(await verifyAppleJWS(jws), null);
});
