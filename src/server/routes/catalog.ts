import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { crops, plantFamilies } from "@/db/schema";
import { confirmDeleteSchema, cropCreateSchema, cropSchema, familySchema } from "@/lib/schemas";
import { assertFarmAccess, requireActiveFarm, requireUser } from "@/server/auth";
import { getCropDtos, getFamilyDtos } from "@/server/data";
import { HttpError, Router, json, parseJsonBody, type Ctx } from "@/server/http";
import { ensureDemoCatalogOnce } from "@/server/seed";

export const router = new Router();

async function farmIdAktif(ctx: Ctx): Promise<string | null> {
  const user = requireUser(ctx);
  const requested = ctx.query.get("farmId");
  if (requested) {
    await assertFarmAccess(requested, user.id);
    return requested;
  }
  try {
    const access = await requireActiveFarm(user);
    return access.farm.id;
  } catch {
    return null;
  }
}

/** Tanaman hanya dapat diubah bila milik kebun yang dapat diakses dan bukan data contoh bawaan. */
async function cropEditable(cropId: string, userId: string) {
  const crop = await db.query.crops.findFirst({ where: eq(crops.id, cropId) });
  if (!crop) throw new HttpError(404, "Tanaman tidak ditemukan.");
  if (!crop.farmId || crop.isDemo) {
    throw new HttpError(403, "Tanaman contoh bawaan tidak dapat diubah. Gunakan tombol “Salin ke kebun saya” untuk membuat salinan yang dapat Anda ubah.");
  }
  await assertFarmAccess(crop.farmId, userId);
  return crop;
}

router.get("/katalog/tanaman", async (ctx) => {
  const user = requireUser(ctx);
  await ensureDemoCatalogOnce();
  const farmId = await farmIdAktif(ctx);
  const list = await getCropDtos({
    farmId,
    search: ctx.query.get("q") ?? undefined,
    familyId: ctx.query.get("familyId") || null,
    onlyMine: ctx.query.get("mine") === "1",
  });
  return json({ crops: list, total: list.length });
});

router.post("/katalog/tanaman", async (ctx) => {
  const user = requireUser(ctx);
  const data = cropCreateSchema.parse(await parseJsonBody(ctx.req));
  await assertFarmAccess(data.farmId, user.id);
  const duplikat = await db.query.crops.findFirst({
    where: and(eq(crops.farmId, data.farmId), eq(crops.name, data.name)),
  });
  if (duplikat) {
    throw new HttpError(409, `Tanaman "${data.name}" sudah ada di kebun ini.`, { name: "Nama tanaman sudah dipakai." });
  }
  const id = randomUUID();
  await db.insert(crops).values({
    id,
    farmId: data.farmId,
    name: data.name,
    scientificName: data.scientificName || null,
    familyId: data.familyId || null,
    nutrientCategory: data.nutrientCategory || null,
    isCoverCrop: data.isCoverCrop,
    guideNotes: data.guideNotes || null,
    isDemo: false,
  });
  const list = await getCropDtos({ farmId: data.farmId });
  return json({ crop: list.find((c) => c.id === id) ?? null }, 201);
});

router.get("/katalog/tanaman/:id", async (ctx) => {
  const user = requireUser(ctx);
  const crop = await db.query.crops.findFirst({ where: eq(crops.id, ctx.params.id!) });
  if (!crop) throw new HttpError(404, "Tanaman tidak ditemukan.");
  if (crop.farmId) await assertFarmAccess(crop.farmId, user.id);
  const farmId = crop.farmId ?? (await farmIdAktif(ctx));
  const list = await getCropDtos({ farmId });
  return json({ crop: list.find((c) => c.id === crop.id) ?? null });
});

router.patch("/katalog/tanaman/:id", async (ctx) => {
  const user = requireUser(ctx);
  const crop = await cropEditable(ctx.params.id!, user.id);
  const data = cropSchema.parse(await parseJsonBody(ctx.req));
  await db
    .update(crops)
    .set({
      name: data.name,
      scientificName: data.scientificName || null,
      familyId: data.familyId || null,
      nutrientCategory: data.nutrientCategory || null,
      isCoverCrop: data.isCoverCrop,
      guideNotes: data.guideNotes || null,
      updatedAt: new Date(),
    })
    .where(eq(crops.id, crop.id));
  const list = await getCropDtos({ farmId: crop.farmId });
  return json({ crop: list.find((c) => c.id === crop.id) ?? null, crops: list });
});

router.delete("/katalog/tanaman/:id", async (ctx) => {
  const user = requireUser(ctx);
  const crop = await cropEditable(ctx.params.id!, user.id);
  const { confirmName } = confirmDeleteSchema.parse(await parseJsonBody(ctx.req));
  if (confirmName.trim() !== crop.name.trim()) {
    throw new HttpError(400, "Nama tanaman yang diketik tidak sama, jadi penghapusan dibatalkan.", {
      confirmName: "Ketik nama tanaman persis seperti di atas.",
    });
  }
  try {
    await db.delete(crops).where(eq(crops.id, crop.id));
  } catch (error) {
    if ((error as { code?: string }).code === "23503") {
      throw new HttpError(
        409,
        "Tanaman ini sudah dipakai pada riwayat tanam atau rencana rotasi, jadi tidak dihapus agar jejak data tetap utuh. Anda masih dapat mengubah namanya.",
      );
    }
    throw error;
  }
  const list = await getCropDtos({ farmId: crop.farmId });
  return json({ crops: list });
});

router.post("/katalog/tanaman/:id/salin", async (ctx) => {
  const user = requireUser(ctx);
  const crop = await db.query.crops.findFirst({ where: eq(crops.id, ctx.params.id!) });
  if (!crop) throw new HttpError(404, "Tanaman tidak ditemukan.");
  const target = ctx.query.get("farmId") ? await assertFarmAccess(ctx.query.get("farmId")!, user.id) : await requireActiveFarm(user);
  const id = randomUUID();
  await db.insert(crops).values({
    id,
    farmId: target.farm.id,
    name: crop.name,
    scientificName: crop.scientificName,
    familyId: crop.familyId,
    nutrientCategory: crop.nutrientCategory,
    isCoverCrop: crop.isCoverCrop,
    guideNotes: crop.guideNotes,
    isDemo: false,
  });
  const list = await getCropDtos({ farmId: target.farm.id });
  return json({ crop: list.find((c) => c.id === id) ?? null, crops: list }, 201);
});

router.get("/katalog/keluarga", async (ctx) => {
  requireUser(ctx);
  await ensureDemoCatalogOnce();
  return json({ families: await getFamilyDtos() });
});

router.post("/katalog/keluarga", async (ctx) => {
  requireUser(ctx);
  const data = familySchema.parse(await parseJsonBody(ctx.req));
  const existing = await db.query.plantFamilies.findFirst({ where: eq(plantFamilies.name, data.name) });
  if (existing) {
    throw new HttpError(409, `Keluarga botani "${data.name}" sudah terdaftar.`, { name: "Nama keluarga sudah ada." });
  }
  const id = randomUUID();
  await db.insert(plantFamilies).values({
    id,
    name: data.name,
    rotationGroup: data.rotationGroup || null,
    description: data.description || null,
    isDemo: false,
  });
  return json({ families: await getFamilyDtos() }, 201);
});

export default router;
