import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const messageSchema = new Schema({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
  },
  contactId: {
    type: Schema.Types.ObjectId,
    ref: "Contact",
    required: true,
  },
  direction: { type: String, required: true },
  body: { type: String, required: true },
  waMessageId: { type: String, default: null, sparse: true, unique: true },
  status: { type: String, default: "queued" },
  sentAt: { type: Date, default: Date.now },
});

messageSchema.index({ conversationId: 1, sentAt: 1 });
messageSchema.index({ contactId: 1, direction: 1, sentAt: -1 });

export type MessageDocument = InferSchemaType<typeof messageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Message: Model<MessageDocument> =
  mongoose.models.Message ??
  mongoose.model<MessageDocument>("Message", messageSchema);
