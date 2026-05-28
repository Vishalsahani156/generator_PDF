import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireNotBlocked } from "../middleware/requireNotBlocked";
import {
  createRecord,
  deleteRecord,
  getDashboard,
  getRecordById,
  downloadById,
  generatePreview,
  listRecords,
  updateRecord
} from "../controllers/pdf.controller";

export const pdfRoutes = Router();

pdfRoutes.use(requireAuth, requireNotBlocked);

pdfRoutes.post("/generate", generatePreview);
pdfRoutes.post("/", createRecord);

pdfRoutes.get("/dashboard", getDashboard);
pdfRoutes.get("/", listRecords);
pdfRoutes.get("/:id", getRecordById);
pdfRoutes.put("/:id", updateRecord);
pdfRoutes.delete("/:id", deleteRecord);

pdfRoutes.get("/download/:id", downloadById);

