import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createSessionSchema, pairingVerifySchema } from "@shared/schema";
import QRCode from "qrcode";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/generate-session", async (req, res) => {
    try {
      const parsed = createSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }

      const { method, phoneNumber } = parsed.data;
      const session = await storage.createSession(method, phoneNumber);

      let qrCode: string | null = null;
      if (method === "qr") {
        const qrData = JSON.stringify({
          sessionId: session.sessionId,
          type: "wolfbot-link",
          ts: Date.now(),
        });
        qrCode = await QRCode.toDataURL(qrData, {
          width: 256,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
      }

      // Simulate auto-connection after a delay for QR method
      if (method === "qr") {
        setTimeout(async () => {
          const s = await storage.getSession(session.sessionId);
          if (s && s.status === "pending") {
            await storage.updateSessionStatus(session.sessionId, "connecting");
            setTimeout(async () => {
              const s2 = await storage.getSession(session.sessionId);
              if (s2 && s2.status === "connecting") {
                await storage.updateSessionStatus(session.sessionId, "connected");
              }
            }, 5000);
          }
        }, 8000);
      }

      return res.json({
        sessionId: session.sessionId,
        pairingCode: session.pairingCode,
        qrCode,
        status: session.status,
        message: method === "pairing"
          ? "Pairing code generated. Enter it in WhatsApp > Linked Devices."
          : "QR code generated. Scan with WhatsApp to link.",
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.post("/api/verify-pairing", async (req, res) => {
    try {
      const parsed = pairingVerifySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }

      const { sessionId, code } = parsed.data;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.pairingCode === code) {
        await storage.updateSessionStatus(sessionId, "connecting");

        // Simulate connection completing after a short delay
        setTimeout(async () => {
          const s = await storage.getSession(sessionId);
          if (s && s.status === "connecting") {
            await storage.updateSessionStatus(sessionId, "connected");
          }
        }, 3000);

        return res.json({
          status: "connecting",
          sessionId,
          message: "Code verified. Connecting to WhatsApp...",
        });
      } else {
        return res.json({
          status: "failed",
          sessionId,
          message: "Invalid pairing code. Please try again.",
        });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.get("/api/session/:sessionId/status", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      return res.json({
        status: session.status,
        sessionId: session.sessionId,
        credentialsBase64: session.credentialsBase64,
        message: getStatusMessage(session.status),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.post("/api/terminate-session", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      const deleted = await storage.terminateSession(sessionId);
      if (!deleted) {
        return res.status(404).json({ error: "Session not found" });
      }

      return res.json({ success: true, message: "Session terminated and cleanup complete" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.get("/api/sessions", async (_req, res) => {
    try {
      const sessions = await storage.getAllSessions();
      return res.json(sessions);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  return httpServer;
}

function getStatusMessage(status: string): string {
  switch (status) {
    case "pending": return "Waiting for connection...";
    case "connecting": return "Establishing WhatsApp link...";
    case "connected": return "Successfully connected to WhatsApp";
    case "failed": return "Connection failed. Please try again.";
    case "terminated": return "Session has been terminated.";
    default: return "Unknown status";
  }
}
