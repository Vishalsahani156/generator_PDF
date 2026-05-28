import mongoose from "mongoose";
import { z } from "zod";

export const objectIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "Id is required")
    .refine((id) => mongoose.isValidObjectId(id), "Invalid id")
});
