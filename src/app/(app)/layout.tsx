import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell";
import { SESSION_COOKIE, userFromToken } from "@/server/auth";
import { getFarmDtos } from "@/server/data";

export const dynamic = "force-dynamic";

/**
 * Batas autentikasi sisi server: tanpa cookie sesi yang sah, pengguna
 * diarahkan ke halaman masuk. Otorisasi data tetap diperiksa ulang di setiap
 * endpoint API.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const user = await userFromToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/masuk");

  const farms = await getFarmDtos(user.id);
  const activeFarmId = farms.some((farm) => farm.id === user.activeFarmId)
    ? user.activeFarmId
    : (farms[0]?.id ?? null);

  return (
    <Shell user={{ ...user, activeFarmId }} farms={farms}>
      {children}
    </Shell>
  );
}
