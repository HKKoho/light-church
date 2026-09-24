import express from "express";
import { createWebhookRouter } from "./scheduler/webhook-handler";

const PORT = process.env.LAYER3_PORT || 3002;

const app = express();
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", layer: 3, service: "client-reporting" });
});

// Webhook endpoint for Layer 2 triggers
app.use(createWebhookRouter());

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`[Layer3] Client reporting service running on http://localhost:${PORT}`);
});
