// Sign-in plumbing: the encrypted cookie session, the return-target check, and access token verification.
// Hand-rolled authorization code + PKCE on jose (see the PR that added it for why not @auth0/nextjs-auth0).
// The tenant hostname only ever comes from env.AUTH0_DOMAIN.
import { createHash, randomBytes } from "node:crypto";
import { EncryptJWT, jwtDecrypt, jwtVerify, createRemoteJWKSet, type JWTPayload } from "jose";
import { env } from "./env";

export const SESSION_COOKIE = "me_session";
export const TX_COOKIE = "me_auth_tx";
export const SESSION_DAYS = 30;
const TX_MINUTES = 10;

export const issuer = () => `https://${env.AUTH0_DOMAIN}/`;
export const tenant = (path: string) => `https://${env.AUTH0_DOMAIN}${path}`;

// The site's own origin, for redirect_uri, the logout Origin check and returnTo.
// The proxy has already redirected every host but marketingengineering.dev, localhost and *.run.app.
// Read from the Host header: the standalone server's request.url carries its bind address.
export function siteOrigin(request: Request): string {
  const host = request.headers.get("host") ?? new URL(request.url).host;
  return /^localhost(:\d+)?$/.test(host) ? `http://${host}` : `https://${host}`;
}
export const isLocal = (request: Request) => siteOrigin(request).startsWith("http://");

// Where to land after sign-in. Relative, on this site, and only the two pages: "/", "/v", plus their query or hash.
// Everything else ("//evil", "https://...", "/\evil", control characters, other paths) falls back to "/".
export function safeReturnTo(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > 2000) return "/";
  for (const ch of raw) if (ch < " " || (ch >= "\u007f" && ch <= "\u009f") || ch === "\\") return "/";
  return /^\/(v)?([?#].*)?$/s.test(raw) ? raw : "/";
}

const b64url = (b: Buffer) => b.toString("base64url");
export const random = () => b64url(randomBytes(32));
export const pkceChallenge = (verifier: string) => b64url(createHash("sha256").update(verifier).digest());

// dir + A256GCM: the cookie is encrypted and authenticated with a key derived from AUTH_SESSION_SECRET.
const key = () => createHash("sha256").update(`me-session-v1:${env.AUTH_SESSION_SECRET}`).digest();

async function seal(kind: string, claims: Record<string, unknown>, seconds: number): Promise<string> {
  return new EncryptJWT({ ...claims, k: kind })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + seconds)
    .encrypt(key());
}
async function unseal(kind: string, token: string | undefined): Promise<JWTPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, key(), { keyManagementAlgorithms: ["dir"], contentEncryptionAlgorithms: ["A256GCM"] });
    return payload.k === kind ? payload : null;
  } catch {
    return null;
  }
}

export type Session = { sub: string; email: string | null };
export type Tx = { state: string; verifier: string; nonce: string; ret: string };

export const sealSession = (s: Session) => seal("s", s, SESSION_DAYS * 86400);
export async function readSession(request: Request): Promise<Session | null> {
  const p = await unseal("s", cookie(request, SESSION_COOKIE));
  return p && typeof p.sub === "string" ? { sub: p.sub, email: typeof p.email === "string" ? p.email : null } : null;
}
export const sealTx = (t: Tx) => seal("t", t, TX_MINUTES * 60);
export async function readTx(request: Request): Promise<Tx | null> {
  const p = await unseal("t", cookie(request, TX_COOKIE));
  if (!p || typeof p.state !== "string" || typeof p.verifier !== "string" || typeof p.nonce !== "string") return null;
  return { state: p.state, verifier: p.verifier, nonce: p.nonce, ret: safeReturnTo(p.ret) };
}

export function cookie(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

// HttpOnly, SameSite=Lax (the callback is a top-level GET from the tenant), Secure except on http://localhost.
export function setCookie(request: Request, name: string, value: string, maxAge: number, path = "/"): string {
  return `${name}=${value}; Path=${path}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${isLocal(request) ? "" : "; Secure"}`;
}

// One JWKS per tenant. jose caches the keys and refetches on an unknown kid.
const jwksByDomain = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
const jwks = () => {
  let set = jwksByDomain.get(env.AUTH0_DOMAIN);
  if (!set) jwksByDomain.set(env.AUTH0_DOMAIN, (set = createRemoteJWKSet(new URL(tenant("/.well-known/jwks.json")))));
  return set;
};

// RS256 only: "none", HS256 and anything else is refused before the signature is even looked at.
export async function verifyIdToken(token: string, nonce: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, jwks(), { issuer: issuer(), audience: env.AUTH0_CLIENT_ID, algorithms: ["RS256"] });
  if (payload.nonce !== nonce) throw new Error("nonce mismatch");
  return payload;
}

// A short email cache for tokens without the email claim, so a polling agent hits /userinfo once, not every call.
const USERINFO_TTL_MS = 5 * 60_000;
const emailCache = new Map<string, { email: string | null; until: number }>();

// An Auth0 access token for our API: signature against the tenant's JWKS, issuer, audience, expiry, RS256.
// Returns null for anything that doesn't verify. Email comes from the namespaced claim, else /userinfo (cached 5 min per sub).
export async function verifyAccessToken(token: string): Promise<Session | null> {
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, jwks(), { issuer: issuer(), audience: env.AUTH0_AUDIENCE, algorithms: ["RS256"] }));
  } catch {
    return null;
  }
  if (typeof payload.sub !== "string" || !payload.sub) return null;
  const claim = payload[env.AUTH0_EMAIL_CLAIM];
  if (typeof claim === "string") return { sub: payload.sub, email: claim };
  const hit = emailCache.get(payload.sub);
  if (hit && hit.until > Date.now()) return { sub: payload.sub, email: hit.email };
  let email: string | null = null;
  try {
    const res = await fetch(tenant("/userinfo"), { headers: { authorization: `Bearer ${token}` } });
    if (res.ok) {
      const info = await res.json();
      if (typeof info.email === "string" && info.email_verified !== false) email = info.email;
    }
  } catch { /* email stays null; the token itself was valid */ }
  if (emailCache.size > 1000) emailCache.clear();
  emailCache.set(payload.sub, { email, until: Date.now() + USERINFO_TTL_MS });
  return { sub: payload.sub, email };
}

export const bearer = (request: Request): string | null => {
  const m = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(\S+)$/i);
  return m ? m[1] : null;
};
