import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Contact, SyncLog } from "@/lib/models";
import { fetchContactsFromSheet } from "@/lib/google-sheets";

export interface SyncSummary {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
}

const BULK_CHUNK_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function syncContactsFromSheet(): Promise<SyncSummary> {
  await connectDB();

  const { contacts, errors } = await fetchContactsFromSheet();

  const existing = await Contact.find(
    {},
    { phone: 1, name: 1, email: 1, sheetRowId: 1 }
  ).lean();
  const existingByPhone = new Map(
    existing.map((contact) => [contact.phone, contact])
  );

  const bulkOps: mongoose.mongo.AnyBulkWriteOperation[] = [];
  let skipped = 0;

  for (const row of contacts) {
    const match = existingByPhone.get(row.phone);

    if (!match) {
      bulkOps.push({
        updateOne: {
          filter: { phone: row.phone },
          update: {
            $setOnInsert: {
              name: row.name,
              phone: row.phone,
              email: row.email,
              sheetRowId: row.sheetRowId,
            },
          },
          upsert: true,
        },
      });
      continue;
    }

    const hasChanges =
      match.name !== row.name ||
      match.email !== row.email ||
      match.sheetRowId !== row.sheetRowId;

    if (hasChanges) {
      bulkOps.push({
        updateOne: {
          filter: { phone: row.phone },
          update: {
            $set: {
              name: row.name,
              email: row.email,
              sheetRowId: row.sheetRowId,
            },
          },
        },
      });
    } else {
      skipped++;
    }
  }

  let added = 0;
  let updated = 0;

  for (const batch of chunk(bulkOps, BULK_CHUNK_SIZE)) {
    if (batch.length === 0) continue;

    const result = await Contact.bulkWrite(batch, { ordered: false });
    added += result.upsertedCount ?? 0;
    updated += result.modifiedCount ?? 0;
  }

  await SyncLog.create({
    added,
    updated,
    skipped,
    syncErrors: errors.length ? JSON.stringify(errors) : null,
  });

  return { added, updated, skipped, errors };
}

export async function getLastSyncLog() {
  await connectDB();
  return SyncLog.findOne().sort({ createdAt: -1 }).lean();
}
