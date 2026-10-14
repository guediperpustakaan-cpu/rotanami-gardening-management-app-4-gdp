import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { farmMembers, farms, sessions, users } from "@/db/schema";
import type { Farm, User } from "@/db/schema";
import type { SessionUser } from "@/lib/types";
import { HttpError } from "./http";

/** Pembungkus scrypt berbasis Promise (hash kata sandi yang kuat tanpa dependensi native). */
function scrypt(password: string, salt: string, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey as Buffer);
    });
  });
}

export const SESSION_COOKIE = "rotanami_sesi";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 hari

/**
 * Autentikasi berbasis sesi yang disimpan di database.
 * Token acak dikirim sebagai cookie HttpOnly; hanya hash-nya yang disimpan di server,
 * sehingga token tidak dapat dibaca JavaScript di browser maupun bocor dari database.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password.normalize("NFKC"), salt, 64);
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const derived = await scrypt(password.normalize("NFKC"), salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await db.insert(sessions).values({ id: randomUUID(), tokenHash: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

export async function destroySession(token: string | null | undefined): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export function cookieHeader(token: string, secure: boolean, maxAge = SESSION_MAX_AGE_SECONDS): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.get("cookie");
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const chunk of header.split(";")) {
    const idx = chunk.indexOf("=");
    if (idx < 0) continue;
    out[chunk.slice(0, idx).trim()] = decodeURIComponent(chunk.slice(idx + 1).trim());
  }
  return out;
}

export function isSecureRequest(req: Request): boolean {
  if (process.env.NODE_ENV === "production") return true;
  const proto = req.headers.get("x-forwarded-proto");
  return proto === "https" || new URL(req.url).protocol === "https:";
}

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    timezone: user.timezone,
    activeFarmId: user.activeFarmId,
  };
}

/** Memuat pengguna dari token sesi (dipakai route handler maupun server component). */
export async function userFromToken(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const rows = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return toSessionUser(row.user);
}

/** Membaca pengguna dari cookie sesi pada sebuah Request. */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  return userFromToken(parseCookies(req)[SESSION_COOKIE]);
}

export function requireUser(ctx: { user: SessionUser | null }): SessionUser {
  if (!ctx.user) throw new HttpError(401, "Anda perlu masuk terlebih dahulu.");
  return ctx.user;
}

export type FarmAccess = { farm: Farm; role: "pemilik" | "pengelola" | "anggota" };

/** Otorisasi: hanya pemilik/anggota kebun yang boleh mengakses data kebun tersebut. */
export async function assertFarmAccess(farmId: string, userId: string): Promise<FarmAccess> {
  const farm = await db.query.farms.findFirst({ where: eq(farms.id, farmId) });
  if (!farm) throw new HttpError(404, "Kebun tidak ditemukan.");
  if (farm.ownerId === userId) return { farm, role: "pemilik" };

  const member = await db.query.farmMembers.findFirst({
    where: and(eq(farmMembers.farmId, farmId), eq(farmMembers.userId, userId)),
  });
  if (!member) {
    // Jangan ungkapkan keberadaan data milik pengguna lain.
    throw new HttpError(404, "Kebun tidak ditemukan atau Anda tidak memiliki akses ke kebun ini.");
  }
  const role = member.role === "pengelola" ? "pengelola" : "anggota";
  return { farm, role };
}

export async function assertFarmOwner(farmId: string, userId: string): Promise<FarmAccess> {
  const access = await assertFarmAccess(farmId, userId);
  if (access.role !== "pemilik") {
    throw new HttpError(403, "Hanya pemilik kebun yang dapat melakukan tindakan ini.");
  }
  return access;
}

/** Daftar kebun yang dapat diakses pengguna (milik sendiri + sebagai anggota). */
export async function listAccessibleFarms(userId: string): Promise<FarmAccess[]> {
  const owned = await db.query.farms.findMany({ where: eq(farms.ownerId, userId), orderBy: farms.name });
  const memberships = await db.query.farmMembers.findMany({ where: eq(farmMembers.userId, userId) });
  const others: FarmAccess[] = [];
  for (const membership of memberships) {
    if (owned.some((f) => f.id === membership.farmId)) continue;
    const farm = await db.query.farms.findFirst({ where: eq(farms.id, membership.farmId) });
    if (farm) others.push({ farm, role: membership.role === "pengelola" ? "pengelola" : "anggota" });
  }
  return [...owned.map((farm) => ({ farm, role: "pemilik" as const })), ...others];
}

export async function requireActiveFarm(user: SessionUser): Promise<FarmAccess> {
  const accessible = await listAccessibleFarms(user.id);
  if (accessible.length === 0) {
    throw new HttpError(404, "Anda belum memiliki kebun. Buat kebun terlebih dahulu.");
  }
  const active = accessible.find((item) => item.farm.id === user.activeFarmId) ?? accessible[0]!;
  return active;
}
