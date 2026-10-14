import { ZodError } from "zod";
import type { SessionUser } from "@/lib/types";

/** Kesalahan HTTP dengan pesan berbahasa Indonesia yang aman ditampilkan ke pengguna. */
export class HttpError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.fields = fields;
  }
}

export function json<T>(data: T, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export type Ctx = {
  req: Request;
  params: Record<string, string>;
  query: URLSearchParams;
  user: SessionUser | null;
  secure: boolean;
};

export type Handler = (ctx: Ctx) => Promise<Response> | Response;

type Route = {
  method: string;
  segments: string[];
  handler: Handler;
  auth: boolean;
};

export class Router {
  private routes: Route[] = [];

  private add(method: string, pattern: string, handler: Handler, auth = true) {
    this.routes.push({ method, segments: pattern.split("/").filter(Boolean), handler, auth });
    return this;
  }

  get(pattern: string, handler: Handler, auth = true) {
    return this.add("GET", pattern, handler, auth);
  }
  post(pattern: string, handler: Handler, auth = true) {
    return this.add("POST", pattern, handler, auth);
  }
  patch(pattern: string, handler: Handler, auth = true) {
    return this.add("PATCH", pattern, handler, auth);
  }
  put(pattern: string, handler: Handler, auth = true) {
    return this.add("PUT", pattern, handler, auth);
  }
  delete(pattern: string, handler: Handler, auth = true) {
    return this.add("DELETE", pattern, handler, auth);
  }

  mount(other: Router, prefix = "") {
    for (const route of other.routes) {
      this.routes.push({ ...route, segments: [...prefix.split("/").filter(Boolean), ...route.segments] });
    }
    return this;
  }

  async handle(req: Request, rest: string[], user: SessionUser | null, secure: boolean): Promise<Response> {
    const method = req.method.toUpperCase();
    const segments = rest.filter(Boolean).map((s) => decodeURIComponent(s));

    let pathMatched = false;
    for (const route of this.routes) {
      const params: Record<string, string> | null = matchSegments(route.segments, segments);
      if (!params) continue;
      pathMatched = true;
      if (route.method !== method) continue;
      if (route.auth && !user) {
        return json({ error: "Anda perlu masuk terlebih dahulu untuk mengakses data ini." }, 401);
      }
      const ctx: Ctx = { req, params, query: new URL(req.url).searchParams, user, secure };
      try {
        return await route.handler(ctx);
      } catch (error) {
        return handleRouteError(error);
      }
    }

    if (pathMatched) {
      return json({ error: `Metode ${method} tidak diizinkan untuk alamat ini.` }, 405);
    }
    return json({ error: "Alamat API tidak ditemukan." }, 404);
  }
}

function matchSegments(pattern: string[], segments: string[]): Record<string, string> | null {
  if (pattern.length !== segments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i += 1) {
    const token = pattern[i]!;
    const value = segments[i]!;
    if (token.startsWith(":")) {
      params[token.slice(1)] = value;
    } else if (token !== value) {
      return null;
    }
  }
  return params;
}

export function handleRouteError(error: unknown): Response {
  if (error instanceof HttpError) {
    return json({ error: error.message, fields: error.fields }, error.status);
  }
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.map((p) => String(p)).join(".") || "form";
      if (!fields[key]) fields[key] = issue.message;
    }
    const first = error.issues[0]?.message ?? "Data yang dikirim belum benar.";
    return json({ error: `Periksa kembali isian Anda. ${first}`, fields }, 400);
  }
  // Jangan bocorkan detail internal ke klien.
  console.error("[rotanami] kesalahan server:", error);
  return json({ error: "Terjadi kesalahan pada server. Silakan coba beberapa saat lagi." }, 500);
}

export async function parseJsonBody(req: Request): Promise<unknown> {
  try {
    const text = await req.text();
    if (!text.trim()) return {};
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Isian tidak dapat dibaca. Pastikan data dikirim dalam format JSON.");
  }
}

export function parseWith<T>(schema: { parse(data: unknown): T }, body: unknown): T {
  return schema.parse(body);
}

export function requireString(query: URLSearchParams, key: string, label: string): string {
  const value = query.get(key);
  if (!value) throw new HttpError(400, `${label} wajib diisi.`);
  return value;
}
