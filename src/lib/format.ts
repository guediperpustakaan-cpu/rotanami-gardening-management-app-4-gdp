/** Utilitas format tanggal/angka berbahasa Indonesia (isomorfik: dipakai client & server). */

const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const MONTHS_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** "2025-03-12" -> "12 Mar 2025" */
export function formatTanggal(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  return `${date.getDate()} ${MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`;
}

/** "2025-03-12" -> "Rabu, 12 Maret 2025" */
export function formatTanggalPanjang(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][date.getDay()];
  return `${hari}, ${date.getDate()} ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

/** Tanggal hari ini dalam format YYYY-MM-DD (zona waktu perangkat). */
export function tanggalHariIni(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function keyBulan(value: string | Date): string {
  const date = parseDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function namaBulan(key: string): string {
  const [year, month] = key.split("-");
  if (!year || !month) return key;
  return `${MONTHS_LONG[Number(month) - 1]} ${year}`;
}

/** Selisih hari dari hari ini; negatif = sudah lewat. */
export function selisihHari(value: string | Date): number | null {
  const date = parseDate(value);
  if (!date) return null;
  const today = parseDate(tanggalHariIni());
  if (!today) return null;
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

export function labelSelisih(value: string | Date): string {
  const diff = selisihHari(value);
  if (diff === null) return "—";
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Besok";
  if (diff === -1) return "Kemarin";
  if (diff > 1) return `${diff} hari lagi`;
  return `${Math.abs(diff)} hari lalu`;
}

export function formatAngka(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const formatted = new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(value);
  return formatted;
}

export function formatUkuran(size: number | null | undefined, unit: string | null | undefined): string {
  if (size === null || size === undefined) return "Ukuran belum diisi";
  const label = unit === "m2" ? "m²" : (unit ?? "");
  return `${formatAngka(size)} ${label}`.trim();
}

export type StatusMeta = { label: string; tone: "netral" | "info" | "sukses" | "perhatian" | "bahaya" };

export const STATUS_TANAM: Record<string, StatusMeta> = {
  direncanakan: { label: "Direncanakan", tone: "info" },
  ditanam: { label: "Sedang ditanam", tone: "sukses" },
  dipanen: { label: "Sudah dipanen", tone: "netral" },
  dibatalkan: { label: "Dibatalkan", tone: "bahaya" },
};

export const STATUS_RENCANA: Record<string, StatusMeta> = {
  direncanakan: { label: "Direncanakan", tone: "info" },
  ditanam: { label: "Sedang ditanam", tone: "sukses" },
  selesai: { label: "Selesai", tone: "netral" },
  dibatalkan: { label: "Dibatalkan", tone: "bahaya" },
};

export const LABEL_KATEGORI_HARA: Record<string, string> = {
  berat: "Pemakan hara berat",
  sedang: "Pemakan hara sedang",
  ringan: "Pemakan hara ringan",
  pemulih: "Pemulih / penutup tanah",
};

export const LABEL_KATEGORI_OBSERVASI: Record<string, string> = {
  hama: "Hama",
  penyakit: "Penyakit",
  pertumbuhan: "Pertumbuhan",
  cuaca: "Cuaca",
  lainnya: "Catatan lain",
};

export const LABEL_JENIS_PENGINGAT: Record<string, string> = {
  tanam: "Tanam",
  panen: "Panen",
  "uji-tanah": "Uji tanah",
  perawatan: "Perawatan",
  lainnya: "Lainnya",
};

export const LABEL_SATUAN_LUAS: Record<string, string> = {
  m2: "m² (meter persegi)",
  hektar: "hektar",
  are: "are",
  bedeng: "bedeng",
};
