import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { authRateLimiter, apiRateLimiter } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/errorHandler";
import { authRoutes } from "./routes/auth.routes";
import { pdfRoutes } from "./routes/pdf.routes";
import { eventsRoutes } from "./modules/events/events.routes";
import { voiceRoutes } from "./modules/voice/voice.routes";
import { superAdminAuthRoutes } from "./routes/superAdminAuth.routes";
import { superAdminUsersRoutes } from "./routes/superAdminUsers.routes";

export const app = express();

app.use(helmet());

const corsOrigins = env.CORS_ORIGIN.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length > 1 ? corsOrigins : corsOrigins[0] || true,
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));

// API routes
app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/super-admin/auth", authRateLimiter, superAdminAuthRoutes);
app.use("/api/super-admin/users", apiRateLimiter, superAdminUsersRoutes);
app.use("/api/pdfs", apiRateLimiter, pdfRoutes);
app.use("/api/events", apiRateLimiter, eventsRoutes);
app.use("/api/voice", apiRateLimiter, voiceRoutes);

// Health check
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.use(errorHandler);

