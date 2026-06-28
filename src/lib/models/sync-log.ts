import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const syncLogSchema = new Schema({
  added: { type: Number, default: 0 },
  updated: { type: Number, default: 0 },
  skipped: { type: Number, default: 0 },
  syncErrors: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

syncLogSchema.index({ createdAt: -1 });

export type SyncLogDocument = InferSchemaType<typeof syncLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SyncLog: Model<SyncLogDocument> =
  mongoose.models.SyncLog ??
  mongoose.model<SyncLogDocument>("SyncLog", syncLogSchema);
