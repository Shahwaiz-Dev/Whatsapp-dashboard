import { NextResponse } from "next/server";
import { getLastSyncLog } from "@/lib/services/contacts";
import { getDashboardStats } from "@/lib/services/conversations";
import { serializeDoc } from "@/lib/serialize";

export async function GET() {
  const [stats, lastSync] = await Promise.all([
    getDashboardStats(),
    getLastSyncLog(),
  ]);

  return NextResponse.json({
    ...stats,
    lastSync: lastSync
      ? serializeDoc(lastSync as Record<string, unknown>)
      : null,
  });
}
