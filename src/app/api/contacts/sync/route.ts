import { NextResponse } from "next/server";
import { syncContactsFromSheet } from "@/lib/services/contacts";

export async function POST() {
  try {
    const summary = await syncContactsFromSheet();
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
