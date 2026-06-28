import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const conversationSchema = new Schema(
  {
    contactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
      unique: true,
    },
    lastMessageAt: { type: Date, default: null },
    unreadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

conversationSchema.index({ lastMessageAt: -1 });

export type ConversationDocument = InferSchemaType<typeof conversationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Conversation: Model<ConversationDocument> =
  mongoose.models.Conversation ??
  mongoose.model<ConversationDocument>("Conversation", conversationSchema);
