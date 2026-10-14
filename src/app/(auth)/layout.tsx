import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(120%_80%_at_50%_0%,#e2eddd_0%,#fbf8f3_55%,#f3ede2_100%)] px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <Link href="/masuk" className="mb-6 flex items-center justify-center gap-2.5">
          <svg viewBox="0 0 32 32" className="size-9" role="img" aria-label="Logo Rotanami: tunas di atas tanah">
            <circle cx="16" cy="16" r="15" className="fill-moss-700" />
            <path d="M16 25V13" stroke="#e2eddd" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 15c-4.6 0-7-2.4-7-6.4 4.8-.4 7 1.8 7 6.4Z" fill="#9fc192" />
            <path d="M16 18c4.4 0 6.6-2.2 6.6-6-4.6-.4-6.6 1.7-6.6 6Z" fill="#c6dbbd" />
            <path d="M8 25.5h16" stroke="#dd8351" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-xl font-extrabold tracking-tight text-moss-800">Rotanami</span>
        </Link>
        {children}
        <p className="mt-6 text-center text-xs text-soil-500">
          Rotanami adalah nama kerja proyek ini. Semua saran rotasi bersifat panduan umum, bukan diagnosis agronomi.
        </p>
      </div>
    </div>
  );
}
