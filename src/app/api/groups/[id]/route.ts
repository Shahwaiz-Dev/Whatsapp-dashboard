import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Group } from "@/lib/models";
import { serializeGroup, toObjectIds } from "@/lib/groups";

const updateMembersSchema = z.object({
  add: z.array(z.string()).optional(),
  remove: z.array(z.string()).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params;
  const group = await Group.findById(id).lean();

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  return NextResponse.json(await serializeGroup(group));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params;
  const body = await request.json();
  const parsed = updateMembersSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { add = [], remove = [] } = parsed.data;
  const update: Record<string, unknown> = {};

  if (remove.length > 0) {
    update.$pull = { memberIds: { $in: toObjectIds(remove) } };
  }

  if (add.length > 0) {
    update.$addToSet = { memberIds: { $each: toObjectIds(add) } };
  }

  if (Object.keys(update).length > 0) {
    await Group.updateOne({ _id: id }, update);
  }

  const group = await Group.findById(id).lean();
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  return NextResponse.json(await serializeGroup(group));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params;
  await Group.deleteOne({ _id: id });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params;
  const { name, description } = (await request.json()) as {
    name?: string;
    description?: string;
  };

  const update: Record<string, string | null> = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;

  const group = await Group.findByIdAndUpdate(id, update, {
    new: true,
  }).lean();

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  return NextResponse.json(await serializeGroup(group));
}
