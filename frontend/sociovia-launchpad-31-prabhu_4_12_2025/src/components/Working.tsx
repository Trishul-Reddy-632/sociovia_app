import React, { useCallback, useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Target, Sparkles, MessageSquare, Workflow } from "lucide-react";

/**
 * SocioviaZigZag — animated zig-zag rows
 * - Improved padding, alignment, mobile & desktop responsiveness
 */

const ROW_VARIANTS = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: (custom = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: "easeOut" as const, delay: custom * 0.15 },
  }),
};

const ITEM_HOVER = { y: -6, scale: 1.01 };

const rows = [
  {
    key: "workspace",
    image: "/dashboard.png",
    title: "Workspace Dashboard",
    subtitle: "View detailed analytics and registered campaigns for this workspace.",
    bullets: ["Overview metrics", "Campaign performance", "Spend & conversions"],
    icon: Target,
    label: "Dashboard Analytics",
  },
  {
    key: "features",
    image: "/generate.png",
    title: "Create & Generate",
    subtitle: "Three simple ways to create creatives and campaigns — pick what fits your workflow.",
    bullets: ["Generate with AI", "Manual upload & create", "Create via product link"],
    icon: Sparkles,
    label: "AI Ad Creation",
  },
  {
    key: "chat",
    image: "/chat.jpeg",
    title: "Creative Chat",
    subtitle: "See generated creatives, request variations, and quickly publish or export.",
    bullets: ["Preview generated sets", "Ask for tweaks", "Publish to workspace"],
    icon: MessageSquare,
    label: "Creative Studio",
  },
  {
    key: "agent",
    image: "/agent.jpeg",
    title: "Agent Mode — Workflow Builder",
    subtitle: "Compose automation flows by arranging building blocks. (Drag & drop coming soon.)",
    bullets: ["Product feed → AI gen", "Audience splits", "Auto-publish pipelines"],
    icon: Workflow,
    label: "Automation",
  },
];

function ImagePlaceholder({ index, src, icon: Icon, label }: { index: number; src?: string; icon?: React.ElementType; label?: string }) {
  const prefersReduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile/touch device
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Disable tilt effect on mobile
      if (prefersReduced || isMobile) return;
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
      const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
      el.style.setProperty("--tx", `${dx * 6}px`);
      el.style.setProperty("--ty", `${dy * 6}px`);
      el.style.setProperty("--r", `${dx * 1.5}deg`);
    },
    [prefersReduced, isMobile]
  );

  const handleLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--tx", `0px`);
    el.style.setProperty("--ty", `0px`);
    el.style.setProperty("--r", `0deg`);
  }, []);

  return (
    <motion.div
      className="relative group"
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.1 }}
    >
      {/* Decorative background glow */}
      <div className="absolute -inset-4 bg-gradient-to-br from-emerald-100/60 via-green-50/40 to-teal-100/50 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Main card container */}
      <motion.div
        className="relative rounded-2xl w-full bg-gradient-to-br from-emerald-50/80 via-green-50/60 to-white border border-emerald-100/80 shadow-lg shadow-emerald-500/10 overflow-hidden"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        whileHover={{ 
          scale: 1.03,
          boxShadow: "0 20px 40px -12px rgba(16, 185, 129, 0.25)",
        }}
        style={{
          transform: "translate3d(var(--tx,0), var(--ty,0), 0) rotate(var(--r,0))",
          transition: "transform 0.3s ease-out, box-shadow 0.3s ease-out",
        }}
      >
        {/* Top decorative bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400 opacity-80" />
        
        {/* Floating icon badge */}
        {Icon && (
          <motion.div 
            className="absolute top-4 right-4 z-10 p-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-emerald-100"
            initial={{ scale: 0, rotate: -180 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 + index * 0.1, type: "spring" }}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Icon className="w-5 h-5 text-emerald-600" />
          </motion.div>
        )}

        {/* Image container with inner card effect */}
        <div className="p-4 sm:p-5">
          <div className="relative rounded-xl overflow-hidden bg-white/80 shadow-inner border border-gray-100/50">
            {/* Mock UI header bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-100">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              {label && (
                <div className="flex items-center gap-2 ml-3">
                  {Icon && <Icon className="w-4 h-4 text-emerald-500" />}
                  <span className="text-xs font-medium text-gray-600">{label}</span>
                </div>
              )}
            </div>
            
            {/* Image content */}
            <div className="h-44 sm:h-52 md:h-56 lg:h-60 relative overflow-hidden">
              {src ? (
                <img
                  src={src}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-contain object-center transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-sm text-muted-foreground bg-gradient-to-br from-gray-50 to-gray-100">
                  {/* Placeholder skeleton */}
                  <div className="space-y-3 w-3/4">
                    <div className="h-3 bg-gray-200 rounded-full animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded-full w-2/3 animate-pulse" />
                    <div className="h-8 bg-emerald-400/30 rounded-lg w-1/2 mt-4 animate-pulse" />
                  </div>
                </div>
              )}
              
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        </div>

        {/* Bottom decorative element */}
        <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-emerald-200/40 to-teal-200/30 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-gradient-to-tr from-green-200/30 to-emerald-100/20 blur-xl pointer-events-none" />
      </motion.div>
    </motion.div>
  );
}

export default function SocioviaZigZag({ className = "" }: { className?: string }) {
  const prefersReduced = useReducedMotion();

  return (
    <section className={`py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-emerald-50/20 to-white ${className}`}>
      <div className="max-w-5xl lg:max-w-6xl mx-auto space-y-16 md:space-y-24">

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.12 } },
          }}
          className="space-y-16 md:space-y-20"
        >
          {rows.map((r, idx) => {
            const textLeft = idx % 2 === 1;

            return (
              <motion.div
                key={r.key}
                className="grid md:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-center group"
                variants={ROW_VARIANTS}
                custom={idx}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
              >
                {textLeft ? (
                  <>
                    {/* TEXT (left on desktop) */}
                    <motion.div
                      className="md:col-span-5 order-2 md:order-1"
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.6,
                        delay: prefersReduced ? 0 : 0.2,
                      }}
                      viewport={{ once: true }}
                      whileHover={ITEM_HOVER}
                    >
                      <div className="w-full">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 mb-4">
                          <r.icon className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-medium text-emerald-600">{r.label}</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                          {r.title}
                        </h3>
                        <p className="mt-3 text-sm md:text-base text-gray-600 leading-relaxed">
                          {r.subtitle}
                        </p>

                        <ul className="mt-4 space-y-2">
                          {r.bullets.map((b, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm md:text-base text-gray-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="mt-6">
                          <button className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300">
                            Learn more <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>

                    {/* IMAGE (right on desktop) */}
                    <motion.div
                      className="md:col-span-7 order-1 md:order-2"
                      initial={{ opacity: 0, x: 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.6,
                        delay: prefersReduced ? 0 : 0.1,
                      }}
                      viewport={{ once: true }}
                    >
                      <ImagePlaceholder index={idx} src={r.image} icon={r.icon} label={r.label} />
                    </motion.div>
                  </>
                ) : (
                  <>
                    {/* IMAGE (left on desktop) */}
                    <motion.div
                      className="md:col-span-7 order-1"
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.6,
                        delay: prefersReduced ? 0 : 0.1,
                      }}
                      viewport={{ once: true }}
                    >
                      <ImagePlaceholder index={idx} src={r.image} icon={r.icon} label={r.label} />
                    </motion.div>

                    {/* TEXT (right on desktop) */}
                    <motion.div
                      className="md:col-span-5 order-2"
                      initial={{ opacity: 0, x: 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.6,
                        delay: prefersReduced ? 0 : 0.2,
                      }}
                      viewport={{ once: true }}
                      whileHover={ITEM_HOVER}
                    >
                      <div className="w-full">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 mb-4">
                          <r.icon className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-medium text-emerald-600">{r.label}</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                          {r.title}
                        </h3>
                        <p className="mt-3 text-sm md:text-base text-gray-600 leading-relaxed">
                          {r.subtitle}
                        </p>

                        <ul className="mt-4 space-y-2">
                          {r.bullets.map((b, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm md:text-base text-gray-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="mt-6">
                          <button className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300">
                            Learn more <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
