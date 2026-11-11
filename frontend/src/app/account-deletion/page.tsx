import type { Metadata } from 'next';
import Link from 'next/link';
import { ShopShell } from '@/components/layout/ShopShell';

export const metadata: Metadata = {
    title: 'Delete Your Account | Pranjay',
    description:
        'How to request deletion of your Pranjay account, what data is removed, and what we are required to keep.',
};

const STEPS = [
    'Open the Pranjay app and sign in with the mobile number linked to your account.',
    'Go to the Profile tab and tap “Delete my account” in the Support section.',
    'Send the request from the email or phone number registered on your account, with the subject “Delete my account”.',
];

export default function AccountDeletionPage() {
    return (
        <ShopShell hideBottomNav mainClassName="py-8">
            <div className="container max-w-3xl prose prose-slate">
                <h1 className="text-3xl font-extrabold text-slate-950">Delete your Pranjay account</h1>
                <p className="text-muted-foreground">Last updated: November 2026</p>

                <section className="mt-8 space-y-4 text-sm leading-relaxed text-slate-700">
                    <p>
                        This page explains how to request deletion of your Pranjay account and the personal data
                        associated with it. It applies to the Pranjay Android app and the pranjay.com website.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900">1. How to request deletion</h2>
                    <ol className="list-decimal pl-5 space-y-2">
                        {STEPS.map((step) => (
                            <li key={step}>{step}</li>
                        ))}
                    </ol>
                    <p>
                        You can also email{' '}
                        <a href="mailto:support@pranjay.com?subject=Delete%20my%20account" className="text-primary hover:underline">
                            support@pranjay.com
                        </a>{' '}
                        with the subject line <strong>“Delete my account”</strong> from the email or phone number
                        registered on your account. We ask for this only so we can confirm the request came from
                        the account owner.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900">2. What we delete</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Your name, business name, phone number and email address</li>
                        <li>Saved delivery addresses and GST/business identifiers</li>
                        <li>Your cart, wishlist and browsing history</li>
                        <li>Uploaded KYC documents (PAN, GST certificate, ID proofs) and their stored files</li>
                        <li>Your login record, so the number can no longer sign in to this account</li>
                    </ul>

                    <h2 className="text-lg font-bold text-slate-900">3. What we keep, and why</h2>
                    <p>
                        Completed order and invoice records are retained for the period required by Indian tax and
                        accounting law (currently up to 8 years). These records are kept only for statutory
                        compliance, dispute resolution and fraud prevention — they are not used for marketing, and
                        your contact details are removed from them wherever the law allows.
                    </p>
                    <p>
                        If you are a seller with a pending payout, we settle outstanding amounts before closing the
                        account.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900">4. How long it takes</h2>
                    <p>
                        We confirm every request within <strong>7 business days</strong> and complete the deletion
                        within <strong>30 days</strong> of confirmation. You will receive a final email once your
                        account data has been removed.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900">5. Related policies</h2>
                    <p>
                        For more detail on how we handle your information, read our{' '}
                        <Link href="/privacy" className="text-primary hover:underline">
                            Privacy Policy
                        </Link>{' '}
                        and{' '}
                        <Link href="/terms" className="text-primary hover:underline">
                            Terms of Service
                        </Link>
                        .
                    </p>

                    <h2 className="text-lg font-bold text-slate-900">6. Contact</h2>
                    <p>
                        Questions about a deletion request? Email{' '}
                        <a href="mailto:support@pranjay.com" className="text-primary hover:underline">
                            support@pranjay.com
                        </a>{' '}
                        or use our{' '}
                        <Link href="/contact" className="text-primary hover:underline">
                            Contact page
                        </Link>
                        .
                    </p>
                </section>
            </div>
        </ShopShell>
    );
}
