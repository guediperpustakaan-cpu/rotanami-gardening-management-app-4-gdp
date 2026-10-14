/** Tipe data yang dipertukarkan antara API dan antarmuka (DTO). */

export type ApiError = { error: string; fields?: Record<string, string> };

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  timezone: string;
  activeFarmId: string | null;
};

export type FarmDto = {
  id: string;
  name: string;
  location: string | null;
  timezone: string;
  notes: string | null;
  isDemo: boolean;
  role: string;
  plotCount: number;
  createdAt: string;
};

export type PlotDto = {
  id: string;
  farmId: string;
  name: string;
  size: number | null;
  areaUnit: string;
  soilType: string | null;
  notes: string | null;
  createdAt: string;
  lastPlanting: {
    id: string;
    cropName: string;
    plantDate: string;
    harvestDate: string | null;
    status: string;
  } | null;
  counts: {
    plantings: number;
    soilTests: number;
    observations: number;
    openReminders: number;
  };
};

export type FamilyDto = {
  id: string;
  name: string;
  rotationGroup: string | null;
  description: string | null;
  isDemo: boolean;
  cropCount: number;
};

export type CropDto = {
  id: string;
  farmId: string | null;
  name: string;
  scientificName: string | null;
  familyId: string | null;
  familyName: string | null;
  rotationGroup: string | null;
  nutrientCategory: string | null;
  isCoverCrop: boolean;
  guideNotes: string | null;
  isDemo: boolean;
  /** true bila pengguna boleh mengubah/menghapus tanaman ini. */
  editable: boolean;
};

export type SeasonDto = {
  id: string;
  farmId: string;
  name: string;
  startDate: string;
  endDate: string;
  planCount: number;
  plantingCount: number;
};

export type PlantingDto = {
  id: string;
  plotId: string;
  plotName: string;
  cropId: string;
  cropName: string;
  cropScientificName: string | null;
  familyName: string | null;
  seasonId: string | null;
  seasonName: string | null;
  plantDate: string;
  harvestDate: string | null;
  status: string;
  yieldAmount: number | null;
  yieldUnit: string | null;
  notes: string | null;
};

export type SoilTestDto = {
  id: string;
  plotId: string;
  plotName: string;
  testDate: string;
  ph: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  organicMatter: number | null;
  unitLabel: string | null;
  method: string | null;
  source: string | null;
  notes: string | null;
};

export type ObservationDto = {
  id: string;
  plotId: string;
  plotName: string;
  plantingId: string | null;
  plantingLabel: string | null;
  category: string;
  observedAt: string;
  description: string;
};

export type RotationReason = {
  engineVersion: string;
  status: "cukup" | "kurang";
  confidence: "rendah" | "sedang";
  headline: string;
  reasons: string[];
  dataGaps: string[];
  disclaimer: string;
  alternatives?: { cropId: string; cropName: string; score: number; reasons: string[] }[];
  createdAt: string;
};

export type RotationPlanDto = {
  id: string;
  plotId: string;
  plotName: string;
  seasonId: string | null;
  seasonName: string | null;
  cropId: string;
  cropName: string;
  familyName: string | null;
  status: string;
  origin: string;
  targetPlantDate: string | null;
  notes: string | null;
  recommendationReason: RotationReason | null;
  createdAt: string;
};

export type ReminderDto = {
  id: string;
  farmId: string;
  plotId: string | null;
  plotName: string | null;
  plantingId: string | null;
  title: string;
  dueDate: string;
  kind: string;
  isDone: boolean;
  notes: string | null;
};

export type SuggestionItem = {
  crop: CropDto;
  score: number;
  reasons: string[];
  warnings: string[];
};

export type RotationSuggestionResult = {
  status: "cukup" | "kurang";
  headline: string;
  confidence: "rendah" | "sedang";
  primary: SuggestionItem | null;
  alternatives: SuggestionItem[];
  dataGaps: string[];
  usedData: string[];
  disclaimer: string;
  engineVersion: string;
};

export type DashboardDto = {
  farm: FarmDto | null;
  farms: FarmDto[];
  plotCount: number;
  plantingCount: number;
  plannedThisSeason: number;
  plantedPlots: number;
  pendingActions: number;
  plots: PlotDto[];
  season: SeasonDto | null;
  upcoming: {
    type: "rencana" | "pengingat" | "tanam" | "panen";
    id: string;
    title: string;
    date: string;
    plotName: string | null;
    isDone?: boolean;
  }[];
  remindersOpen: number;
};
