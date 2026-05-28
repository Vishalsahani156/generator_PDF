import { z } from "zod";
import {
  NOT_FOUND_RECORD_MESSAGE,
  SHEET_CATEGORIES,
  type SheetCategory,
  matchAllowedSheetCategory
} from "../constants/sheetCategories";
import { AppError } from "./AppError";

export const sheetCategorySchema = z.enum(SHEET_CATEGORIES);

export function categoryNotFoundError(): AppError {
  return new AppError(NOT_FOUND_RECORD_MESSAGE, 404);
}

export function assertAllowedCategoryFilter(category: string): void {
  if (!matchAllowedSheetCategory(category)) {
    throw categoryNotFoundError();
  }
}

export function assertRecordHasAllowedCategory(value?: string | null): void {
  if (!matchAllowedSheetCategory(value ?? "")) {
    throw categoryNotFoundError();
  }
}

export function allowedCategoriesFilter() {
  return { sheetCategory: { $in: [...SHEET_CATEGORIES] } };
}

export function recordNotFoundError(): AppError {
  return new AppError("Record not found", 404);
}

/** Map free-text voice/Gemini categories to an allowed sheet category. */
export function resolveSheetCategoryFromVoice(raw: string): SheetCategory {
  const matched = matchAllowedSheetCategory(raw);
  if (matched) return matched;

  const lower = raw.trim().toLowerCase();
  if (/invoice|bill|receipt/.test(lower)) return "Invoice";
  if (/pass|ticket|entry/.test(lower)) return "Event Pass";
  if (/resume|cv/.test(lower)) return "Resume";
  if (/cert/.test(lower)) return "Certificate";
  if (/report|summary/.test(lower)) return "Report";

  return "Custom Sheet";
}
