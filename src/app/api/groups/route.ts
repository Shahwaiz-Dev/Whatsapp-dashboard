import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Group } from "@/lib/models";
import { serializeGroup, serializeGroups, toObjectIds } from "@/lib/groups";

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  memberIds: z.array(z.string()).optional(),
});

export async function GET() {
  await connectDB();

  const groups = await Group.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(await serializeGroups(groups));
}

export async function POST(request: NextRequest) {
  await connectDB();

  const body = await request.json();
  const parsed = createGroupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, description, memberIds = [] } = parsed.data;

  const group = await Group.create({
    name,
    description: description ?? null,
    memberIds: memberIds.length > 0 ? toObjectIds(memberIds) : [],
  });

  return NextResponse.json(await serializeGroup(group.toObject()), {
    status: 201,
  });
}
