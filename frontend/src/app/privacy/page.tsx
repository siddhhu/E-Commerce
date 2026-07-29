import type { Metadata } from 'next';
import Link from 'next/link';
import { ShopShell } from '@/components/layout/ShopShell';

export const metadata: Metadata = {
    title: 'Privacy Policy | Pranjay',
    description: 'How Pranjay collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
    return (
        <ShopShell hideBottomNav mainClassName="py-8">
            <div className="container max-w-3xl prose prose-slate">
                <h1 className="text-3xl font-extrabold text-slate-950">Privacy Policy</h1>
                <p className="text-muted-foreground">Last updated: July 2026</p>

                <section className="mt-8 space-y-4 text-sm leading-relaxed text-slate-700">
                    <h2 className="text-lg font-bold text-slate-900">1. Information We Collect</h2>
                    <p>
                        When you use Pranjay (website or mobile app), we may collect your phone number, name,
                        delivery address, order history, and payment-related identifiers processed securely via Razorpay.
                        We do not store your full card or UPI credentials on our servers.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900">2. How We Use Your Information</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Process and deliver your orders</li>
                        <li>Authenticate your account via phone OTP</li>
                        <li>Send order updates and support communications</li>
                        <li>Improve our catalog, pricing, and user experience</li>
                    </ul>

                    <h2 className="text-lg font-bold text-slate-900">3. Data Sharing</h2>
                    <p>
                        We share data only with service providers necessary to operate the platform (payment gateway,
                        cloud hosting, email/SMS). We do not sell your personal information to third parties.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900">4. Data Security</h2>
                    <p>
                        We use industry-standard encryption (HTTPS), secure JWT authentication, and access controls
                        to protect your data. Payment processing is handled by Razorpay in compliance with applicable standards.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900">5. Your Rights</h2>
                    <p>
                        You may request access, correction, or deletion of your account data by contacting us at{' '}
                        <a href="mailto:support@pranjay.com" className="text-primary hover:underline">support@pranjay.com</a>.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900">6. Contact</h2>
                    <p>
                        For privacy-related questions, visit our{' '}
                        <Link href="/contact" className="text-primary hover:underline">Contact page</Link> or email support@pranjay.com.
                    </p>
                </section>
            </div>
        </ShopShell>
    );
}
