import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Globe
} from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/sociovia_logo.png";

const Footer = () => {
  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Instagram, href: "https://www.instagram.com/sociovia.ai", label: "Instagram" },
    { icon: Linkedin, href: "https://www.linkedin.com/company/socioviaai/", label: "LinkedIn" },
  ];

  const quickLinks = [
    { label: "About Us", href: "/about-us" },
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Early Access", href: "#early-access" },
  ];

  const accountLinks = [
    { label: "Sign Up", href: "/signup" },
    { label: "Login", href: "/login" },
    { label: "Admin Portal", href: "/admin/login" },
  ];

  const legalLinks = [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms-of-service" },
  ];

  return (
    <footer className="bg-black text-secondary-foreground">
      {/* Main Footer Content */}
      <div className="py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">

            {/* Company Info */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <img src={logo} alt="Sociovia Technologies" className="h-10 md:h-12 w-auto" />
                <div>
                  <h3 className="text-lg md:text-xl font-bold">Sociovia</h3>
                </div>
              </div>

              <p className="text-sm md:text-base text-secondary-foreground/80 leading-relaxed mb-4 md:mb-6">
                Revolutionizing small business marketing with AI-powered automation.
              </p>

              {/* Parent Company */}
              <div className="flex items-center gap-2 mb-4 md:mb-6 text-sm text-secondary-foreground/60">
                <Globe className="w-4 h-4 text-accent flex-shrink-0" />
                <span><strong className="text-secondary-foreground/80">Adtomate Solutions Pvt Ltd</strong></span>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 md:space-y-3">
                {/* Email */}
                <div className="flex items-center gap-3 text-sm md:text-base text-secondary-foreground/80 hover:text-accent transition-colors">
                  <Mail className="w-4 h-4 text-accent flex-shrink-0" />
                  <a href="mailto:contact@sociovia.com" className="underline underline-offset-2">
                    contact@sociovia.com
                  </a>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-3 text-sm md:text-base text-secondary-foreground/80">
                  <Phone className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="italic">8882062043</span>
                </div>

                {/* Business Address */}
                <div className="flex items-start gap-3 text-sm md:text-base text-secondary-foreground/80">
                  <MapPin className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <span>
                    Address: 71 S/f R/s F/p, Hari Nagar Ashram,
                    South Delhi, New Delhi - 110014,
                    Delhi, India
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-base md:text-lg mb-4 md:mb-6">Quick Links</h4>
              <ul className="space-y-2 md:space-y-3">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className="text-sm md:text-base text-secondary-foreground/70 hover:text-accent transition-smooth hover:translate-x-1 inline-block"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4 className="font-bold text-base md:text-lg mb-4 md:mb-6">Account</h4>
              <ul className="space-y-2 md:space-y-3">
                {accountLinks.map((link, index) => (
                  <li key={index}>
                    <Link
                      to={link.href}
                      className="text-sm md:text-base text-secondary-foreground/70 hover:text-accent transition-smooth hover:translate-x-1 inline-block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-bold text-base md:text-lg mb-4 md:mb-6">Resources</h4>
              <ul className="space-y-2 md:space-y-3">
                <li>
                  <Link to="/guides/account-creation" className="text-sm md:text-base text-secondary-foreground/70 hover:text-accent transition-smooth hover:translate-x-1 inline-block">
                    Quick Start Guide
                  </Link>
                </li>
                <li>
                  <Link to="/agentic-flows" className="text-sm md:text-base text-secondary-foreground/70 hover:text-accent transition-smooth hover:translate-x-1 inline-block">
                    Agentic Flows
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="text-sm md:text-base text-secondary-foreground/70 hover:text-accent transition-smooth hover:translate-x-1 inline-block">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/guides/monitor" className="text-sm md:text-base text-secondary-foreground/70 hover:text-accent transition-smooth hover:translate-x-1 inline-block">
                    Monitoring
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal & Social */}
            <div>
              <h4 className="font-bold text-base md:text-lg mb-4 md:mb-6">Legal</h4>
              <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                {legalLinks.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className="text-sm md:text-base text-secondary-foreground/70 hover:text-accent transition-smooth hover:translate-x-1 inline-block"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>

              {/* Social Media */}
              <div>
                <h5 className="font-semibold text-sm md:text-base mb-3 md:mb-4">Follow Us</h5>
                <div className="flex gap-2 md:gap-3">
                  {socialLinks.map((social, index) => (
                    <a
                      key={index}
                      href={social.href}
                      aria-label={social.label}
                      className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-accent-foreground hover:shadow-accent hover:-translate-y-1 transition-smooth"
                    >
                      <social.icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-secondary-foreground/20 py-4 md:py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-secondary-foreground/70 text-xs md:text-sm text-center md:text-left">
            © {new Date().getFullYear()} Adtomate Solutions Private Limited. All rights reserved.
          </div>


        </div>
      </div>
    </footer>
  );
};

export default Footer;
