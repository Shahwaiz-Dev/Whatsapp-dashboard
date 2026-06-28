import { NextResponse } from "next/server";
import { getSheetsAuthStatus } from "@/lib/google-sheets";

export async function GET() {
  return NextResponse.json(getSheetsAuthStatus());
}
