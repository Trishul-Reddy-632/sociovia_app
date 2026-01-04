// LandingFooter.tsx
// Premium dark footer with minimal links

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Twitter, Linkedin, Instagram, Mail } from 'lucide-react';
import logo from '@/assets/sociovia_logo.png';

const footerLinks = {
    product: [
        { name: 'Dashboard', href: '/login' },
        { name: 'Features', href: '#features' },
        { name: 'Pricing', href: '/pricing' },
    ],
    company: [
        { name: 'About', href: '/about' },
        { name: 'Contact', href: 'mailto:hello@sociovia.in' },
    ],
    legal: [
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Terms of Service', href: '/terms' },
    ],
};

const socialLinks = [
    { icon: Twitter, href: 'https://twitter.com/sociovia', label: 'Twitter' },
    { icon: Linkedin, href: 'https://linkedin.com/company/sociovia', label: 'LinkedIn' },
    { icon: Instagram, href: 'https://instagram.com/sociovia', label: 'Instagram' },
    { icon: Mail, href: 'mailto:hello@sociovia.in', label: 'Email' },
];

export default function LandingFooter() {
    return (
        <footer className="bg-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <img src={logo} alt="Sociovia" className="h-10 mb-4 brightness-200" />
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Where Marketing Meets AI & Automation. Built for small businesses that think big.
                        </p>
                    </div>

                    {/* Product Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Product</h4>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        to={link.href}
                                        className="text-gray-400 hover:text-emerald-400 transition-colors text-sm"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Company</h4>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        to={link.href}
                                        className="text-gray-400 hover:text-emerald-400 transition-colors text-sm"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h4 className="font-semibold text-white mb-4">Legal</h4>
                        <ul className="space-y-3">
                            {footerLinks.legal.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        to={link.href}
                                        className="text-gray-400 hover:text-emerald-400 transition-colors text-sm"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-800 pt-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Copyright */}
                        <p className="text-gray-500 text-sm">
                            © {new Date().getFullYear()} Sociovia Technologies. All rights reserved.
                        </p>

                        {/* Social Links */}
                        <div className="flex items-center gap-4">
                            {socialLinks.map((social) => {
                                const Icon = social.icon;
                                return (
                                    <motion.a
                                        key={social.label}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        whileHover={{ scale: 1.1, y: -2 }}
                                        className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:bg-gray-700 transition-colors"
                                        aria-label={social.label}
                                    >
                                        <Icon className="w-5 h-5" />
                                    </motion.a>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
