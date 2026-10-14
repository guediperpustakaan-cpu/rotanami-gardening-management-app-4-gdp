import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { farms, plots, seasons, users } from "@/db/schema";
import { confirmDeleteSchema, farmCreateSchema, farmUpdateSchema, plotSchema, plotUpdateSchema, seasonSchema, seasonUpdateSchema, toNumberOrNull } from "@/lib/schemas";
import { tanggalHariIni } from "@/lib/format";
import { assertFarmAccess, assertFarmOwner, requireUser } from "@/server/auth";
import {
  getFarmDtos,
  getPlotDtos,
  getReminderDtos,
  getRotationPlanDtos,
  getSeasonDtos,
  getPlantingDtos,
} from "@/server/data";
import { HttpError, Router, json, parseJsonBody, requireString } from "@/server/http";
import { buatKebunContoh } from "@/server/seed";

export const router = new Router();

/* ---------------------------------- kebun --------------------------------- */

router.get("/kebun", async (ctx) => {
  const user = requireUser(ctx);
  return json({ farms: await getFarmDtos(user.id) });
});

router.post("/kebun", async (ctx) => {
  const user = requireUser(ctx);
  const data = farmCreateSchema.parse(await parseJsonBody(ctx.req));
  const id = randomUUID();
  await db.insert(farms).values({
    id,
    ownerId: user.id,
    name: data.name,
    location: data.location || null,
    timezone: data.timezone || user.timezone || "Asia/Jakarta",
    notes: data.notes || null,
    isDemo: false,
  });
  await db.update(users).set({ activeFarmId: id, updatedAt: new Date() }).where(eq(users.id, user.id));
  const all = await getFarmDtos(user.id);
  return json({ farm: all.find((f) => f.id === id) ?? null, farms: all }, 201);
});

router.post("/kebun/contoh", async (ctx) => {
  const user = requireUser(ctx);
  const farmId = await buatKebunContoh(user.id, {
    name: "Kebun Contoh (data contoh)",
    location: "Data contoh — lokasi tidak diisi",
  });
  await db.update(users).set({ activeFarmId: farmId, updatedAt: new Date() }).where(eq(users.id, user.id));
  const all = await getFarmDtos(user.id);
  return json({ farm: all.find((f) => f.id === farmId) ?? null, farms: all }, 201);
});

router.get("/kebun/:id", async (ctx) => {
  const user = requireUser(ctx);
  const { farm, role } = await assertFarmAccess(ctx.params.id!, user.id);
  const [allFarms, farmPlots] = await Promise.all([getFarmDtos(user.id), getPlotDtos(farm.id)]);
  return json({ farm: allFarms.find((f) => f.id === farm.id) ?? null, role, plots: farmPlots });
});

router.patch("/kebun/:id", async (ctx) => {
  const user = requireUser(ctx);
  const { farm } = await assertFarmAccess(ctx.params.id!, user.id);
  const data = farmUpdateSchema.parse(await parseJsonBody(ctx.req));
  await db
    .update(farms)
    .set({
      name: data.name ?? farm.name,
      location: data.location !== undefined ? data.location || null : farm.location,
      timezone: data.timezone || farm.timezone,
      notes: data.notes !== undefined ? data.notes || null : farm.notes,
      updatedAt: new Date(),
    })
    .where(eq(farms.id, farm.id));
  const all = await getFarmDtos(user.id);
  return json({ farm: all.find((f) => f.id === farm.id) ?? null, farms: all });
});

router.post("/kebun/:id/aktif", async (ctx) => {
  const user = requireUser(ctx);
  await assertFarmAccess(ctx.params.id!, user.id);
  await db.update(users).set({ activeFarmId: ctx.params.id!, updatedAt: new Date() }).where(eq(users.id, user.id));
  return json({ ok: true, activeFarmId: ctx.params.id });
});

router.delete("/kebun/:id", async (ctx) => {
  const user = requireUser(ctx);
  const { farm } = await assertFarmOwner(ctx.params.id!, user.id);
  const { confirmName } = confirmDeleteSchema.parse(await parseJsonBody(ctx.req));
  if (confirmName.trim() !== farm.name.trim()) {
    throw new HttpError(400, "Nama kebun yang diketik tidak sama, jadi penghapusan dibatalkan.", {
      confirmName: "Ketik nama kebun persis seperti di atas.",
    });
  }
  await db.delete(farms).where(eq(farms.id, farm.id));
  if (user.activeFarmId === farm.id) {
    await db.update(users).set({ activeFarmId: null }).where(eq(users.id, user.id));
  }
  return json({ farms: await getFarmDtos(user.id) });
});

/* ---------------------------------- petak --------------------------------- */

async function aksesPetak(plotId: string, userId: string) {
  const plot = await db.query.plots.findFirst({ where: eq(plots.id, plotId) });
  if (!plot) throw new HttpError(404, "Petak tidak ditemukan.");
  const access = await assertFarmAccess(plot.farmId, userId);
  return { plot, access };
}

router.get("/petak", async (ctx) => {
  const user = requireUser(ctx);
  const farmId = ctx.query.get("farmId");
  const target = farmId ? (await assertFarmAccess(farmId, user.id)).farm : null;
  if (farmId && target) return json({ plots: await getPlotDtos(farmId) });
  const all = await getFarmDtos(user.id);
  const first = all.find((f) => f.id === user.activeFarmId) ?? all[0];
  return json({ plots: first ? await getPlotDtos(first.id) : [] });
});

router.post("/petak", async (ctx) => {
  const user = requireUser(ctx);
  const data = plotSchema.parse(await parseJsonBody(ctx.req));
  await assertFarmAccess(data.farmId, user.id);
  const duplikat = await db.query.plots.findFirst({
    where: and(eq(plots.farmId, data.farmId), eq(plots.name, data.name)),
  });
  if (duplikat) {
    throw new HttpError(409, `Nama petak "${data.name}" sudah dipakai di kebun ini.`, { name: "Nama petak sudah dipakai." });
  }
  const id = randomUUID();
  await db.insert(plots).values({
    id,
    farmId: data.farmId,
    name: data.name,
    size: toNumberOrNull(data.size),
    areaUnit: data.areaUnit,
    soilType: data.soilType || null,
    notes: data.notes || null,
  });
  return json({ plot: (await getPlotDtos(data.farmId)).find((p) => p.id === id) ?? null }, 201);
});

router.get("/petak/:id", async (ctx) => {
  const user = requireUser(ctx);
  const { plot } = await aksesPetak(ctx.params.id!, user.id);
  const [allPlots, seasonList] = await Promise.all([getPlotDtos(plot.farmId), getSeasonDtos(plot.farmId)]);
  return json({ plot: allPlots.find((p) => p.id === plot.id) ?? null, seasons: seasonList });
});

router.patch("/petak/:id", async (ctx) => {
  const user = requireUser(ctx);
  const { plot } = await aksesPetak(ctx.params.id!, user.id);
  const data = plotUpdateSchema.parse(await parseJsonBody(ctx.req));
  const duplikat = await db.query.plots.findFirst({
    where: and(eq(plots.farmId, plot.farmId), eq(plots.name, data.name)),
  });
  if (duplikat && duplikat.id !== plot.id) {
    throw new HttpError(409, `Nama petak "${data.name}" sudah dipakai di kebun ini.`, { name: "Nama petak sudah dipakai." });
  }
  await db
    .update(plots)
    .set({
      name: data.name,
      size: toNumberOrNull(data.size),
      areaUnit: data.areaUnit,
      soilType: data.soilType || null,
      notes: data.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(plots.id, plot.id));
  return json({ plot: (await getPlotDtos(plot.farmId)).find((p) => p.id === plot.id) ?? null });
});

router.delete("/petak/:id", async (ctx) => {
  const user = requireUser(ctx);
  const { plot } = await aksesPetak(ctx.params.id!, user.id);
  const { confirmName } = confirmDeleteSchema.parse(await parseJsonBody(ctx.req));
  if (confirmName.trim() !== plot.name.trim()) {
    throw new HttpError(400, "Nama petak yang diketik tidak sama, jadi penghapusan dibatalkan.", {
      confirmName: "Ketik nama petak persis seperti di atas.",
    });
  }
  await db.delete(plots).where(eq(plots.id, plot.id));
  return json({ plots: await getPlotDtos(plot.farmId) });
});

/* ---------------------------------- musim --------------------------------- */

router.get("/musim", async (ctx) => {
  const user = requireUser(ctx);
  const farmId = requireString(ctx.query, "farmId", "Kebun");
  await assertFarmAccess(farmId, user.id);
  return json({ seasons: await getSeasonDtos(farmId) });
});

router.post("/musim", async (ctx) => {
  const user = requireUser(ctx);
  const data = seasonSchema.parse(await parseJsonBody(ctx.req));
  await assertFarmAccess(data.farmId, user.id);
  const id = randomUUID();
  await db.insert(seasons).values({
    id,
    farmId: data.farmId,
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
  });
  return json({ season: (await getSeasonDtos(data.farmId)).find((s) => s.id === id) ?? null }, 201);
});

router.patch("/musim/:id", async (ctx) => {
  const user = requireUser(ctx);
  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, ctx.params.id!) });
  if (!season) throw new HttpError(404, "Musim tidak ditemukan.");
  await assertFarmAccess(season.farmId, user.id);
  const data = seasonUpdateSchema.parse(await parseJsonBody(ctx.req));
  await db
    .update(seasons)
    .set({ name: data.name, startDate: data.startDate, endDate: data.endDate, updatedAt: new Date() })
    .where(eq(seasons.id, season.id));
  return json({ seasons: await getSeasonDtos(season.farmId) });
});

router.delete("/musim/:id", async (ctx) => {
  const user = requireUser(ctx);
  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, ctx.params.id!) });
  if (!season) throw new HttpError(404, "Musim tidak ditemukan.");
  await assertFarmAccess(season.farmId, user.id);
  await db.delete(seasons).where(eq(seasons.id, season.id));
  return json({ seasons: await getSeasonDtos(season.farmId) });
});

/* -------------------------------- ringkasan ------------------------------- */

router.get("/ringkasan", async (ctx) => {
  const user = requireUser(ctx);
  const allFarms = await getFarmDtos(user.id);
  const requested = ctx.query.get("farmId");
  if (requested && !allFarms.some((item) => item.id === requested)) {
    // Kebun milik pengguna lain diperlakukan sama seperti kebun yang tidak ada.
    throw new HttpError(404, "Kebun tidak ditemukan atau Anda tidak memiliki akses ke kebun ini.");
  }
  const farm =
    (requested ? allFarms.find((f) => f.id === requested) : null) ??
    allFarms.find((f) => f.id === user.activeFarmId) ??
    allFarms[0] ??
    null;

  if (!farm) {
    return json({
      farm: null,
      farms: allFarms,
      plotCount: 0,
      plantingCount: 0,
      plannedThisSeason: 0,
      plantedPlots: 0,
      pendingActions: 0,
      plots: [],
      season: null,
      upcoming: [],
      remindersOpen: 0,
    });
  }

  const [plotList, plantingList, seasonList, planList, reminderList] = await Promise.all([
    getPlotDtos(farm.id),
    getPlantingDtos({ farmId: farm.id }),
    getSeasonDtos(farm.id),
    getRotationPlanDtos(farm.id),
    getReminderDtos(farm.id),
  ]);

  const today = tanggalHariIni();
  const activeSeason =
    seasonList.find((s) => s.startDate <= today && today <= s.endDate) ??
    seasonList.find((s) => s.startDate > today) ??
    seasonList[0] ??
    null;

  const seasonPlans = activeSeason
    ? planList.filter((p) => p.seasonId === activeSeason.id && p.status === "direncanakan")
    : planList.filter((p) => p.status === "direncanakan");
  const seasonPlantings = activeSeason
    ? plantingList.filter((p) => p.seasonId === activeSeason.id)
    : plantingList;

  const openReminders = reminderList.filter((r) => !r.isDone);
  const dueSoonReminders = openReminders.filter((r) => r.dueDate <= addDays(today, 14));
  const plannedPlantings = plantingList.filter((p) => p.status === "direncanakan");
  const overduePlanned = plannedPlantings.filter((p) => p.plantDate <= today);
  const activeWithoutHarvest = plantingList.filter((p) => p.status === "ditanam" && !p.harvestDate);

  const upcoming: { type: "rencana" | "pengingat" | "tanam" | "panen"; id: string; title: string; date: string; plotName: string | null; isDone?: boolean }[] = [];
  for (const reminder of openReminders) {
    upcoming.push({ type: "pengingat", id: reminder.id, title: reminder.title, date: reminder.dueDate, plotName: reminder.plotName, isDone: false });
  }
  for (const plan of seasonPlans) {
    if (plan.targetPlantDate) {
      upcoming.push({ type: "rencana", id: plan.id, title: `Rencana tanam ${plan.cropName}`, date: plan.targetPlantDate, plotName: plan.plotName });
    }
  }
  for (const planting of plannedPlantings) {
    upcoming.push({ type: "tanam", id: planting.id, title: `Jadwal tanam ${planting.cropName}`, date: planting.plantDate, plotName: planting.plotName });
  }
  upcoming.sort((a, b) => (a.date > b.date ? 1 : -1));

  return json({
    farm,
    farms: allFarms,
    plotCount: plotList.length,
    plantingCount: plantingList.length,
    plannedThisSeason: seasonPlans.length + seasonPlantings.filter((p) => p.status === "direncanakan").length,
    plantedPlots: plotList.filter((p) => p.lastPlanting?.status === "ditanam").length,
    pendingActions: dueSoonReminders.length + overduePlanned.length + activeWithoutHarvest.length,
    plots: plotList,
    season: activeSeason,
    upcoming: upcoming.slice(0, 8),
    remindersOpen: openReminders.length,
  });
});

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(year!, month! - 1, day!);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}


export default router;
