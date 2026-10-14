import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { crops, observations, plantFamilies, plantings, plots, soilTests } from "@/db/schema";
import { suggestRotation, type EngineCrop, type EngineInput, type NutrientCategory } from "@/lib/rotation/engine";
import type { CropDto, RotationSuggestionResult, SuggestionItem } from "@/lib/types";
import { HttpError } from "./http";
import { getCropDtos } from "./data";

const NUTRIENT_VALUES: NutrientCategory[] = ["berat", "sedang", "ringan", "pemulih"];

function asNutrient(value: string | null): NutrientCategory | null {
  return NUTRIENT_VALUES.includes(value as NutrientCategory) ? (value as NutrientCategory) : null;
}

/**
 * Mengumpulkan bahan masukan mesin aturan dari data yang benar-benar tersimpan.
 * Tidak ada nilai yang dikarang: kolom yang kosong tetap kosong.
 */
export async function buildEngineInputForPlot(plotId: string): Promise<EngineInput & { cropDtos: CropDto[] }> {
  const plot = await db.query.plots.findFirst({ where: eq(plots.id, plotId) });
  if (!plot) throw new HttpError(404, "Petak tidak ditemukan.");

  const cropDtos = await getCropDtos({ farmId: plot.farmId });
  const engineCrops: EngineCrop[] = cropDtos.map((crop) => ({
    id: crop.id,
    name: crop.name,
    familyName: crop.familyName,
    rotationGroup: crop.rotationGroup,
    nutrientCategory: asNutrient(crop.nutrientCategory),
    isCoverCrop: crop.isCoverCrop,
  }));

  const historyRows = await db
    .select({
      cropName: crops.name,
      familyName: plantFamilies.name,
      rotationGroup: plantFamilies.rotationGroup,
      nutrientCategory: crops.nutrientCategory,
      isCoverCrop: crops.isCoverCrop,
      plantDate: plantings.plantDate,
      status: plantings.status,
    })
    .from(plantings)
    .innerJoin(crops, eq(crops.id, plantings.cropId))
    .leftJoin(plantFamilies, eq(plantFamilies.id, crops.familyId))
    .where(eq(plantings.plotId, plotId));

  const issueRows = await db
    .select({
      category: observations.category,
      description: observations.description,
      observedAt: observations.observedAt,
      cropName: crops.name,
      familyName: plantFamilies.name,
      rotationGroup: plantFamilies.rotationGroup,
    })
    .from(observations)
    .leftJoin(plantings, eq(plantings.id, observations.plantingId))
    .leftJoin(crops, eq(crops.id, plantings.cropId))
    .leftJoin(plantFamilies, eq(plantFamilies.id, crops.familyId))
    .where(and(eq(observations.plotId, plotId), inArray(observations.category, ["hama", "penyakit"])));

  const lastTest = await db.query.soilTests.findFirst({
    where: eq(soilTests.plotId, plotId),
    orderBy: desc(soilTests.testDate),
  });

  return {
    cropDtos,
    crops: engineCrops,
    history: historyRows.map((row) => ({
      cropName: row.cropName,
      familyName: row.familyName,
      rotationGroup: row.rotationGroup,
      nutrientCategory: asNutrient(row.nutrientCategory),
      isCoverCrop: row.isCoverCrop,
      plantDate: row.plantDate,
      status: row.status as EngineInput["history"][number]["status"],
    })),
    issues: issueRows.map((row) => ({
      category: row.category as "hama" | "penyakit",
      description: row.description,
      observedAt: row.observedAt,
      cropName: row.cropName,
      familyName: row.familyName,
      rotationGroup: row.rotationGroup,
    })),
    lastSoilTest: lastTest
      ? { testDate: lastTest.testDate, ph: lastTest.ph, organicMatter: lastTest.organicMatter }
      : null,
  };
}

export async function hitungSaranRotasi(plotId: string): Promise<RotationSuggestionResult> {
  const input = await buildEngineInputForPlot(plotId);
  const result = suggestRotation(input);
  const byId = new Map(input.cropDtos.map((crop) => [crop.id, crop]));

  const toItem = (suggestion: { cropId: string; score: number; reasons: string[]; warnings: string[] }): SuggestionItem | null => {
    const crop = byId.get(suggestion.cropId);
    if (!crop) return null;
    return { crop, score: suggestion.score, reasons: suggestion.reasons, warnings: suggestion.warnings };
  };

  return {
    status: result.status,
    headline: result.headline,
    confidence: result.confidence,
    primary: result.primary ? toItem(result.primary) : null,
    alternatives: result.alternatives.map(toItem).filter((item): item is SuggestionItem => Boolean(item)),
    dataGaps: result.dataGaps,
    usedData: result.usedData,
    disclaimer: result.disclaimer,
    engineVersion: result.engineVersion,
  };
}
