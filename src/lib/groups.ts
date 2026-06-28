import mongoose from "mongoose";
import { Contact } from "@/lib/models";
import { serializeDoc } from "@/lib/serialize";

type GroupLean = {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string | null;
  memberIds: mongoose.Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
};

type ContactLean = {
  _id: mongoose.Types.ObjectId;
  name: string | null;
  phone: string;
};

export async function serializeGroup(group: GroupLean) {
  const memberIds = group.memberIds ?? [];
  const contacts =
    memberIds.length > 0
      ? await Contact.find({ _id: { $in: memberIds } })
          .select({ name: 1, phone: 1 })
          .lean<ContactLean[]>()
      : [];

  const contactById = new Map(
    contacts.map((contact) => [contact._id.toString(), contact])
  );

  const members = memberIds
    .map((memberId) => {
      const contact = contactById.get(memberId.toString());
      if (!contact) return null;
      return {
        contact: {
          id: contact._id.toString(),
          name: contact.name,
          phone: contact.phone,
        },
      };
    })
    .filter((member): member is NonNullable<typeof member> => member !== null);

  const base = serializeDoc(group as Record<string, unknown>);

  return {
    ...base,
    members,
    _count: { members: members.length },
  };
}

export async function serializeGroups(groups: GroupLean[]) {
  return Promise.all(groups.map((group) => serializeGroup(group)));
}

export function toObjectIds(ids: string[]): mongoose.Types.ObjectId[] {
  return ids.map((id) => new mongoose.Types.ObjectId(id));
}
