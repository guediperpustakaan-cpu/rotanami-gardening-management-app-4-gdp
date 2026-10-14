import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  changePasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
} from "@/lib/schemas";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  cookieHeader,
  createSession,
  destroySession,
  hashPassword,
  parseCookies,
  requireUser,
  verifyPassword,
} from "@/server/auth";
import { getFarmDtos } from "@/server/data";
import { HttpError, Router, json, noContent, parseJsonBody } from "@/server/http";

function withCookie(res: Response, cookie: string): Response {
  res.headers.append("set-cookie", cookie);
  return res;
}

export const router = new Router();

router.post(
  "/auth/daftar",
  async (ctx) => {
    const body = await parseJsonBody(ctx.req);
    const data = registerSchema.parse(body);

    const existing = await db.query.users.findFirst({ where: eq(users.email, data.email) });
    if (existing) {
      throw new HttpError(409, "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.", {
        email: "Email ini sudah terdaftar.",
      });
    }

    const id = randomUUID();
    await db.insert(users).values({
      id,
      email: data.email,
      name: data.name,
      passwordHash: await hashPassword(data.password),
      timezone: "Asia/Jakarta",
    });

    const session = await createSession(id);
    const user = { id, name: data.name, email: data.email, timezone: "Asia/Jakarta", activeFarmId: null };
    return withCookie(
      json({ user, farms: [] }, 201),
      cookieHeader(session.token, ctx.secure, SESSION_MAX_AGE_SECONDS),
    );
  },
  false,
);

router.post(
  "/auth/masuk",
  async (ctx) => {
    const body = await parseJsonBody(ctx.req);
    const data = loginSchema.parse(body);
    const user = await db.query.users.findFirst({ where: eq(users.email, data.email) });
    // Pesan sengaja dibuat umum agar tidak membocorkan email mana yang terdaftar.
    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      throw new HttpError(401, "Email atau kata sandi tidak cocok. Periksa kembali lalu coba lagi.");
    }
    const session = await createSession(user.id);
    const farms = await getFarmDtos(user.id);
    return withCookie(
      json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          timezone: user.timezone,
          activeFarmId: user.activeFarmId ?? farms[0]?.id ?? null,
        },
        farms,
      }),
      cookieHeader(session.token, ctx.secure, SESSION_MAX_AGE_SECONDS),
    );
  },
  false,
);

router.post(
  "/auth/keluar",
  async (ctx) => {
    const token = parseCookies(ctx.req)[SESSION_COOKIE];
    await destroySession(token);
    return withCookie(noContent(), cookieHeader("", ctx.secure, 0));
  },
  false,
);

router.get("/auth/saya", async (ctx) => {
  const user = requireUser(ctx);
  const farms = await getFarmDtos(user.id);
  return json({ user, farms });
});

router.patch("/auth/profil", async (ctx) => {
  const user = requireUser(ctx);
  const data = profileSchema.parse(await parseJsonBody(ctx.req));
  const emailTaken = await db.query.users.findFirst({ where: eq(users.email, data.email) });
  if (emailTaken && emailTaken.id !== user.id) {
    throw new HttpError(409, "Email tersebut sudah dipakai akun lain.", { email: "Email sudah dipakai." });
  }
  await db
    .update(users)
    .set({
      name: data.name,
      email: data.email,
      timezone: data.timezone || user.timezone,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  return json({
    user: {
      ...user,
      name: data.name,
      email: data.email,
      timezone: data.timezone || user.timezone,
    },
  });
});

router.post("/auth/kata-sandi", async (ctx) => {
  const user = requireUser(ctx);
  const data = changePasswordSchema.parse(await parseJsonBody(ctx.req));
  const row = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (!row) throw new HttpError(404, "Akun tidak ditemukan.");
  if (!(await verifyPassword(data.currentPassword, row.passwordHash))) {
    throw new HttpError(400, "Kata sandi saat ini tidak cocok.", { currentPassword: "Kata sandi saat ini tidak cocok." });
  }
  await db.update(users).set({ passwordHash: await hashPassword(data.newPassword), updatedAt: new Date() }).where(eq(users.id, user.id));
  return json({ ok: true });
});

export default router;
