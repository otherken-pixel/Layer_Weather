import * as jose from "https://esm.sh/jose@5.9.6";
import { X509Certificate } from "https://esm.sh/@peculiar/x509@1.12.3";

// Apple Root CA - G3 (https://www.apple.com/certificateauthority/AppleRootCA-G3.cer)
const APPLE_ROOT_CA_G3_DER = Uint8Array.from(
  atob(
    "MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==",
  ),
  (c) => c.charCodeAt(0),
);

function certDerFromX5c(entry: string): Uint8Array {
  const binary = atob(entry);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function derEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function verifyX5cChain(x5c: string[]): boolean {
  if (x5c.length < 2) return false;

  const certs = x5c.map((entry) => new X509Certificate(certDerFromX5c(entry)));
  const appleRoot = new X509Certificate(APPLE_ROOT_CA_G3_DER);

  const chainRootDer = certs[certs.length - 1].rawData;
  if (derEquals(chainRootDer, APPLE_ROOT_CA_G3_DER)) {
    if (certs.length < 3) return false;
    return certs[0].verify(certs[1]) && certs[1].verify(appleRoot);
  }

  if (certs.length !== 2) return false;
  return certs[0].verify(certs[1]) && certs[1].verify(appleRoot);
}

/** Verifies Apple's ES256 JWS (x5c chain + signature) and returns the parsed payload. */
export async function verifyAppleJWS<T>(jws: string): Promise<T | null> {
  try {
    const parts = jws.split(".");
    if (parts.length !== 3) return null;

    const header = jose.decodeProtectedHeader(jws);
    if (header.alg !== "ES256") return null;

    const x5c = header.x5c;
    if (!x5c?.length || !verifyX5cChain(x5c)) return null;

    const leafPem = `-----BEGIN CERTIFICATE-----\n${x5c[0]}\n-----END CERTIFICATE-----`;
    const key = await jose.importX509(leafPem, "ES256");
    const { payload } = await jose.compactVerify(jws, key);
    return JSON.parse(new TextDecoder().decode(payload)) as T;
  } catch {
    return null;
  }
}
