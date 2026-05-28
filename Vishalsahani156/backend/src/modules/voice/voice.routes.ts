import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/auth";
import { requireNotBlocked } from "../../middleware/requireNotBlocked";
import { analyzeVoice, audioToEvent, bookEventFromAudio, deepgramHealth } from "./voice.controller";

const AUDIO_EXTENSIONS = /\.(webm|ogg|opus|mp3|mpeg|wav|wave|m4a|mp4|aac|flac|amr|3gp)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024 // 8MB
  },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || "").toLowerCase();
    const name = String(file.originalname || "").toLowerCase();
    const mimeOk = mime.startsWith("audio/") || mime === "video/mp4" || mime === "application/octet-stream";
    const extOk = AUDIO_EXTENSIONS.test(name);
    if (mimeOk || extOk) {
      cb(null, true);
      return;
    }
    cb(new Error("Only audio files are allowed (MP3, WAV, M4A, OGG, WebM, MP4)"));
  }
});

export const voiceRoutes = Router();

voiceRoutes.get(
  "/deepgram/health",
  requireAuth as any,
  requireNotBlocked as any,
  deepgramHealth as any
);

// Type-cast to avoid @types/express duplication mismatch across repo.
voiceRoutes.post(
  "/analyze",
  requireAuth as any,
  requireNotBlocked as any,
  upload.single("audio") as any,
  analyzeVoice as any
);

voiceRoutes.post(
  "/audio-to-event",
  requireAuth as any,
  requireNotBlocked as any,
  upload.single("audio") as any,
  audioToEvent as any
);

// Voice → Extract → Book (creates an event record for the user)
voiceRoutes.post(
  "/book-event",
  requireAuth as any,
  requireNotBlocked as any,
  upload.single("audio") as any,
  bookEventFromAudio as any
);

