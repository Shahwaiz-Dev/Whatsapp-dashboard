import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const contactSchema = new Schema(
  {
    name: { type: String, default: null },
    phone: { type: String, required: true, unique: true },
    email: { type: String, default: null },
    sheetRowId: { type: String, default: null },
  },
  { timestamps: true }
);

contactSchema.index({ name: "text", phone: "text", email: "text" });

export type ContactDocument = InferSchemaType<typeof contactSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Contact: Model<ContactDocument> =
  mongoose.models.Contact ??
  mongoose.model<ContactDocument>("Contact", contactSchema);
