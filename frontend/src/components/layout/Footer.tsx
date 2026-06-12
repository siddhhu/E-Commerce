import Link from 'next/link';
import Image from 'next/image';
import { Clock, Mail, Phone, ShieldCheck, Sparkles, Truck } from 'lucide-react';

export function Footer() {
    const quickLinks = [
        { href: '/products', label: 'All Products' },
        { href: '/products', label: 'Categories' },
        { href: '/orders', label: 'Track Order' },
    ];
    const supportLinks = [
        { href: '/contact', label: 'Contact Us' },
        { href: '/faq', label: 'FAQ' },
        { href: '/shipping', label: 'Shipping Policy' },
    ];

    return (
        <footer className="border-t border-pink-100 bg-gradient-to-b from-white to-pink-50/40">
            <div className="container px-4 py-10 sm:py-14">
                <div className="mb-10 grid gap-3 rounded-3xl border border-pink-100 bg-white p-4 shadow-sm sm:grid-cols-3 sm:p-5">
                    <div className="flex items-center gap-3 rounded-2xl bg-pink-50/70 p-4">
                        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
                        <div>
                            <p className="text-sm font-bold text-slate-900">Genuine Beauty Supply</p>
                            <p className="text-xs text-slate-500">Verified products and seller checks.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-pink-50/70 p-4">
                        <Truck className="h-5 w-5 shrink-0 text-primary" />
                        <div>
                            <p className="text-sm font-bold text-slate-900">Fast Dispatch</p>
                            <p className="text-xs text-slate-500">Retail and wholesale orders tracked.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-pink-50/70 p-4">
                        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
                        <div>
                            <p className="text-sm font-bold text-slate-900">Salon Picks</p>
                            <p className="text-xs text-slate-500">Curated cosmetics for repeat buyers.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Brand */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center">
                            <div className="relative h-12 w-40 -ml-3 logo-glow sm:w-44">
                                <Image
                                    src="/logo.png"
                                    alt="Pranjay Logo"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        </Link>
                        <p className="max-w-xs text-sm leading-6 text-slate-600">
                            Your trusted cosmetics marketplace for retail shoppers, salons, and wholesale buyers.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-950">Quick Links</h3>
                        <ul className="space-y-3 text-sm font-medium text-slate-600">
                            {quickLinks.map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className="hover:text-primary transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-950">Support</h3>
                        <ul className="space-y-3 text-sm font-medium text-slate-600">
                            {supportLinks.map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className="hover:text-primary transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-950">Contact</h3>
                        <ul className="space-y-3 text-sm font-medium text-slate-600">
                            <li className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-primary" />
                                support@pranjay.com
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-primary" />
                                +91 78700 53331
                            </li>
                            <li className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                Mon - Sat, 9:00 AM - 6:00 PM
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-10 flex flex-col gap-5 border-t border-pink-100 pt-6 text-center md:flex-row md:items-center md:justify-between md:text-left">
                    <div className="text-sm text-slate-500">
                        <p className="font-medium">© {new Date().getFullYear()} Pranjay. All rights reserved.</p>
                        <p className="mt-1 text-xs font-semibold text-primary/70">
                            Made by <a href="https://www.linkedin.com/in/siddharth-kumar-907a85169/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">Siddharth</a>
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 text-sm font-semibold text-slate-500 sm:gap-6">
                        <Link href="/privacy" className="hover:text-primary transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="/terms" className="hover:text-primary transition-colors">
                            Terms of Service
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
