// src/components/EarlyAccess.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Send, CheckCircle, User, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config";

const API_BASE = API_BASE_URL;

const EarlyAccess: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRe = /^[0-9+\-\s()]{6,20}$/; // permissive

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter your name", variant: "destructive" });
      return;
    }
    if (!emailRe.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (phone && !phoneRe.test(phone)) {
      toast({ title: "Invalid phone", description: "Please enter a valid phone number or leave blank", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || null }),
      });

      const j = await resp.json().catch(() => ({} as any));

      if (!resp.ok) {
        const errMsg = j?.error || j?.message || `Server returned ${resp.status}`;
        toast({ title: "Submission failed", description: errMsg, variant: "destructive" });
        return;
      }

      setIsSubmitted(true);
      toast({ title: "Welcome to the waitlist! 🎉", description: "You'll be notified as soon as Sociovia launches." });

      // optional: clear after a short delay so user sees success state
      setTimeout(() => {
        setName("");
        setEmail("");
        setPhone("");
        setIsSubmitted(false);
      }, 3000);
    } catch (err) {
      console.error("Waitlist submit error", err);
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-card">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary mb-4 md:mb-6">
            Get <span className="text-primary">Early Access</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Be among the first to experience AI-powered marketing automation. Join our exclusive waitlist and get early access when we launch.
          </p>
        </div>

        <div className="primary-gradient p-1 rounded-3xl shadow-primary max-w-2xl mx-auto">
          <div className="bg-background rounded-3xl p-6 md:p-10 lg:p-12">
            {!isSubmitted ? (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-12 h-12 text-base rounded-lg"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-12 text-base rounded-lg"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-12 h-12 text-base rounded-lg"
                      disabled={isLoading}
                    />
                  </div>


                  <div className="grid gap-3">
                    <Button type="submit" variant="cta" size="lg" className="w-full h-14 accent-gradient text-lg rounded-2xl" disabled={isLoading}>
                      <Send className="w-5 h-5 mr-2" />
                      {isLoading ? "Joining..." : "Join the Waitlist"}
                    </Button>
                    <Link to="/signup" className="text-center text-sm text-muted-foreground mt-1">Already want an account? Sign up here</Link>
                  </div>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-sm text-muted-foreground">🔒 Your email is safe with us. No spam, just early access updates.</p>
                </div>
              </>
            ) : (
              <div className="text-center py-6 md:py-8">
                <div className="w-16 h-16 md:w-20 md:h-20 primary-gradient rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-primary">
                  <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-secondary mb-3 md:mb-4">You're In! 🎉</h3>
                <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">Welcome to the Sociovia early access list. We'll notify you as soon as we launch.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EarlyAccess;
