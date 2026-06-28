import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Contact, Group } from "@/lib/models";
import { batchCanSendSessionMessage } from "@/lib/services/conversations";
import { serializeDoc } from "@/lib/serialize";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function buildSearchFilter(search: string) {
  if (!search) return {};
  const regex = { $regex: search, $options: "i" };
  return {
    $or: [{ name: regex }, { phone: regex }, { email: regex }],
  };
}

async function attachGroupCounts(
  contacts: Array<{ _id: { toString(): string } } & Record<string, unknown>>
) {
  const counts = await Group.aggregate<{ _id: string; count: number }>([
    { $unwind: "$memberIds" },
    {
      $match: {
        memberIds: {
          $in: contacts.map((c) => c._id),
        },
      },
    },
    { $group: { _id: "$memberIds", count: { $sum: 1 } } },
  ]);

  const countByContact = new Map(
    counts.map((entry) => [entry._id.toString(), entry.count])
  );

  return contacts.map((contact) => {
    const serialized = serializeDoc(contact as Record<string, unknown>);
    return {
      ...serialized,
      id: contact._id.toString(),
      _count: {
        groups: countByContact.get(contact._id.toString()) ?? 0,
      },
    };
  });
}

export async function GET(request: NextRequest) {
  await connectDB();

  const params = request.nextUrl.searchParams;
  const search = params.get("search")?.trim() ?? "";
  const idsParam = params.get("ids")?.trim();
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      parseInt(params.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) ||
        DEFAULT_PAGE_SIZE
    )
  );

  if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    const contacts = await Contact.find({ _id: { $in: ids } }).lean();
    const canReplyMap = await batchCanSendSessionMessage(ids);
    const items = (await attachGroupCounts(contacts)).map((contact) => ({
      ...contact,
      canReply: canReplyMap.get(String(contact.id)) ?? false,
    }));

    return NextResponse.json({
      contacts: items,
      total: items.length,
      page: 1,
      pageSize: items.length,
      totalPages: 1,
    });
  }

  const filter = buildSearchFilter(search);

  const [total, contacts] = await Promise.all([
    Contact.countDocuments(filter),
    Contact.find(filter)
      .sort({ name: 1, phone: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);

  const contactIds = contacts.map((c) => c._id.toString());
  const canReplyMap = await batchCanSendSessionMessage(contactIds);
  const items = (await attachGroupCounts(contacts)).map((contact) => ({
    ...contact,
    canReply: canReplyMap.get(contact.id as string) ?? false,
  }));

  return NextResponse.json({
    contacts: items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
