"use client";

import { useState } from "react";
import { Coffee, Download, ExternalLink, Heart, Minus, Plus } from "lucide-react";
import QRCode from "qrcode";
import { Modal, cx } from "@/components/ui";
import { DONASI_MINIMAL, KREDIT_OPEN_SOURCE, SOURCE_REPO_URL, SOURCE_ZIP_URL, TRAKTEER_URL } from "@/lib/site";

/** Pilihan nominal cepat — semuanya kelipatan DONASI_MINIMAL. */
const PILIHAN_NOMINAL = [6_000, 12_000, 18_000, 24_000, 30_000, 60_000];

function rupiah(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}

/**
 * Tombol mengambang khas Trakteer di pojok kanan bawah layar.
 * Saat diklik membuka dialog berisi pilihan nominal traktiran (mulai Rp6.000
 * dan kelipatannya) serta QR code ke halaman Trakteer — semua tanpa berpindah
 * halaman. Juga menyediakan tautan unduh source code proyek (open source).
 */
export function TrakteerWidget() {
  const [terbuka, setTerbuka] = useState(false);
  const [nominal, setNominal] = useState(DONASI_MINIMAL);
  // Dibuat saat dialog pertama kali dibuka (dalam handler klik, bukan effect).
  const [qr, setQr] = useState<string | null>(null);

  async function buka() {
    setTerbuka(true);
    if (qr !== null) return;
    try {
      const svg = await QRCode.toString(TRAKTEER_URL, {
        type: "svg",
        margin: 1,
        width: 224,
        color: { dark: "#2c2418", light: "#ffffff" },
      });
      setQr(svg);
    } catch {
      setQr("");
    }
  }

  function pilihNominal(nilai: number) {
    setNominal(nilai);
  }

  function naik() {
    setNominal((nilai) => nilai + DONASI_MINIMAL);
  }

  function turun() {
    setNominal((nilai) => Math.max(DONASI_MINIMAL, nilai - DONASI_MINIMAL));
  }

  const gayaTombolKedua =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-soil-300 bg-white px-4 text-sm font-semibold text-soil-800 shadow-sm hover:bg-soil-50";

  return (
    <>
      <button
        type="button"
        onClick={buka}
        aria-haspopup="dialog"
        aria-label="Traktir pengembang: web app ini gratis & bebas iklan. Kopi kecil, server tetap jalan."
        className="fixed bottom-24 right-4 z-40 flex max-w-[15rem] items-center gap-2.5 rounded-full bg-[#e85745] py-3 pl-3.5 pr-4 text-left text-sm font-bold text-white shadow-lg ring-1 ring-[#c43a2e] transition-colors hover:bg-[#d94a39] active:bg-[#c43a2e] lg:bottom-6"
      >
        <Coffee className="size-6 shrink-0" aria-hidden="true" />
        <span className="hidden leading-tight sm:inline">Web app ini gratis &amp; bebas iklan. Kopi kecil, server tetap jalan</span>
        <span className="sr-only">Buka dialog traktiran</span>
      </button>

      <Modal
        open={terbuka}
        onClose={() => setTerbuka(false)}
        title="Traktir kopi untuk Rotanami"
        description="Web app ini gratis & bebas iklan. Kopi kecil, server tetap jalan."
        size="sm"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <a href={SOURCE_ZIP_URL} target="_blank" rel="noreferrer" className={cx(gayaTombolKedua, "w-full sm:w-auto")}>
              <Download className="size-4" aria-hidden="true" />
              Unduh source code
            </a>
            <a
              href={TRAKTEER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#c43a2e] bg-[#e85745] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#d94a39] sm:w-auto"
            >
              <Heart className="size-4" aria-hidden="true" />
              Kirim traktiran via Trakteer
            </a>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="label-kecil mb-2">
              Pilih nominal traktiran (mulai {rupiah(DONASI_MINIMAL)}, kelipatan {rupiah(DONASI_MINIMAL)})
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PILIHAN_NOMINAL.map((nilai) => (
                <NominalChip key={nilai} nilai={nilai} aktif={nominal === nilai} onClick={() => pilihNominal(nilai)} />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-soil-200 bg-white p-2">
              <button
                type="button"
                onClick={turun}
                disabled={nominal <= DONASI_MINIMAL}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-soil-300 bg-white px-3 text-sm font-semibold text-soil-800 transition-colors hover:bg-soil-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Minus className="size-4" aria-hidden="true" />
                {rupiah(DONASI_MINIMAL)}
              </button>
              <p className="text-center text-sm font-bold text-soil-900" aria-live="polite">
                {rupiah(nominal)}
              </p>
              <button
                type="button"
                onClick={naik}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-soil-300 bg-white px-3 text-sm font-semibold text-soil-800 transition-colors hover:bg-soil-50"
              >
                <Plus className="size-4" aria-hidden="true" />
                {rupiah(DONASI_MINIMAL)}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-soil-600">Nominal dipakai sebagai catatan Anda; pembayaran tetap dilakukan di halaman Trakteer.</p>
          </div>

          <div className="rounded-xl border border-soil-200 bg-cream p-3">
            {qr === null ? (
              <p className="py-8 text-center text-sm text-soil-500">Menyiapkan QR code…</p>
            ) : qr === "" ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <p className="text-sm text-clay-800">QR code tidak dapat dimuat. Silakan buka halaman Trakteer langsung.</p>
                <a href={TRAKTEER_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-moss-700 hover:underline">
                  Buka trakteer.id/perpus_opera <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div
                  role="img"
                  aria-label={`QR code menuju ${TRAKTEER_URL}`}
                  className="overflow-hidden rounded-lg bg-white p-1"
                  // SVG dibuat di klien dari URL konstanta, bukan input pengguna.
                  dangerouslySetInnerHTML={{ __html: qr }}
                />
                <p className="text-center text-xs text-soil-600">
                  Scan QR untuk membuka halaman Trakteer, lalu selesaikan traktiran <strong>{rupiah(nominal)}</strong> di sana.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-moss-200 bg-moss-50 p-3 text-center">
            <p className="text-sm font-bold text-soil-900">{KREDIT_OPEN_SOURCE}</p>
            <p className="mt-1 text-xs text-soil-700">
              Source code lengkap web app ini tersedia untuk siapa saja:{" "}
              <a href={SOURCE_REPO_URL} target="_blank" rel="noreferrer" className="font-semibold text-moss-700 hover:underline">
                repository GitHub
              </a>
              .
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}

function NominalChip({ nilai, aktif, onClick }: { nilai: number; aktif: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      className={cx(
        "h-11 rounded-xl border text-sm font-bold transition-colors",
        aktif ? "border-[#e85745] bg-[#e85745]/10 text-[#b03a2e] ring-1 ring-[#e85745]" : "border-soil-300 bg-white text-soil-800 hover:bg-soil-50",
      )}
    >
      {rupiah(nilai)}
    </button>
  );
}
