import { PlotDetail } from "@/components/plot-detail";

export const dynamic = "force-dynamic";

export default async function PlotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlotDetail plotId={id} />;
}
