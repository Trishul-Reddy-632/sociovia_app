import React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  Key,
  ClipboardList,
  Users,
  Database,
  Zap,
  Globe,
  ArrowRight,
} from "lucide-react";

/**
 * SocioviaSecurity.jsx
 * - Uses Sociovia tokens & classes from the Tailwind CSS you provided.
 * - No inline gradients — relies entirely on classes: primary-gradient, accent-gradient, feature-gradient, etc.
 * - Animations use framer-motion plus your animate-* utilities.
 */

const fadeUp = {
  hidden: { opacity: 0, y: 18, scale: 0.995 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.56, ease: "easeOut" } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.06 } },
};

function Card({ children, className = "" }) {
  return (
    <motion.div
      variants={fadeUp}
      className={`rounded-3xl p-6 bg-card text-card-foreground shadow-soft border border-border ${className}`}
    >
      {children}
    </motion.div>
  );
}

function IconBadge({ Icon, variant = "primary" }) {
  const cls = variant === "primary" ? "primary-gradient2" : "accent-gradient";
  return (
    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${cls} shadow-primary`}>
      <Icon className="w-7 h-7 text-primary-foreground" />
    </div>
  );
}

export default function SocioviaSecurity({ className = "" }) {
  const topHighlights = [
    { title: "Zero Data Retention", desc: "We enforce a strict zero-data-retention policy — your session data is processed and discarded.", icon: ShieldCheck, variant: "primary" },
    { title: "Enterprise-Grade Security", desc: "SAML, SSO and multi-layered protections with enterprise-ready controls.", icon: Lock, variant: "accent" },
    { title: "Controlled Data Residency", desc: "Choose where your data lives with strict geographical residency controls.", icon: Globe, variant: "primary" },
  ];

  const gridItems = [
    { title: "You Own Your Data", desc: "Full exportability and clear ownership controls — always.", icon: Database },
    { title: "MFA & SSO", desc: "Multi-factor auth + federated single sign-on (SAML/OIDC).", icon: Users },
    { title: "RBAC & Audit Logs", desc: "Fine-grained RBAC and immutable auditing for every change.", icon: Key },
    { title: "Configurable Retention", desc: "Policy-driven retention and safe deletion workflows.", icon: Zap },
  ];

  return (
    <section className={`py-16 px-4 bg-background ${className}`}>
      <div className="max-w-6xl mx-auto space-y-12">

        {/* HERO CARD */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
          <div className="rounded-3xl p-8 md:p-10 primary-gradient shadow-elegant border border-transparent text-primary-foreground overflow-hidden">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-none">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-white/06">
                  <ShieldCheck className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight">Built on Trust — Sociovia</h1>

                <p className="mt-3 text-base md:text-lg text-primary-foreground/90 max-w-2xl">
                  Sociovia ensures the security and privacy of your data with modern, industry-leading measures, strict data controls, and a zero-retention-first architecture.
                </p>

                <div className="mt-6 flex justify-center md:justify-start gap-4">
                  <a
                    href="/contact"
                    className="inline-flex items-center gap-3 px-5 py-3 rounded-xl btn-indigo shadow-primary hover-lift"
                    aria-label="Request demo"
                  >
                    Request Enterprise Demo
                    <ArrowRight className="w-4 h-4" />
                  </a>

                  <a
                    href="/security"
                    className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-white/06 border border-white/06 text-primary-foreground hover-glow transition-smooth"
                  >
                    View Security Docs
                  </a>
                </div>
              </div>

              <div className="hidden md:block flex-none">
                <div className="rounded-2xl p-3 bg-white/06 w-36 h-20 flex items-center justify-center shadow-soft">
                  <div className="text-xs text-primary-foreground font-semibold">SOCIOVIA</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* TOP HIGHLIGHT CARDS (3) */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
          className="grid md:grid-cols-3 gap-6"
        >
          {topHighlights.map((h, i) => (
            <Card key={i} className="hover-lift feature-gradient">
              <div className="flex items-start gap-4">
                <IconBadge Icon={h.icon} variant={h.variant} />
                <div className="flex-1">
                  <h3 className="text-lg md:text-xl font-bold text-secondary">{h.title}</h3>
                  <p className="text-sm md:text-base text-muted-foreground mt-2 leading-relaxed">{h.desc}</p>
                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary">
                    <span>Learn more</span>
                    <ArrowRight className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* SECURITY GRID - all cards */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-xl md:text-2xl font-bold text-secondary">Security & Compliance</h2>
            <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-2xl mx-auto leading-relaxed">
              Built from the ground up with enterprise-grade safeguards. Sociovia treats confidentiality and compliance as primary design constraints.
            </p>
          </div>

          <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridItems.map((g, i) => (
              <Card key={i} className="hover-lift">
                <div className="flex gap-4 items-start">
                  <div className="flex-none">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-popover">
                      <g.icon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <h4 className="text-base md:text-lg font-semibold text-secondary">{g.title}</h4>
                    <p className="text-sm md:text-base text-muted-foreground mt-1 leading-relaxed">{g.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </motion.div>
        </motion.div>

        {/* ENTERPRISE TRUST + PRIVACY CARDS (side-by-side on md+) */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid md:grid-cols-2 gap-6">
          <Card className="hover-lift">
            <div className="flex items-start gap-4">
              <div className="flex-none">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center primary-gradient2">
                  <ShieldCheck className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>

              <div>
                <h3 className="text-lg md:text-xl font-bold text-secondary">Enterprise Trust</h3>
                <p className="text-sm md:text-base text-muted-foreground mt-2 leading-relaxed max-w-xl">
                  Trusted by legal firms and enterprises handling highly sensitive information. Sociovia's security design is hardened for real-world adversaries.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <span>• Multi-factor authentication (MFA)</span>
                  <span>• Role-based access control</span>
                  <span>• Comprehensive audit logs</span>
                  <span>• Single Sign-On (SSO) support</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="hover-lift">
            <div className="flex items-start gap-4">
              <div className="flex-none">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center accent-gradient">
                  <Globe className="w-5 h-5 text-accent-foreground" />
                </div>
              </div>

              <div>
                <h3 className="text-lg md:text-xl font-bold text-secondary">Privacy First</h3>
                <p className="text-sm md:text-base text-muted-foreground mt-2 leading-relaxed max-w-xl">
                  Privacy is core: attorney-client privilege, strict sandboxing, and configurable retention policies keep your data protected.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <span>• Attorney-client privilege protection</span>
                  <span>• No cross-client data contamination</span>
                  <span>• Configurable retention policies</span>
                  <span>• GDPR & global privacy compliance</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* CONTACT CTA */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="text-center">
          <Card className="inline-block max-w-2xl">
            <h3 className="text-lg md:text-xl font-bold text-secondary">Have security questions? We're here to help.</h3>
            <p className="text-sm md:text-base text-muted-foreground mt-2">Contact our security team for technical documentation, SOC reports, and compliance inquiries.</p>
            <div className="mt-4">
              <a href="mailto:security@sociovia.com" className="inline-flex items-center gap-3 px-5 py-3 rounded-xl btn-indigo shadow hover-lift">
                security@sociovia.com
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </Card>
        </motion.div>

      </div>
    </section>
  );
}
