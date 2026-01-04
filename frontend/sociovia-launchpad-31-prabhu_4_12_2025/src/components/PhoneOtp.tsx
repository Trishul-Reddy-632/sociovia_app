import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config";

/**
 * PhoneOtp component
 *
 * Usage:
 *   <PhoneOtp
 *     initialPhone="+9198xxxxxxx"
 *     length={4}
 *     onVerified={(userId) => { ... }}
 *   />
 *
 * Behavior:
 *  - Attempts to send OTP by calling backend endpoint: POST /api/sms/send-otp { phone }
 *  - If VITE_SMSHORIZON_API_KEY is present in client env (NOT RECOMMENDED), the component can call SMSHorizon directly.
 *  - Verifies OTP by calling backend endpoint: POST /api/sms/verify-otp { phone, code }
 *
 * IMPORTANT:
 *  - Do NOT store or use production API keys in client-side code. Always route SMS sending/verification through your server.
 *  - If you intentionally want direct SMS from client for testing, set VITE_SMSHORIZON_API_KEY (but remove before shipping).
 */

type Props = {
  initialPhone?: string;
  length?: number; // number of digits
  onVerified?: (userId?: number) => void;
  className?: string;
  apiBase?: string; // override backend base (optional)
};

const DEFAULT_LENGTH = 4;
const RESEND_COOLDOWN = 30; // seconds

const PhoneOtp: React.FC<Props> = ({ initialPhone = "", length = DEFAULT_LENGTH, onVerified, className, apiBase }) => {
  const { toast } = useToast();
  const [phone, setPhone] = useState<string>(initialPhone);
  const [code, setCode] = useState<string>("".padEnd(length, ""));
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Where to call for sending/verification — prefer backend endpoint (recommended)
  const BACKEND_SEND = useMemo(() => (apiBase ?? API_BASE_URL).toString().replace(/\/$/, "") + "/api/sms/send-otp", [apiBase]);
  const BACKEND_VERIFY = useMemo(() => (apiBase ?? API_BASE_URL).toString().replace(/\/$/, "") + "/api/sms/verify-otp", [apiBase]);

  // If a direct SMS provider key is present in env (for dev/test only)
  const SMSHORIZON_KEY = (import.meta.env.VITE_SMSHORIZON_API_KEY ?? "") as string;

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // auto-focus OTP input after send
    if (sent) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [sent]);

  // countdown ticks
  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = window.setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [cooldown]);

  const sendOtp = async () => {
    if (!phone || phone.trim().length < 6) {
      toast({ title: "Invalid phone", description: "Please enter a valid phone number including country code." });
      return;
    }
    setSending(true);

    try {
      // Prefer backend call (recommended)
      if (BACKEND_SEND && !SMSHORIZON_KEY) {
        const res = await fetch(BACKEND_SEND, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "include",
          body: JSON.stringify({ phone: phone.trim() }),
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = payload?.error || payload?.message || `HTTP ${res.status}`;
          throw new Error(err);
        }

        // backend should return { success: true } or { success: true, msgid }
        toast({ title: "OTP sent", description: "A one-time code was sent to your phone." });
        setSent(true);
        setCooldown(RESEND_COOLDOWN);
        setCode("");
        return;
      }

      // If SMSHORIZON_KEY exists client-side — call SMSHorizon directly (NOT RECOMMENDED for production)
      if (SMSHORIZON_KEY) {
        // Build the SMS text — keep short. Ideally the backend would generate a secure OTP and store it.
        // **This direct approach is insecure**: attacker can view the API key in bundle.
        const otp = Math.floor(1000 + Math.random() * 9000).toString().slice(0, length);
        // Save OTP in sessionStorage temporarily so verify can check client-side (only for dev/test)
        sessionStorage.setItem(`sv_otp_${phone}`, otp);

        // craft message and URL
        const message = encodeURIComponent(`Your Sociovia verification code is ${otp}`);
        const mobile = encodeURIComponent(phone.trim());
        const url = `https://smshorizon.co.in/api/sendsms.php?user=YOUR_SMSHORIZON_USER&apikey=${encodeURIComponent(
          SMSHORIZON_KEY
        )}&mobile=${mobile}&message=${message}&senderid=SOCIVO&tid=xyz&type=txt`;

        const r = await fetch(url, { method: "GET" });
        const text = await r.text().catch(() => "");
        // SMSHorizon returns msgid or error string — treat non-empty as success
        if (!r.ok) {
          throw new Error(`SMS provider error: ${r.status}`);
        }
        // for dev: consider checking format of msgid
        toast({ title: "OTP sent (dev)", description: "Check your phone for the verification code." });
        setSent(true);
        setCooldown(RESEND_COOLDOWN);
        setCode("");
        return;
      }

      // If code reaches here, there's no send method configured
      throw new Error("No SMS send method configured. Please implement server-side /api/sms/send-otp.");
    } catch (err: any) {
      console.error("sendOtp error:", err);
      toast({ title: "Send failed", description: err?.message || "Failed to send OTP." });
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    const entered = (code || "").toString().trim();
    if (entered.length < length) {
      toast({ title: "Invalid code", description: `Please enter the ${length}-digit code.` });
      return;
    }

    setVerifying(true);
    try {
      // Prefer backend verification
      if (BACKEND_VERIFY && !SMSHORIZON_KEY) {
        const res = await fetch(BACKEND_VERIFY, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "include",
          body: JSON.stringify({ phone: phone.trim(), code: entered }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.success) {
          throw new Error(payload?.error || payload?.message || `HTTP ${res.status}`);
        }
        toast({ title: "Verified", description: "Phone number verified." });
        onVerified?.(payload?.user_id ?? undefined);
        return;
      }

      // Dev-only client-side verification (only if using client-side SMSHorizon path above)
      if (SMSHORIZON_KEY) {
        const expected = sessionStorage.getItem(`sv_otp_${phone}`) ?? null;
        if (!expected) throw new Error("No OTP was generated for this number (dev-mode).");
        if (expected !== entered) throw new Error("Incorrect code");
        sessionStorage.removeItem(`sv_otp_${phone}`);
        toast({ title: "Verified (dev)", description: "Phone number verified (dev)." });
        onVerified?.();
        return;
      }

      throw new Error("No SMS verify method configured. Please implement server-side /api/sms/verify-otp.");
    } catch (err: any) {
      console.error("verifyOtp error:", err);
      toast({ title: "Verification failed", description: err?.message || "Could not verify the code." });
    } finally {
      setVerifying(false);
    }
  };

  const onChangeCode = (v: string) => {
    // accept only digits, max length
    const cleaned = v.replace(/\D/g, "").slice(0, length);
    setCode(cleaned);
  };

  const resend = () => {
    if (cooldown > 0) return;
    sendOtp();
  };

  return (
    <div className={className}>
      <div className="space-y-3">
        <div className="flex gap-2 items-center">
          <Input
            placeholder="+9198xxxx..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1"
            aria-label="Phone number"
          />
          <Button onClick={sendOtp} disabled={sending || !phone || !phone.trim()}>
            {sending ? "Sending…" : sent ? "Resend" : "Send OTP"}
          </Button>
        </div>

        {sent && (
          <>
            <div className="flex gap-2 items-center">
              <Input
                ref={(el) => (inputRef.current = el)}
                placeholder={"Enter code"}
                value={code}
                onChange={(e) => onChangeCode(e.target.value)}
                className="w-40"
                inputMode="numeric"
                aria-label="OTP code"
              />
              <Button onClick={verifyOtp} disabled={verifying || code.length < length}>
                {verifying ? "Verifying…" : "Verify"}
              </Button>

              <div className="text-xs text-muted-foreground ml-2">
                {cooldown > 0 ? <>Resend in {cooldown}s</> : <button className="underline" onClick={resend}>Resend</button>}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Didn't receive it? Check your number or try again.</div>
          </>
        )}

        <div className="text-xs text-muted-foreground mt-1">
          <strong>Note:</strong> For production, configure server-side endpoints to send & verify OTPs. Do not embed provider API keys in client code.
        </div>
      </div>
    </div>
  );
};

export default PhoneOtp;
