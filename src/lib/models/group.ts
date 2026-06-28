import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const groupSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    memberIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Contact" }],
      default: [],
    },
  },
  { timestamps: true }
);

export type GroupDocument = InferSchemaType<typeof groupSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Group: Model<GroupDocument> =
  mongoose.models.Group ?? mongoose.model<GroupDocument>("Group", groupSchema);
