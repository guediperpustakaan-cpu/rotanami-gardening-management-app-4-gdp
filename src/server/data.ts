import { and, asc, count, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  crops,
  farmMembers,
  farms,
  observations,
  plantFamilies,
  plantings,
  plots,
  reminders,
  rotationPlans,
  seasons,
  soilTests,
} from "@/db/schema";
import type { Farm } from "@/db/schema";
import type {
  CropDto,
  FamilyDto,
  FarmDto,
  ObservationDto,
  PlantingDto,
  PlotDto,
  ReminderDto,
  RotationPlanDto,
  RotationReason,
  SeasonDto,
  SoilTestDto,
} from "@/lib/types";

const iso = (value: Date | string | null | undefined) =>
  value instanceof Date ? value.toISOString() : (value ?? null);

export async function getFarmDtos(userId: string): Promise<FarmDto[]> {
  const owned = await db.select({ farm: farms }).from(farms).where(eq(farms.ownerId, userId)).orderBy(asc(farms.name));
  const memberships = await db
    .select({ farm: farms, role: farmMembers.role })
    .from(farmMembers)
    .innerJoin(farms, eq(farms.id, farmMembers.farmId))
    .where(eq(farmMembers.userId, userId))
    .orderBy(asc(farms.name));

  const combined: { farm: Farm; role: string }[] = [
    ...owned.map((row) => ({ farm: row.farm, role: "pemilik" })),
    ...memberships
      .filter((row) => !owned.some((o) => o.farm.id === row.farm.id))
      .map((row) => ({ farm: row.farm, role: row.role })),
  ];

  const farmIds = combined.map((item) => item.farm.id);
  const plotCounts = farmIds.length
    ? await db.select({ farmId: plots.farmId, total: count() }).from(plots).where(inArray(plots.farmId, farmIds)).groupBy(plots.farmId)
    : [];

  return combined.map(({ farm, role }) => ({
    id: farm.id,
    name: farm.name,
    location: farm.location,
    timezone: farm.timezone,
    notes: farm.notes,
    isDemo: farm.isDemo,
    role,
    plotCount: plotCounts.find((row) => row.farmId === farm.id)?.total ?? 0,
    createdAt: iso(farm.createdAt) ?? "",
  }));
}

export async function getCropDtos(opts: {
  farmId: string | null;
  search?: string;
  familyId?: string | null;
  onlyMine?: boolean;
}): Promise<CropDto[]> {
  const conditions = [];
  if (opts.onlyMine && opts.farmId) conditions.push(eq(crops.farmId, opts.farmId));
  else if (opts.farmId) conditions.push(or(isNull(crops.farmId), eq(crops.farmId, opts.farmId)));
  else conditions.push(isNull(crops.farmId));
  if (opts.familyId) conditions.push(eq(crops.familyId, opts.familyId));

  const rows = await db
    .select({ crop: crops, family: plantFamilies })
    .from(crops)
    .leftJoin(plantFamilies, eq(plantFamilies.id, crops.familyId))
    .where(and(...conditions))
    .orderBy(asc(crops.name));

  const search = (opts.search ?? "").trim().toLowerCase();
  return rows
    .filter(({ crop }) => {
      if (!search) return true;
      return (
        crop.name.toLowerCase().includes(search) ||
        (crop.scientificName ?? "").toLowerCase().includes(search)
      );
    })
    .map(({ crop, family }) => ({
      id: crop.id,
      farmId: crop.farmId,
      name: crop.name,
      scientificName: crop.scientificName,
      familyId: crop.familyId,
      familyName: family?.name ?? null,
      rotationGroup: family?.rotationGroup ?? null,
      nutrientCategory: crop.nutrientCategory,
      isCoverCrop: crop.isCoverCrop,
      guideNotes: crop.guideNotes,
      isDemo: crop.isDemo,
      editable: !crop.isDemo && crop.farmId === opts.farmId,
    }));
}

export async function getFamilyDtos(): Promise<FamilyDto[]> {
  const rows = await db
    .select({ family: plantFamilies, total: count(crops.id) })
    .from(plantFamilies)
    .leftJoin(crops, eq(crops.familyId, plantFamilies.id))
    .groupBy(plantFamilies.id)
    .orderBy(asc(plantFamilies.name));
  return rows.map(({ family, total }) => ({
    id: family.id,
    name: family.name,
    rotationGroup: family.rotationGroup,
    description: family.description,
    isDemo: family.isDemo,
    cropCount: total,
  }));
}

export async function getPlotDtos(farmId: string): Promise<PlotDto[]> {
  const plotRows = await db.query.plots.findMany({ where: eq(plots.farmId, farmId), orderBy: asc(plots.name) });
  if (plotRows.length === 0) return [];
  const ids = plotRows.map((p) => p.id);

  const plantingRows = await db
    .select({
      id: plantings.id,
      plotId: plantings.plotId,
      cropName: crops.name,
      plantDate: plantings.plantDate,
      harvestDate: plantings.harvestDate,
      status: plantings.status,
    })
    .from(plantings)
    .innerJoin(crops, eq(crops.id, plantings.cropId))
    .where(inArray(plantings.plotId, ids))
    .orderBy(desc(plantings.plantDate));

  const soilCounts = await db
    .select({ plotId: soilTests.plotId, total: count() })
    .from(soilTests)
    .where(inArray(soilTests.plotId, ids))
    .groupBy(soilTests.plotId);

  const obsCounts = await db
    .select({ plotId: observations.plotId, total: count() })
    .from(observations)
    .where(inArray(observations.plotId, ids))
    .groupBy(observations.plotId);

  const openReminders = await db
    .select({ plotId: reminders.plotId, total: count() })
    .from(reminders)
    .where(and(inArray(reminders.plotId, ids), eq(reminders.isDone, false)))
    .groupBy(reminders.plotId);

  return plotRows.map((plot) => {
    const plotPlantings = plantingRows.filter((p) => p.plotId === plot.id);
    return {
      id: plot.id,
      farmId: plot.farmId,
      name: plot.name,
      size: plot.size,
      areaUnit: plot.areaUnit,
      soilType: plot.soilType,
      notes: plot.notes,
      createdAt: iso(plot.createdAt) ?? "",
      lastPlanting: plotPlantings[0]
        ? {
            id: plotPlantings[0].id,
            cropName: plotPlantings[0].cropName,
            plantDate: plotPlantings[0].plantDate,
            harvestDate: plotPlantings[0].harvestDate,
            status: plotPlantings[0].status,
          }
        : null,
      counts: {
        plantings: plotPlantings.length,
        soilTests: soilCounts.find((row) => row.plotId === plot.id)?.total ?? 0,
        observations: obsCounts.find((row) => row.plotId === plot.id)?.total ?? 0,
        openReminders: openReminders.find((row) => row.plotId === plot.id)?.total ?? 0,
      },
    };
  });
}

export async function getSeasonDtos(farmId: string): Promise<SeasonDto[]> {
  const rows = await db.query.seasons.findMany({
    where: eq(seasons.farmId, farmId),
    orderBy: desc(seasons.startDate),
  });
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const planCounts = await db
    .select({ seasonId: rotationPlans.seasonId, total: count() })
    .from(rotationPlans)
    .where(inArray(rotationPlans.seasonId, ids))
    .groupBy(rotationPlans.seasonId);
  const plantingCounts = await db
    .select({ seasonId: plantings.seasonId, total: count() })
    .from(plantings)
    .where(inArray(plantings.seasonId, ids))
    .groupBy(plantings.seasonId);
  return rows.map((row) => ({
    id: row.id,
    farmId: row.farmId,
    name: row.name,
    startDate: row.startDate,
    endDate: row.endDate,
    planCount: planCounts.find((c) => c.seasonId === row.id)?.total ?? 0,
    plantingCount: plantingCounts.find((c) => c.seasonId === row.id)?.total ?? 0,
  }));
}

export async function getPlantingDtos(filter: { farmId?: string; plotId?: string }): Promise<PlantingDto[]> {
  const conditions = [];
  if (filter.plotId) conditions.push(eq(plantings.plotId, filter.plotId));
  if (filter.farmId) conditions.push(eq(plots.farmId, filter.farmId));

  const rows = await db
    .select({
      planting: plantings,
      plotName: plots.name,
      cropName: crops.name,
      cropScientificName: crops.scientificName,
      familyName: plantFamilies.name,
      seasonName: seasons.name,
    })
    .from(plantings)
    .innerJoin(plots, eq(plots.id, plantings.plotId))
    .innerJoin(crops, eq(crops.id, plantings.cropId))
    .leftJoin(plantFamilies, eq(plantFamilies.id, crops.familyId))
    .leftJoin(seasons, eq(seasons.id, plantings.seasonId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(plantings.plantDate), desc(plantings.createdAt));

  return rows.map(({ planting, plotName, cropName, cropScientificName, familyName, seasonName }) => ({
    id: planting.id,
    plotId: planting.plotId,
    plotName,
    cropId: planting.cropId,
    cropName,
    cropScientificName,
    familyName,
    seasonId: planting.seasonId,
    seasonName,
    plantDate: planting.plantDate,
    harvestDate: planting.harvestDate,
    status: planting.status,
    yieldAmount: planting.yieldAmount,
    yieldUnit: planting.yieldUnit,
    notes: planting.notes,
  }));
}

export async function getSoilTestDtos(filter: { farmId?: string; plotId?: string }): Promise<SoilTestDto[]> {
  const conditions = [];
  if (filter.plotId) conditions.push(eq(soilTests.plotId, filter.plotId));
  if (filter.farmId) conditions.push(eq(plots.farmId, filter.farmId));

  const rows = await db
    .select({ test: soilTests, plotName: plots.name })
    .from(soilTests)
    .innerJoin(plots, eq(plots.id, soilTests.plotId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(soilTests.testDate));

  return rows.map(({ test, plotName }) => ({
    id: test.id,
    plotId: test.plotId,
    plotName,
    testDate: test.testDate,
    ph: test.ph,
    nitrogen: test.nitrogen,
    phosphorus: test.phosphorus,
    potassium: test.potassium,
    organicMatter: test.organicMatter,
    unitLabel: test.unitLabel,
    method: test.method,
    source: test.source,
    notes: test.notes,
  }));
}

export async function getObservationDtos(filter: { farmId?: string; plotId?: string }): Promise<ObservationDto[]> {
  const conditions = [];
  if (filter.plotId) conditions.push(eq(observations.plotId, filter.plotId));
  if (filter.farmId) conditions.push(eq(plots.farmId, filter.farmId));

  const rows = await db
    .select({
      observation: observations,
      plotName: plots.name,
      cropName: crops.name,
      plantDate: plantings.plantDate,
    })
    .from(observations)
    .innerJoin(plots, eq(plots.id, observations.plotId))
    .leftJoin(plantings, eq(plantings.id, observations.plantingId))
    .leftJoin(crops, eq(crops.id, plantings.cropId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(observations.observedAt));

  return rows.map(({ observation, plotName, cropName, plantDate }) => ({
    id: observation.id,
    plotId: observation.plotId,
    plotName,
    plantingId: observation.plantingId,
    plantingLabel: cropName ? `${cropName} · tanam ${plantDate}` : null,
    category: observation.category,
    observedAt: observation.observedAt,
    description: observation.description,
  }));
}

export async function getRotationPlanDtos(farmId: string): Promise<RotationPlanDto[]> {
  const rows = await db
    .select({
      plan: rotationPlans,
      plotName: plots.name,
      cropName: crops.name,
      familyName: plantFamilies.name,
      seasonName: seasons.name,
    })
    .from(rotationPlans)
    .innerJoin(plots, eq(plots.id, rotationPlans.plotId))
    .innerJoin(crops, eq(crops.id, rotationPlans.cropId))
    .leftJoin(plantFamilies, eq(plantFamilies.id, crops.familyId))
    .leftJoin(seasons, eq(seasons.id, rotationPlans.seasonId))
    .where(eq(plots.farmId, farmId))
    .orderBy(desc(rotationPlans.createdAt));

  return rows.map(({ plan, plotName, cropName, familyName, seasonName }) => ({
    id: plan.id,
    plotId: plan.plotId,
    plotName,
    seasonId: plan.seasonId,
    seasonName,
    cropId: plan.cropId,
    cropName,
    familyName,
    status: plan.status,
    origin: plan.origin,
    targetPlantDate: plan.targetPlantDate,
    notes: plan.notes,
    recommendationReason: (plan.recommendationReason as RotationReason | null) ?? null,
    createdAt: iso(plan.createdAt) ?? "",
  }));
}

export async function getReminderDtos(farmId: string): Promise<ReminderDto[]> {
  const rows = await db
    .select({ reminder: reminders, plotName: plots.name })
    .from(reminders)
    .leftJoin(plots, eq(plots.id, reminders.plotId))
    .where(eq(reminders.farmId, farmId))
    .orderBy(asc(reminders.dueDate));

  return rows.map(({ reminder, plotName }) => ({
    id: reminder.id,
    farmId: reminder.farmId,
    plotId: reminder.plotId,
    plotName,
    plantingId: reminder.plantingId,
    title: reminder.title,
    dueDate: reminder.dueDate,
    kind: reminder.kind,
    isDone: reminder.isDone,
    notes: reminder.notes,
  }));
}
