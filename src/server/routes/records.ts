import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { crops, observations, plantings, plots, reminders, rotationPlans, soilTests } from "@/db/schema";
import {
  observationSchema,
  observationUpdateSchema,
  plantingSchema,
  plantingUpdateSchema,
  reminderSchema,
  reminderUpdateSchema,
  rotationPlanSchema,
  rotationPlanUpdateSchema,
  soilTestSchema,
  soilTestUpdateSchema,
  emptyToNull,
  toNumberOrNull,
} from "@/lib/schemas";
import type { RotationReason, RotationSuggestionResult } from "@/lib/types";
import { assertFarmAccess, requireActiveFarm, requireUser } from "@/server/auth";
import {
  getObservationDtos,
  getPlantingDtos,
  getReminderDtos,
  getRotationPlanDtos,
  getSoilTestDtos,
} from "@/server/data";
import { HttpError, Router, json, parseJsonBody } from "@/server/http";
import { hitungSaranRotasi } from "@/server/rotation";

export const router = new Router();

/* ------------------------------ bantu akses ------------------------------ */

async function plotOf(plotId: string, userId: string) {
  const plot = await db.query.plots.findFirst({ where: eq(plots.id, plotId) });
  if (!plot) throw new HttpError(404, "Petak tidak ditemukan.");
  await assertFarmAccess(plot.farmId, userId);
  return plot;
}

async function cropAccessible(cropId: string, farmId: string, userId: string) {
  const crop = await db.query.crops.findFirst({ where: eq(crops.id, cropId) });
  if (!crop) throw new HttpError(404, "Tanaman tidak ditemukan di katalog.");
  if (crop.farmId && crop.farmId !== farmId) {
    throw new HttpError(403, "Tanaman tersebut milik kebun lain dan tidak dapat dipakai di kebun ini.");
  }
  if (crop.farmId) await assertFarmAccess(crop.farmId, userId);
  return crop;
}

/* ----------------------------- riwayat tanam ----------------------------- */

router.get("/riwayat-tanam", async (ctx) => {
  const user = requireUser(ctx);
  const plotId = ctx.query.get("plotId");
  if (plotId) {
    await plotOf(plotId, user.id);
    return json({ plantings: await getPlantingDtos({ plotId }) });
  }
  const farmId = ctx.query.get("farmId");
  if (farmId) {
    await assertFarmAccess(farmId, user.id);
    return json({ plantings: await getPlantingDtos({ farmId }) });
  }
  const access = await requireActiveFarm(user);
  return json({ plantings: await getPlantingDtos({ farmId: access.farm.id }) });
});

router.post("/riwayat-tanam", async (ctx) => {
  const user = requireUser(ctx);
  const data = plantingSchema.parse(await parseJsonBody(ctx.req));
  const plot = await plotOf(data.plotId, user.id);
  await cropAccessible(data.cropId, plot.farmId, user.id);
  const id = randomUUID();
  await db.insert(plantings).values({
    id,
    plotId: plot.id,
    cropId: data.cropId,
    seasonId: emptyToNull(data.seasonId),
    plantDate: data.plantDate,
    harvestDate: emptyToNull(data.harvestDate),
    status: data.status,
    yieldAmount: toNumberOrNull(data.yieldAmount),
    yieldUnit: emptyToNull(data.yieldUnit),
    notes: emptyToNull(data.notes),
  });
  const list = await getPlantingDtos({ plotId: plot.id });
  return json({ planting: list.find((p) => p.id === id) ?? null, plantings: list }, 201);
});

router.patch("/riwayat-tanam/:id", async (ctx) => {
  const user = requireUser(ctx);
  const row = await db.query.plantings.findFirst({ where: eq(plantings.id, ctx.params.id!) });
  if (!row) throw new HttpError(404, "Catatan tanam tidak ditemukan.");
  const plot = await plotOf(row.plotId, user.id);
  const data = plantingUpdateSchema.parse(await parseJsonBody(ctx.req));
  if (data.cropId) await cropAccessible(data.cropId, plot.farmId, user.id);
  await db
    .update(plantings)
    .set({
      cropId: data.cropId ?? row.cropId,
      seasonId: data.seasonId === undefined ? row.seasonId : emptyToNull(data.seasonId),
      plantDate: data.plantDate,
      harvestDate: emptyToNull(data.harvestDate),
      status: data.status,
      yieldAmount: toNumberOrNull(data.yieldAmount),
      yieldUnit: emptyToNull(data.yieldUnit),
      notes: emptyToNull(data.notes),
      updatedAt: new Date(),
    })
    .where(eq(plantings.id, row.id));
  return json({ plantings: await getPlantingDtos({ plotId: row.plotId }) });
});

router.delete("/riwayat-tanam/:id", async (ctx) => {
  const user = requireUser(ctx);
  const row = await db.query.plantings.findFirst({ where: eq(plantings.id, ctx.params.id!) });
  if (!row) throw new HttpError(404, "Catatan tanam tidak ditemukan.");
  await plotOf(row.plotId, user.id);
  await db.delete(plantings).where(eq(plantings.id, row.id));
  return json({ plantings: await getPlantingDtos({ plotId: row.plotId }) });
});

/* ------------------------------ uji tanah -------------------------------- */

router.get("/uji-tanah", async (ctx) => {
  const user = requireUser(ctx);
  const plotId = ctx.query.get("plotId");
  if (plotId) {
    await plotOf(plotId, user.id);
    return json({ soilTests: await getSoilTestDtos({ plotId }) });
  }
  const farmId = ctx.query.get("farmId");
  if (farmId) {
    await assertFarmAccess(farmId, user.id);
    return json({ soilTests: await getSoilTestDtos({ farmId }) });
  }
  const access = await requireActiveFarm(user);
  return json({ soilTests: await getSoilTestDtos({ farmId: access.farm.id }) });
});

router.post("/uji-tanah", async (ctx) => {
  const user = requireUser(ctx);
  const data = soilTestSchema.parse(await parseJsonBody(ctx.req));
  const plot = await plotOf(data.plotId, user.id);
  const id = randomUUID();
  await db.insert(soilTests).values({
    id,
    plotId: plot.id,
    testDate: data.testDate,
    ph: toNumberOrNull(data.ph),
    nitrogen: toNumberOrNull(data.nitrogen),
    phosphorus: toNumberOrNull(data.phosphorus),
    potassium: toNumberOrNull(data.potassium),
    organicMatter: toNumberOrNull(data.organicMatter),
    unitLabel: emptyToNull(data.unitLabel),
    method: emptyToNull(data.method),
    source: emptyToNull(data.source),
    notes: emptyToNull(data.notes),
  });
  return json({ soilTests: await getSoilTestDtos({ plotId: plot.id }) }, 201);
});

router.patch("/uji-tanah/:id", async (ctx) => {
  const user = requireUser(ctx);
  const row = await db.query.soilTests.findFirst({ where: eq(soilTests.id, ctx.params.id!) });
  if (!row) throw new HttpError(404, "Hasil uji tanah tidak ditemukan.");
  await plotOf(row.plotId, user.id);
  const data = soilTestUpdateSchema.parse(await parseJsonBody(ctx.req));
  await db
    .update(soilTests)
    .set({
      testDate: data.testDate,
      ph: toNumberOrNull(data.ph),
      nitrogen: toNumberOrNull(data.nitrogen),
      phosphorus: toNumberOrNull(data.phosphorus),
      potassium: toNumberOrNull(data.potassium),
      organicMatter: toNumberOrNull(data.organicMatter),
      unitLabel: emptyToNull(data.unitLabel),
      method: emptyToNull(data.method),
      source: emptyToNull(data.source),
      notes: emptyToNull(data.notes),
      updatedAt: new Date(),
    })
    .where(eq(soilTests.id, row.id));
  return json({ soilTests: await getSoilTestDtos({ plotId: row.plotId }) });
});

router.delete("/uji-tanah/:id", async (ctx) => {
  const user = requireUser(ctx);
  const row = await db.query.soilTests.findFirst({ where: eq(soilTests.id, ctx.params.id!) });
  if (!row) throw new HttpError(404, "Hasil uji tanah tidak ditemukan.");
  await plotOf(row.plotId, user.id);
  await db.delete(soilTests).where(eq(soilTests.id, row.id));
  return json({ soilTests: await getSoilTestDtos({ plotId: row.plotId }) });
});

/* ------------------------------- observasi ------------------------------- */

router.get("/observasi", async (ctx) => {
  const user = requireUser(ctx);
  const plotId = ctx.query.get("plotId");
  if (plotId) {
    await plotOf(plotId, user.id);
    return json({ observations: await getObservationDtos({ plotId }) });
  }
  const farmId = ctx.query.get("farmId");
  if (farmId) {
    await assertFarmAccess(farmId, user.id);
    return json({ observations: await getObservationDtos({ farmId }) });
  }
  const access = await requireActiveFarm(user);
  return json({ observations: await getObservationDtos({ farmId: access.farm.id }) });
});

router.post("/observasi", async (ctx) => {
  const user = requireUser(ctx);
  const data = observationSchema.parse(await parseJsonBody(ctx.req));
  const plot = await plotOf(data.plotId, user.id);
  const plantingId = emptyToNull(data.plantingId);
  if (plantingId) {
    const planting = await db.query.plantings.findFirst({ where: eq(plantings.id, plantingId) });
    if (!planting || planting.plotId !== plot.id) {
      throw new HttpError(400, "Siklus tanam yang dipilih tidak berada di petak ini.", { plantingId: "Pilih siklus tanam dari petak yang sama." });
    }
  }
  const id = randomUUID();
  await db.insert(observations).values({
    id,
    plotId: plot.id,
    plantingId,
    category: data.category,
    observedAt: data.observedAt,
    description: data.description,
  });
  return json({ observations: await getObservationDtos({ plotId: plot.id }) }, 201);
});

router.patch("/observasi/:id", async (ctx) => {
  const user = requireUser(ctx);
  const row = await db.query.observations.findFirst({ where: eq(observations.id, ctx.params.id!) });
  if (!row) throw new HttpError(404, "Catatan observasi tidak ditemukan.");
  await plotOf(row.plotId, user.id);
  const data = observationUpdateSchema.parse(await parseJsonBody(ctx.req));
  await db
    .update(observations)
    .set({
      plantingId: emptyToNull(data.plantingId),
      category: data.category,
      observedAt: data.observedAt,
      description: data.description,
      updatedAt: new Date(),
    })
    .where(eq(observations.id, row.id));
  return json({ observations: await getObservationDtos({ plotId: row.plotId }) });
});

router.delete("/observasi/:id", async (ctx) => {
  const user = requireUser(ctx);
  const row = await db.query.observations.findFirst({ where: eq(observations.id, ctx.params.id!) });
  if (!row) throw new HttpError(404, "Catatan observasi tidak ditemukan.");
  await plotOf(row.plotId, user.id);
  await db.delete(observations).where(eq(observations.id, row.id));
  return json({ observations: await getObservationDtos({ plotId: row.plotId }) });
});

/* ----------------------------- rencana rotasi ---------------------------- */

function toReason(result: RotationSuggestionResult, chosenCropId: string): RotationReason {
  const chosen =
    result.primary && result.primary.crop.id === chosenCropId
      ? result.primary
      : result.alternatives.find((item) => item.crop.id === chosenCropId);
  const alasan = chosen
    ? chosen.reasons
    : [
        "Tanaman ini dipilih sendiri oleh pengguna dan tidak termasuk dalam daftar saran utama mesin aturan saat rencana disimpan, jadi tidak ada alasan otomatis yang dapat dilampirkan.",
      ];
  return {
    engineVersion: result.engineVersion,
    status: result.status,
    confidence: result.confidence,
    headline: result.headline,
    reasons: alasan,
    dataGaps: result.dataGaps,
    disclaimer: result.disclaimer,
    alternatives: result.alternatives.map((item) => ({
      cropId: item.crop.id,
      cropName: item.crop.name,
      score: item.score,
      reasons: item.reasons,
    })),
    createdAt: new Date().toISOString(),
  };
}

router.get("/rencana-rotasi", async (ctx) => {
  const user = requireUser(ctx);
  const farmId = ctx.query.get("farmId") ?? (await requireActiveFarm(user)).farm.id;
  await assertFarmAccess(farmId, user.id);
  return json({ plans: await getRotationPlanDtos(farmId) });
});

router.post("/rencana-rotasi", async (ctx) => {
  const user = requireUser(ctx);
  const data = rotationPlanSchema.parse(await parseJsonBody(ctx.req));
  const plot = await plotOf(data.plotId, user.id);
  await cropAccessible(data.cropId, plot.farmId, user.id);

  let reason: RotationReason | null = null;
  if (data.origin === "aturan") {
    const result = await hitungSaranRotasi(plot.id);
    reason = toReason(result, data.cropId);
  }

  const id = randomUUID();
  await db.insert(rotationPlans).values({
    id,
    plotId: plot.id,
    seasonId: emptyToNull(data.seasonId),
    cropId: data.cropId,
    status: data.status,
    origin: data.origin,
    targetPlantDate: emptyToNull(data.targetPlantDate),
    notes: emptyToNull(data.notes),
    recommendationReason: reason,
  });
  return json({ plans: await getRotationPlanDtos(plot.farmId) }, 201);
});

router.patch("/rencana-rotasi/:id", async (ctx) => {
  const user = requireUser(ctx);
  const row = await db.query.rotationPlans.findFirst({ where: eq(rotationPlans.id, ctx.params.id!) });
  if (!row) throw new HttpError(404, "Rencana rotasi tidak ditemukan.");
  const plot = await plotOf(row.plotId, user.id);
  const data = rotationPlanUpdateSchema.parse(await parseJsonBody(ctx.req));
  if (data.cropId) await cropAccessible(data.cropId, plot.farmId, user.id);
  await db
    .update(rotationPlans)
    .set({
      seasonId: data.seasonId === undefined ? row.seasonId : emptyToNull(data.seasonId),
      cropId: data.cropId ?? row.cropId,
      targetPlantDate: data.targetPlantDate === undefined ? row.targetPlantDate : emptyToNull(data.targetPlantDate),
      status: data.status ?? row.status,
      notes: data.notes === undefined ? row.notes : emptyToNull(data.notes),
      updatedAt: new Date(),
    })
    .where(eq(rotationPlans.id, row.id));
  return json({ plans: await getRotationPlanDtos(plot.farmId) });
});

router.delete("/rencana-rotasi/:id", async (ctx) => {
  const user = requireUser(ctx);
  const row = await db.query.rotationPlans.findFirst({ where: eq(rotationPlans.id, ctx.params.id!) });
  if (!row) throw new HttpError(404, "Rencana rotasi tidak ditemukan.");
  const plot = await plotOf(row.plotId, user.id);
  await db.delete(rotationPlans).where(eq(rotationPlans.id, row.id));
  return json({ plans: await getRotationPlanDtos(plot.farmId) });
});

/* -------------------------------- pengingat ------------------------------- */

router.get("/pengingat", async (ctx) => {
  const user = requireUser(ctx);
  const farmId = ctx.query.get("farmId") ?? (await requireActiveFarm(user)).farm.id;
  await assertFarmAccess(farmId, user.id);
  return json({ reminders: await getReminderDtos(farmId) });
});

router.post("/pengingat", async (ctx) => {
  const user = requireUser(ctx);
  const data = reminderSchema.parse(await parseJsonBody(ctx.req));
  await assertFarmAccess(data.farmId, user.id);
  const plotId = emptyToNull(data.plotId);
  if (plotId) await plotOf(plotId, user.id);
  const id = randomUUID();
  await db.insert(reminders).values({
    id,
    farmId: data.farmId,
    plotId,
    title: data.title,
    dueDate: data.dueDate,
    kind: data.kind,
    notes: emptyToNull(data.notes),
  });
  return json({ reminders: await getReminderDtos(data.farmId) }, 201);
});

router.patch("/pengingat/:id", async (ctx) => {
  const user = requireUser(ctx);
  const row = await db.query.reminders.findFirst({ where: eq(reminders.id, ctx.params.id!) });
  if (!row) throw new HttpError(404, "Pengingat tidak ditemukan.");
  await assertFarmAccess(row.farmId, user.id);
  const data = reminderUpdateSchema.parse(await parseJsonBody(ctx.req));
  const plotId = data.plotId === undefined ? row.plotId : emptyToNull(data.plotId);
  if (plotId) await plotOf(plotId, user.id);
  const isDone = data.isDone ?? row.isDone;
  await db
    .update(reminders)
    .set({
      title: data.title ?? row.title,
      dueDate: data.dueDate ?? row.dueDate,
      kind: data.kind ?? row.kind,
      plotId,
      notes: data.notes === undefined ? row.notes : emptyToNull(data.notes),
      isDone,
      completedAt: isDone ? (row.completedAt ?? new Date()) : null,
    })
    .where(eq(reminders.id, row.id));
  return json({ reminders: await getReminderDtos(row.farmId) });
});

router.delete("/pengingat/:id", async (ctx) => {
  const user = requireUser(ctx);
  const row = await db.query.reminders.findFirst({ where: eq(reminders.id, ctx.params.id!) });
  if (!row) throw new HttpError(404, "Pengingat tidak ditemukan.");
  await assertFarmAccess(row.farmId, user.id);
  await db.delete(reminders).where(eq(reminders.id, row.id));
  return json({ reminders: await getReminderDtos(row.farmId) });
});

/* ------------------------------ saran rotasi ----------------------------- */

router.post("/rotasi/saran", async (ctx) => {
  const user = requireUser(ctx);
  const body = (await parseJsonBody(ctx.req)) as { plotId?: string };
  if (!body.plotId) throw new HttpError(400, "Petak wajib dipilih untuk meminta saran.");
  await plotOf(body.plotId, user.id);
  const result = await hitungSaranRotasi(body.plotId);
  return json(result);
});

export default router;
