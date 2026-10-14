import type { NextRequest } from "next/server";
import { apiRouter } from "@/server/router";
import { getSessionUser, isSecureRequest } from "@/server/auth";
import { handleRouteError, json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function jalankan(req: NextRequest, context: { params: Promise<{ rest?: string[] }> }): Promise<Response> {
  try {
    const { rest } = await context.params;
    const user = await getSessionUser(req).catch((error) => {
      console.error("[rotanami] gagal memuat sesi:", error);
      return null;
    });
    return await apiRouter.handle(req, rest ?? [], user, isSecureRequest(req));
  } catch (error) {
    return handleRouteError(error);
  }
}

export const GET = jalankan;
export const POST = jalankan;
export const PATCH = jalankan;
export const PUT = jalankan;
export const DELETE = jalankan;

export const OPTIONS = () => json({ ok: true }, 204);
