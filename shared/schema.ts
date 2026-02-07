import { z } from "zod";

export const sessionStatusEnum = ["pending", "connecting", "connected", "failed", "terminated"] as const;
export type SessionStatus = typeof sessionStatusEnum[number];

export interface Session {
  id: string;
  sessionId: string;
  pairingCode: string | null;
  qrCode: string | null;
  status: SessionStatus;
  connectionMethod: "pairing" | "qr";
  createdAt: string;
  linkedAt: string | null;
  credentialsBase64: string | null;
}

export interface CreateSessionRequest {
  method: "pairing" | "qr";
  phoneNumber?: string;
}

export const createSessionSchema = z.object({
  method: z.enum(["pairing", "qr"]),
  phoneNumber: z.string().optional(),
});

export interface PairingVerifyRequest {
  sessionId: string;
  code: string;
}

export const pairingVerifySchema = z.object({
  sessionId: z.string(),
  code: z.string().length(8),
});

export interface SessionResponse {
  sessionId: string;
  pairingCode?: string;
  qrCode?: string;
  status: SessionStatus;
  message: string;
}

export interface VerifyResponse {
  status: SessionStatus;
  sessionId: string;
  credentialsBase64?: string;
  message: string;
}

export type User = { id: string; username: string; password: string };
export type InsertUser = { username: string; password: string };
