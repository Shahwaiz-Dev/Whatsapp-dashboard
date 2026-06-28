import type { Types } from "mongoose";

type PlainObject = Record<string, unknown>;

function isObjectId(value: unknown): value is Types.ObjectId {
  return (
    typeof value === "object" &&
    value !== null &&
    "_bsontype" in value &&
    (value as { _bsontype: string })._bsontype === "ObjectId"
  );
}

function toIdString(value: unknown): string {
  if (typeof value === "string") return value;
  if (isObjectId(value)) return value.toString();
  return String(value);
}

function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (isObjectId(value)) return value.toString();
  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === "object" && item !== null
        ? serializeDoc(item as PlainObject)
        : item
    );
  }
  if (typeof value === "object") {
    return serializeDoc(value as PlainObject);
  }
  return value;
}

export function serializeDoc<T extends PlainObject>(
  doc: T | null | undefined
): PlainObject | null {
  if (!doc) return null;

  const plain =
    typeof (doc as { toObject?: () => PlainObject }).toObject === "function"
      ? (doc as unknown as { toObject: () => PlainObject }).toObject()
      : { ...doc };

  const result: PlainObject = {};

  if (plain._id !== undefined) {
    result.id = toIdString(plain._id);
  }

  for (const [key, value] of Object.entries(plain)) {
    if (key === "_id" || key === "__v" || key === "memberIds") {
      continue;
    }
    result[key] = serializeValue(value);
  }

  return result;
}

export function serializeDocs<T extends PlainObject>(
  docs: T[]
): PlainObject[] {
  return docs
    .map((doc) => serializeDoc(doc))
    .filter((doc): doc is PlainObject => doc !== null);
}
