import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SessionResponse, VerifyResponse, SessionStatus } from "@shared/schema";
import {
  ArrowUpRight,
  Copy,
  Check,
  Wifi,
  QrCode,
  Shield,
  Zap,
  Terminal,
  RefreshCw,
  Trash2,
  Activity,
  Hash,
  Smartphone,
  Link2,
  AlertCircle,
  Loader2,
  Bot,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

function GlassCard({
  children,
  className = "",
  hoverable = false,
}: {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <div
      className={`relative backdrop-blur-sm bg-black/30 border border-green-500/20 rounded-xl transition-all duration-300 ${
        hoverable ? "hover:border-green-500/40 hover:scale-[1.02] group" : ""
      } ${className}`}
      style={{ boxShadow: "0 0 40px rgba(0, 255, 0, 0.08)" }}
    >
      {children}
    </div>
  );
}

function GlowText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-green-400 ${className}`} style={{ textShadow: "0 0 20px rgba(0, 255, 0, 0.5)" }}>
      {children}
    </span>
  );
}

function PulsingDot({ status }: { status: SessionStatus }) {
  const colorMap: Record<SessionStatus, string> = {
    pending: "bg-yellow-400",
    connecting: "bg-blue-400",
    connected: "bg-green-400",
    failed: "bg-red-400",
    terminated: "bg-gray-400",
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      {(status === "pending" || status === "connecting") && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colorMap[status]} opacity-75`} />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colorMap[status]}`} />
    </span>
  );
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const labelMap: Record<SessionStatus, string> = {
    pending: "Awaiting Connection",
    connecting: "Connecting...",
    connected: "Connected",
    failed: "Failed",
    terminated: "Terminated",
  };
  const colorMap: Record<SessionStatus, string> = {
    pending: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
    connecting: "text-blue-400 border-blue-400/30 bg-blue-400/5",
    connected: "text-green-400 border-green-400/30 bg-green-400/5",
    failed: "text-red-400 border-red-400/30 bg-red-400/5",
    terminated: "text-gray-400 border-gray-400/30 bg-gray-400/5",
  };
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs tracking-wider ${colorMap[status]}`}>
      <PulsingDot status={status} />
      {labelMap[status]}
    </span>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <GlassCard hoverable className="p-5">
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 shrink-0">
          <Icon className="w-5 h-5 text-green-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-white font-mono text-sm font-semibold mb-1">{title}</h3>
          <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
        </div>
        <ArrowUpRight className="w-4 h-4 text-green-500/40 group-hover:text-green-400 transition-all duration-300 group-hover:rotate-45 shrink-0 mt-1" />
      </div>
    </GlassCard>
  );
}

export default function Home() {
  const { toast } = useToast();
  const [activeMethod, setActiveMethod] = useState<"pairing" | "qr">("pairing");
  const [currentSession, setCurrentSession] = useState<SessionResponse | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedSession, setCopiedSession] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pollingActive, setPollingActive] = useState(false);

  const { data: sessionStatus, refetch: refetchStatus } = useQuery<VerifyResponse>({
    queryKey: [`/api/session/${currentSession?.sessionId}/status`],
    enabled: !!currentSession?.sessionId && pollingActive,
    refetchInterval: pollingActive ? 3000 : false,
  });

  useEffect(() => {
    if (sessionStatus?.status === "connected" || sessionStatus?.status === "failed") {
      setPollingActive(false);
    }
  }, [sessionStatus?.status]);

  const generateMutation = useMutation({
    mutationFn: async (method: "pairing" | "qr") => {
      const res = await apiRequest("POST", "/api/generate-session", {
        method,
        phoneNumber: method === "pairing" ? phoneNumber : undefined,
      });
      return (await res.json()) as SessionResponse;
    },
    onSuccess: (data) => {
      setCurrentSession(data);
      setPollingActive(true);
      toast({ title: "Session Created", description: `Session ${data.sessionId} initialized` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/verify-pairing", {
        sessionId: currentSession?.sessionId,
        code: verificationCode,
      });
      return (await res.json()) as VerifyResponse;
    },
    onSuccess: (data) => {
      setCurrentSession((prev) =>
        prev ? { ...prev, status: data.status } : null
      );
      if (data.status === "connected") {
        toast({ title: "Connected", description: "WhatsApp linked successfully" });
        setPollingActive(false);
      }
    },
    onError: (err: Error) => {
      toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
    },
  });

  const terminateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/terminate-session", {
        sessionId: currentSession?.sessionId,
      });
    },
    onSuccess: () => {
      setCurrentSession(null);
      setPollingActive(false);
      setVerificationCode("");
      setPhoneNumber("");
      toast({ title: "Session Terminated", description: "All session data cleaned up" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCopy = useCallback(
    (text: string, type: "code" | "session") => {
      navigator.clipboard.writeText(text);
      if (type === "code") {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopiedSession(true);
        setTimeout(() => setCopiedSession(false), 2000);
      }
    },
    []
  );

  const displayStatus = sessionStatus?.status || currentSession?.status || "pending";

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(ellipse, rgba(0,255,0,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(ellipse, rgba(0,255,0,0.2) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-500/20 bg-green-500/5 mb-6">
            <Bot className="w-3.5 h-3.5 text-green-400" />
            <span className="font-mono text-xs text-green-400 tracking-wider" data-testid="text-version">
              v2.0.0-beta
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
            <GlowText>WOLF</GlowText>
            <span className="text-white">BOT</span>
          </h1>
          <p className="text-gray-500 font-mono text-sm max-w-md mx-auto leading-relaxed">
            Session ID Generator &amp; WhatsApp Linking Service
          </p>
          <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-600">
              <Shield className="w-3 h-3" /> E2E Encrypted
            </span>
            <span className="text-gray-700">|</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-600">
              <Zap className="w-3 h-3" /> Real-time Sync
            </span>
            <span className="text-gray-700">|</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-600">
              <Activity className="w-3 h-3" /> Multi-Device
            </span>
          </div>
        </header>

        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          <div className="lg:col-span-3 space-y-6">
            <GlassCard className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Terminal className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white font-mono">Session Generator</h2>
                  <p className="text-xs text-gray-500 font-mono">Initialize a new connection</p>
                </div>
              </div>

              <div className="flex gap-2 mb-6 p-1 rounded-lg bg-black/50 border border-gray-800/50">
                <button
                  data-testid="button-method-pairing"
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-mono text-xs transition-all ${
                    activeMethod === "pairing"
                      ? "bg-green-500/15 text-green-400 border border-green-500/30"
                      : "text-gray-500 border border-transparent hover:text-gray-300"
                  }`}
                  onClick={() => setActiveMethod("pairing")}
                >
                  <Hash className="w-3.5 h-3.5" />
                  8-Digit Pairing
                </button>
                <button
                  data-testid="button-method-qr"
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-mono text-xs transition-all ${
                    activeMethod === "qr"
                      ? "bg-green-500/15 text-green-400 border border-green-500/30"
                      : "text-gray-500 border border-transparent hover:text-gray-300"
                  }`}
                  onClick={() => setActiveMethod("qr")}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  QR Code
                </button>
              </div>

              {activeMethod === "pairing" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider font-mono mb-2">
                      Phone Number (with country code)
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        data-testid="input-phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1234567890"
                        className="w-full pl-10 pr-4 py-3 bg-black/50 border border-gray-800 rounded-lg font-mono text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-green-500/40 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeMethod === "qr" && (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-xs font-mono mb-2">
                    A QR code will be generated for WhatsApp Web scanning
                  </p>
                </div>
              )}

              <button
                data-testid="button-generate"
                disabled={generateMutation.isPending || (activeMethod === "pairing" && !phoneNumber)}
                onClick={() => generateMutation.mutate(activeMethod)}
                className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3.5 bg-green-500/10 border border-green-500/30 rounded-lg font-mono text-sm text-green-400 transition-all hover:bg-green-500/20 hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Generate Session
                  </>
                )}
              </button>
            </GlassCard>

            {currentSession && (
              <GlassCard className="p-6 sm:p-8">
                <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                      <Wifi className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white font-mono">Active Session</h2>
                      <p className="text-xs text-gray-500 font-mono">Real-time connection status</p>
                    </div>
                  </div>
                  <StatusBadge status={displayStatus as SessionStatus} />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider font-mono mb-2">
                      Session ID
                    </label>
                    <div
                      className="flex items-center justify-between gap-3 p-3 bg-black/50 rounded-lg border border-gray-800/50 cursor-pointer transition-all hover:border-green-500/20"
                      onClick={() => handleCopy(currentSession.sessionId, "session")}
                      data-testid="button-copy-session"
                    >
                      <span className="font-mono text-green-400 text-sm tracking-wider truncate">
                        {currentSession.sessionId}
                      </span>
                      {copiedSession ? (
                        <Check className="w-4 h-4 text-green-400 shrink-0" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600 shrink-0" />
                      )}
                    </div>
                  </div>

                  {currentSession.pairingCode && (
                    <div>
                      <label className="block text-gray-400 text-xs uppercase tracking-wider font-mono mb-2">
                        8-Digit Pairing Code
                      </label>
                      <div
                        className="flex items-center justify-between gap-3 p-4 bg-black/50 rounded-lg border border-green-500/20 cursor-pointer transition-all hover:border-green-500/40"
                        onClick={() => handleCopy(currentSession.pairingCode!, "code")}
                        data-testid="button-copy-pairing"
                      >
                        <span
                          className="font-mono text-2xl sm:text-3xl tracking-[0.3em] font-bold"
                          style={{ color: "#00ff00", textShadow: "0 0 20px rgba(0, 255, 0, 0.4)" }}
                        >
                          {currentSession.pairingCode.replace(/(\d{4})(\d{4})/, "$1 $2")}
                        </span>
                        {copied ? (
                          <Check className="w-5 h-5 text-green-400 shrink-0" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-gray-600 text-xs font-mono mt-2">
                        Enter this code in WhatsApp &gt; Linked Devices &gt; Link a Device
                      </p>
                    </div>
                  )}

                  {currentSession.qrCode && (
                    <div>
                      <label className="block text-gray-400 text-xs uppercase tracking-wider font-mono mb-2">
                        Scan QR Code
                      </label>
                      <div className="flex justify-center p-6 bg-white rounded-lg">
                        <img
                          src={currentSession.qrCode}
                          alt="WhatsApp QR Code"
                          className="w-48 h-48 sm:w-56 sm:h-56"
                          data-testid="img-qr-code"
                        />
                      </div>
                      <p className="text-gray-600 text-xs font-mono mt-2 text-center">
                        Open WhatsApp &gt; Settings &gt; Linked Devices &gt; Scan QR
                      </p>
                    </div>
                  )}

                  {currentSession.pairingCode && displayStatus === "pending" && (
                    <div className="pt-2">
                      <label className="block text-gray-400 text-xs uppercase tracking-wider font-mono mb-2">
                        Verification Code
                      </label>
                      <div className="flex gap-3">
                        <input
                          data-testid="input-verify-code"
                          type="text"
                          maxLength={8}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                          placeholder="Enter 8-digit code"
                          className="flex-1 px-4 py-3 bg-black/50 border border-gray-800 rounded-lg font-mono text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-green-500/40 transition-colors"
                        />
                        <button
                          data-testid="button-verify"
                          disabled={verificationCode.length !== 8 || verifyMutation.isPending}
                          onClick={() => verifyMutation.mutate()}
                          className="px-5 py-3 bg-green-500/10 border border-green-500/30 rounded-lg font-mono text-xs text-green-400 transition-all hover:bg-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {verifyMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Verify"
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {displayStatus === "connected" && sessionStatus?.credentialsBase64 && (
                    <div>
                      <label className="block text-gray-400 text-xs uppercase tracking-wider font-mono mb-2">
                        Session Credentials
                      </label>
                      <div className="p-3 bg-black/50 rounded-lg border border-green-500/20">
                        <code className="font-mono text-xs text-green-400/80 break-all leading-relaxed" data-testid="text-credentials">
                          WOLF-BOT:~{sessionStatus.credentialsBase64}
                        </code>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6 flex-wrap">
                  <button
                    data-testid="button-refresh"
                    onClick={() => refetchStatus()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg font-mono text-xs text-gray-400 transition-all hover:border-green-500/40 hover:text-gray-300"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                  <button
                    data-testid="button-terminate"
                    onClick={() => terminateMutation.mutate()}
                    disabled={terminateMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500/5 border border-red-500/20 rounded-lg font-mono text-xs text-red-400 transition-all hover:bg-red-500/10 hover:border-red-500/30"
                  >
                    {terminateMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Terminate
                  </button>
                </div>
              </GlassCard>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Link2 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white font-mono">Auto-Link Actions</h2>
                  <p className="text-xs text-gray-500 font-mono">After connection</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-black/30 border border-gray-800/30">
                  <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <SiWhatsapp className="w-3 h-3 text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-mono font-medium">Join Group</p>
                    <p className="text-gray-600 text-[10px] font-mono truncate">chat.whatsapp.com/HjFc3...</p>
                  </div>
                  <Check className="w-3.5 h-3.5 text-green-500/50 shrink-0 mt-0.5" />
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-black/30 border border-gray-800/30">
                  <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <SiWhatsapp className="w-3 h-3 text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-mono font-medium">Follow Channel</p>
                    <p className="text-gray-600 text-[10px] font-mono truncate">whatsapp.com/channel/002...</p>
                  </div>
                  <Check className="w-3.5 h-3.5 text-green-500/50 shrink-0 mt-0.5" />
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-black/30 border border-gray-800/30">
                  <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Terminal className="w-3 h-3 text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-mono font-medium">Send Session ID</p>
                    <p className="text-gray-600 text-[10px] font-mono">WOLF-BOT:~{"{base64}"}</p>
                  </div>
                  <Check className="w-3.5 h-3.5 text-green-500/50 shrink-0 mt-0.5" />
                </div>
              </div>
            </GlassCard>

            <div className="space-y-3">
              <FeatureCard
                icon={Shield}
                title="End-to-End Encrypted"
                desc="All session data is encrypted and secure"
              />
              <FeatureCard
                icon={Zap}
                title="Instant Generation"
                desc="Session IDs generated in milliseconds"
              />
              <FeatureCard
                icon={Activity}
                title="Real-time Status"
                desc="Live connection monitoring & updates"
              />
              <FeatureCard
                icon={SiWhatsapp}
                title="WhatsApp Multi-Device"
                desc="Compatible with multi-device beta"
              />
            </div>

            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-yellow-500/70" />
                <span className="text-xs font-mono text-yellow-500/70 uppercase tracking-wider">Notice</span>
              </div>
              <p className="text-gray-500 text-xs font-mono leading-relaxed">
                This tool generates session credentials for WOLFBOT. Keep your session ID private and never share it publicly. Sessions auto-expire after 5 minutes of inactivity.
              </p>
            </GlassCard>
          </div>
        </div>

        <footer className="mt-16 text-center border-t border-gray-800/50 pt-8 pb-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-green-500/40" />
            <span className="font-mono text-xs text-gray-600">WOLFBOT Session Generator</span>
          </div>
          <p className="text-gray-700 text-[10px] font-mono">
            Built with security in mind. All connections are end-to-end encrypted.
          </p>
        </footer>
      </div>
    </div>
  );
}
