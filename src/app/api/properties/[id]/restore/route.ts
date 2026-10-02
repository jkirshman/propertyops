import { handlePropertyArchiveTransition } from "@/lib/properties/archive-route";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handlePropertyArchiveTransition(id, "restore");
}
