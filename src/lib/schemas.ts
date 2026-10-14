import { z } from "zod";

/**
 * Skema validasi Zod yang dipakai bersama oleh frontend (react-hook-form)
 * dan backend (API). Semua pesan error berbahasa Indonesia.
 *
 * Catatan: field numerik di formulir dikirim sebagai string agar tipe data
 * formulir tetap sederhana; konversi ke angka dilakukan di sisi server.
 */

const NUMERIC_RE = /^\d{0,10}([.,]\d{1,4})?$/;

export const optionalNumberString = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => (v === undefined || v === null ? "" : String(v)))
  .pipe(z.string().trim().regex(NUMERIC_RE, "Isi harus berupa angka, contoh: 6.5").max(20, "Angka terlalu panjang"));

const requiredText = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} wajib diisi` })
    .trim()
    .min(min, `${label} minimal ${min} karakter`)
    .max(max, `${label} maksimal ${max} karakter`);

const optionalText = (max: number, label: string) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === undefined || v === null ? "" : String(v).trim()))
    .pipe(z.string().max(max, `${label} maksimal ${max} karakter`));

export const dateString = z
  .string({ error: "Tanggal wajib diisi" })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");

export const optionalDateString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v === undefined || v === null ? "" : String(v).trim()))
  .pipe(z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const uuid = z.string().min(1, "Pilihan wajib diisi");

export const registerSchema = z.object({
  name: requiredText(2, 60, "Nama"),
  email: z
    .string({ error: "Email wajib diisi" })
    .trim()
    .toLowerCase()
    .regex(EMAIL_RE, "Format email belum benar"),
  password: z.string({ error: "Kata sandi wajib diisi" }).min(8, "Kata sandi minimal 8 karakter").max(200, "Kata sandi terlalu panjang"),
});

export const loginSchema = z.object({
  email: z
    .string({ error: "Email wajib diisi" })
    .trim()
    .toLowerCase()
    .regex(EMAIL_RE, "Format email belum benar"),
  password: z.string({ error: "Kata sandi wajib diisi" }).min(1, "Kata sandi wajib diisi"),
});

export const profileSchema = z.object({
  name: requiredText(2, 60, "Nama"),
  email: z.string().trim().toLowerCase().regex(EMAIL_RE, "Format email belum benar"),
  timezone: optionalText(60, "Zona waktu"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Kata sandi saat ini wajib diisi"),
  newPassword: z.string().min(8, "Kata sandi baru minimal 8 karakter").max(200, "Kata sandi terlalu panjang"),
});

export const farmCreateSchema = z.object({
  name: requiredText(2, 80, "Nama kebun"),
  location: optionalText(120, "Lokasi"),
  timezone: optionalText(60, "Zona waktu"),
  notes: optionalText(1000, "Catatan"),
});

export const farmUpdateSchema = farmCreateSchema.partial();

export const plotSchema = z.object({
  farmId: uuid,
  name: requiredText(2, 60, "Nama petak"),
  size: optionalNumberString,
  areaUnit: z.enum(["m2", "hektar", "are", "bedeng"]),
  soilType: optionalText(60, "Jenis tanah"),
  notes: optionalText(1000, "Catatan"),
});

export const plotUpdateSchema = plotSchema.omit({ farmId: true });

export const familySchema = z.object({
  name: requiredText(2, 80, "Nama keluarga botani"),
  rotationGroup: optionalText(60, "Kelompok rotasi"),
  description: optionalText(500, "Keterangan"),
});

export const cropSchema = z.object({
  name: requiredText(2, 80, "Nama tanaman"),
  scientificName: optionalText(120, "Nama ilmiah"),
  familyId: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v ? String(v) : "")),
  nutrientCategory: z.enum(["", "berat", "sedang", "ringan", "pemulih"]),
  isCoverCrop: z.boolean(),
  guideNotes: optionalText(1000, "Catatan panduan"),
});

export const cropCreateSchema = cropSchema.extend({ farmId: uuid });

const seasonBase = z.object({
  farmId: uuid,
  name: requiredText(2, 60, "Nama musim"),
  startDate: dateString,
  endDate: dateString,
});

const cekMusim = (v: { startDate: string; endDate: string }) => v.endDate >= v.startDate;
const pesanMusim = { error: "Tanggal selesai harus sama atau setelah tanggal mulai", path: ["endDate"] };

export const seasonSchema = seasonBase.refine(cekMusim, pesanMusim);
export const seasonUpdateSchema = seasonBase.omit({ farmId: true }).refine(cekMusim, pesanMusim);

const plantingBase = z.object({
  plotId: uuid,
  cropId: uuid,
  seasonId: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v ? String(v) : "")),
  plantDate: dateString,
  harvestDate: optionalDateString,
  status: z.enum(["direncanakan", "ditanam", "dipanen", "dibatalkan"]),
  yieldAmount: optionalNumberString,
  yieldUnit: optionalText(30, "Satuan hasil"),
  notes: optionalText(1000, "Catatan"),
});

const cekTanam = (v: { plantDate: string; harvestDate: string }) => !v.harvestDate || v.harvestDate >= v.plantDate;
const pesanTanam = { error: "Tanggal panen tidak boleh sebelum tanggal tanam", path: ["harvestDate"] };

export const plantingSchema = plantingBase.refine(cekTanam, pesanTanam);
export const plantingUpdateSchema = plantingBase.omit({ plotId: true }).refine(cekTanam, pesanTanam);

const soilTestBase = z.object({
  plotId: uuid,
  testDate: dateString,
  ph: optionalNumberString,
  nitrogen: optionalNumberString,
  phosphorus: optionalNumberString,
  potassium: optionalNumberString,
  organicMatter: optionalNumberString,
  unitLabel: optionalText(30, "Satuan"),
  method: optionalText(120, "Metode"),
  source: optionalText(120, "Sumber hasil tes"),
  notes: optionalText(1000, "Catatan"),
});

const cekPh = (v: { ph: string }) => {
  if (v.ph === "") return true;
  const nilai = Number(v.ph.replace(",", "."));
  return Number.isFinite(nilai) && nilai >= 0 && nilai <= 14;
};
const pesanPh = { error: "pH harus berada di rentang 0 sampai 14", path: ["ph"] };

export const soilTestSchema = soilTestBase.refine(cekPh, pesanPh);
export const soilTestUpdateSchema = soilTestBase.omit({ plotId: true }).refine(cekPh, pesanPh);

export const observationSchema = z.object({
  plotId: uuid,
  plantingId: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v ? String(v) : "")),
  category: z.enum(["hama", "penyakit", "pertumbuhan", "cuaca", "lainnya"]),
  observedAt: dateString,
  description: requiredText(3, 1000, "Deskripsi"),
});

export const observationUpdateSchema = observationSchema.omit({ plotId: true });

export const rotationPlanSchema = z.object({
  plotId: uuid,
  seasonId: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v ? String(v) : "")),
  cropId: uuid,
  targetPlantDate: optionalDateString,
  status: z.enum(["direncanakan", "ditanam", "selesai", "dibatalkan"]),
  origin: z.enum(["aturan", "manual"]).default("manual"),
  recommendationReason: z.record(z.string(), z.unknown()).nullable().optional(),
  notes: optionalText(1000, "Catatan"),
});

export const rotationPlanUpdateSchema = z.object({
  seasonId: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v ? String(v) : "")),
  cropId: uuid.optional(),
  targetPlantDate: optionalDateString,
  status: z.enum(["direncanakan", "ditanam", "selesai", "dibatalkan"]).optional(),
  notes: optionalText(1000, "Catatan"),
});

export const reminderSchema = z.object({
  farmId: uuid,
  plotId: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v ? String(v) : "")),
  title: requiredText(2, 120, "Judul pengingat"),
  dueDate: dateString,
  kind: z.enum(["tanam", "panen", "uji-tanah", "perawatan", "lainnya"]),
  notes: optionalText(500, "Catatan"),
});

export const reminderUpdateSchema = z.object({
  title: requiredText(2, 120, "Judul pengingat").optional(),
  dueDate: dateString.optional(),
  kind: z.enum(["tanam", "panen", "uji-tanah", "perawatan", "lainnya"]).optional(),
  plotId: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v ? String(v) : "")),
  isDone: z.boolean().optional(),
  notes: optionalText(500, "Catatan").optional(),
});

export const confirmDeleteSchema = z.object({
  confirmName: z.string().min(1, "Ketik nama untuk konfirmasi penghapusan"),
});

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const raw = typeof value === "number" ? value : String(value).trim().replace(",", ".");
  if (raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function emptyToNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  return raw === "" ? null : raw;
}
