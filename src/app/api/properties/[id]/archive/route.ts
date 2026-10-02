import { handlePropertyArchivePreview, handlePropertyArchiveTransition } from "@/lib/properties/archive-route";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handlePropertyArchivePreview(id);
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handlePropertyArchiveTransition(id, "archive");
}
