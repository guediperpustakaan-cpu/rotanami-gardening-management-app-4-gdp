import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui";
import { TrakteerWidget } from "@/components/trakteer-widget";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Rotanami — catatan kebun, riwayat tanam & rotasi",
    template: "%s · Rotanami",
  },
  description:
    "Rotanami membantu pekebun rumahan, kebun komunitas, dan petani skala kecil mengelola petak, mencatat riwayat tanam, merencanakan rotasi, dan menyimpan hasil uji tanah.",
};

export const viewport: Viewport = {
  themeColor: "#3f6b39",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <ToastProvider>
          {children}
          <TrakteerWidget />
        </ToastProvider>
      </body>
    </html>
  );
}
