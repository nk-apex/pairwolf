import { randomUUID, randomBytes } from "crypto";
import type { Session, SessionStatus } from "@shared/schema";

export interface IStorage {
  createSession(method: "pairing" | "qr", phoneNumber?: string): Promise<Session>;
  getSession(sessionId: string): Promise<Session | undefined>;
  updateSessionStatus(sessionId: string, status: SessionStatus): Promise<Session | undefined>;
  updateSessionCredentials(sessionId: string, credentials: string): Promise<Session | undefined>;
  terminateSession(sessionId: string): Promise<boolean>;
  getAllSessions(): Promise<Session[]>;
}

function generatePairingCode(): string {
  const digits = Math.floor(10000000 + Math.random() * 90000000);
  return digits.toString();
}

function generateSessionId(): string {
  const hex = randomBytes(4).toString("hex");
  return `wolf_${hex}`;
}

function generateCredentials(sessionId: string): string {
  const payload = JSON.stringify({
    sessionId,
    ts: Date.now(),
    key: randomBytes(16).toString("hex"),
    device: "multi",
  });
  return Buffer.from(payload).toString("base64");
}

export class MemStorage implements IStorage {
  private sessions: Map<string, Session>;

  constructor() {
    this.sessions = new Map();
  }

  async createSession(method: "pairing" | "qr", phoneNumber?: string): Promise<Session> {
    const id = randomUUID();
    const sessionId = generateSessionId();
    const pairingCode = method === "pairing" ? generatePairingCode() : null;

    const session: Session = {
      id,
      sessionId,
      pairingCode,
      qrCode: null,
      status: "pending",
      connectionMethod: method,
      createdAt: new Date().toISOString(),
      linkedAt: null,
      credentialsBase64: null,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    return this.sessions.get(sessionId);
  }

  async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<Session | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    session.status = status;
    if (status === "connected") {
      session.linkedAt = new Date().toISOString();
      session.credentialsBase64 = generateCredentials(sessionId);
    }
    this.sessions.set(sessionId, session);
    return session;
  }

  async updateSessionCredentials(sessionId: string, credentials: string): Promise<Session | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.credentialsBase64 = credentials;
    this.sessions.set(sessionId, session);
    return session;
  }

  async terminateSession(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  async getAllSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values());
  }
}

export const storage = new MemStorage();
