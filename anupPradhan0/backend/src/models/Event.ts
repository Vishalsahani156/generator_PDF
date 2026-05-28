import { Schema, model, InferSchemaType, HydratedDocument, Types } from 'mongoose';

const eventSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    datetime: { type: Date, required: true },
    number: { type: Number, required: true },
    location: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

eventSchema.index({ user: 1, datetime: 1 });

export type EventDoc = HydratedDocument<InferSchemaType<typeof eventSchema>>;
export type EventLean = InferSchemaType<typeof eventSchema> & { _id: Types.ObjectId };
export const Event = model('Event', eventSchema);
