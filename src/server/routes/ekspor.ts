import { assertFarmAccess, requireActiveFarm, requireUser } from "@/server/auth";
import { getPlantingDtos, getSoilTestDtos } from "@/server/data";
import { Router, type Ctx } from "@/server/http";
import { formatTanggal, LABEL_KATEGORI_OBSERVASI } from "@/lib/format";
import { getObservationDtos } from "@/server/data";

export const router = new Router();

/** Menyusun CSV dengan pemisah titik koma (ramah Excel locale id) + BOM UTF-8. */
function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const escape = (value: string | number | null) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headers.map(escape).join(";"), ...rows.map((row) => row.map(escape).join(";"))];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

async function farmIdDari(ctx: Ctx): Promise<string> {
  const user = requireUser(ctx);
  const requested = ctx.query.get("farmId");
  if (requested) {
    await assertFarmAccess(requested, user.id);
    return requested;
  }
  return (await requireActiveFarm(user)).farm.id;
}

router.get("/ekspor/riwayat-tanam.csv", async (ctx) => {
  const farmId = await farmIdDari(ctx);
  const rows = await getPlantingDtos({ farmId });
  const csv = toCsv(
    ["Petak", "Tanaman", "Nama ilmiah", "Keluarga botani", "Musim", "Tanggal tanam", "Tanggal panen", "Status", "Hasil panen", "Satuan hasil", "Catatan"],
    rows.map((row) => [
      row.plotName,
      row.cropName,
      row.cropScientificName,
      row.familyName,
      row.seasonName,
      formatTanggal(row.plantDate),
      row.harvestDate ? formatTanggal(row.harvestDate) : "",
      row.status,
      row.yieldAmount,
      row.yieldUnit,
      row.notes,
    ]),
  );
  return csvResponse(csv, `riwayat-tanam-${farmId.slice(0, 8)}.csv`);
});

router.get("/ekspor/uji-tanah.csv", async (ctx) => {
  const farmId = await farmIdDari(ctx);
  const rows = await getSoilTestDtos({ farmId });
  const csv = toCsv(
    ["Petak", "Tanggal tes", "pH", "Nitrogen (N)", "Fosfor (P)", "Kalium (K)", "Bahan organik", "Satuan", "Metode", "Sumber", "Catatan"],
    rows.map((row) => [
      row.plotName,
      formatTanggal(row.testDate),
      row.ph,
      row.nitrogen,
      row.phosphorus,
      row.potassium,
      row.organicMatter,
      row.unitLabel,
      row.method,
      row.source,
      row.notes,
    ]),
  );
  return csvResponse(csv, `uji-tanah-${farmId.slice(0, 8)}.csv`);
});

router.get("/ekspor/observasi.csv", async (ctx) => {
  const farmId = await farmIdDari(ctx);
  const rows = await getObservationDtos({ farmId });
  const csv = toCsv(
    ["Petak", "Tanggal", "Kategori", "Siklus tanam terkait", "Deskripsi"],
    rows.map((row) => [
      row.plotName,
      formatTanggal(row.observedAt),
      LABEL_KATEGORI_OBSERVASI[row.category] ?? row.category,
      row.plantingLabel,
      row.description,
    ]),
  );
  return csvResponse(csv, `observasi-${farmId.slice(0, 8)}.csv`);
});

export default router;
