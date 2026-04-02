import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Terms & Conditions — Pranjay',
    description:
        'Terms and conditions for sellers onboarding on the Pranjay wholesale eCommerce platform.',
};

const sections = [
    {
        number: 1,
        title: 'Definitions',
        content: `Platform means Pranjay website/application. Operator means Pranjay (eCommerce Operator). Seller means any individual/entity listing goods/services on the platform. Customer means end-user purchasing products through the platform.`,
    },
    {
        number: 2,
        title: 'Seller Registration & Eligibility',
        content: `Seller must submit valid PAN, Aadhaar, GSTIN (if applicable), and bank details. Seller must be legally eligible to conduct business in India. Pranjay reserves full right to approve/reject any seller.`,
    },
    {
        number: 3,
        title: 'GST & Legal Compliance',
        content: `Seller shall comply with GST Act 2017 India and all applicable laws. Seller is responsible for correct GST rate, HSN classification, issuing invoices, and filing returns. Pranjay shall collect TCS under Section 52 wherever applicable. Seller must obtain GST registration if required.`,
    },
    {
        number: 4,
        title: 'Product Listing Guidelines',
        content: `Seller must ensure accurate product description, correct pricing, and genuine images. Prohibited listings include illegal goods, counterfeit products, and restricted items. Pranjay may remove listings without notice.`,
    },
    {
        number: 5,
        title: 'Pricing, Commission & Payments',
        content: `Seller agrees to pay commission as agreed and bear payment gateway charges. Payments will be settled after deductions within agreed timeline. Pranjay is not responsible for delays due to banking issues.`,
    },
    {
        number: 6,
        title: 'Order Fulfillment',
        content: `Seller must dispatch orders within agreed time and maintain inventory accuracy. Seller is responsible for packaging and timely shipping. Delay may attract penalties.`,
    },
    {
        number: 7,
        title: 'Returns, Refunds & Cancellation',
        content: `Seller agrees to return policy. Refund liability lies with seller unless platform fault. Seller must process returns promptly.`,
    },
    {
        number: 8,
        title: 'Liability & Indemnity',
        content: `Seller indemnifies Pranjay against complaints, disputes, tax liabilities, and IP violations. Platform acts as intermediary.`,
    },
    {
        number: 9,
        title: 'Intellectual Property',
        content: `Seller confirms products are genuine. Violations will lead to suspension.`,
    },
    {
        number: 10,
        title: 'Suspension & Termination',
        content: `Accounts may be suspended for fraud, complaints, or non-compliance. Seller may exit with prior notice.`,
    },
    {
        number: 11,
        title: 'Confidentiality',
        content: `Both parties must maintain confidentiality of all business-related information shared during the course of engagement on the platform.`,
    },
    {
        number: 12,
        title: 'Data Protection',
        content: `Customer data must not be misused or shared with third parties. Sellers agree to abide by applicable data privacy laws and the platform's data handling policies.`,
    },
    {
        number: 13,
        title: 'Dispute Resolution',
        content: `Jurisdiction shall be courts of Bihar. Disputes may be resolved through arbitration as per applicable Indian arbitration laws.`,
    },
    {
        number: 14,
        title: 'Amendments',
        content: `Pranjay may modify these terms anytime. Continued use of the platform implies acceptance of the revised terms.`,
    },
    {
        number: 15,
        title: 'Force Majeure',
        content: `No liability for delays due to natural disasters, government restrictions, epidemics, or technical failures beyond reasonable control.`,
    },
];

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b border-border">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Link>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                            Legal Document
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
                        Terms &amp; Conditions for Seller
                    </h1>
                    <p className="text-muted-foreground text-base sm:text-lg">
                        Onboarding — <span className="font-semibold text-foreground">Pranjay eCommerce Platform</span>
                    </p>
                    <p className="mt-4 text-sm text-muted-foreground">
                        Last updated: March 2025 &nbsp;·&nbsp; Effective immediately upon registration
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

                {/* Intro notice */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 mb-10">
                    <p className="text-sm text-foreground leading-relaxed">
                        By registering as a seller on the Pranjay platform, you agree to be bound by the following
                        Terms &amp; Conditions. Please read them carefully before proceeding. These terms govern the
                        relationship between Pranjay (the "Operator") and any individual or business entity (the
                        "Seller") using the platform to list and sell products.
                    </p>
                </div>

                {/* Sections */}
                <div className="space-y-8">
                    {sections.map((section) => (
                        <div
                            key={section.number}
                            className="group relative pl-6 border-l-2 border-border hover:border-primary transition-colors duration-200"
                        >
                            <div className="absolute -left-[13px] top-0 h-6 w-6 rounded-full bg-background border-2 border-border group-hover:border-primary transition-colors flex items-center justify-center">
                                <span className="text-[9px] font-bold text-muted-foreground group-hover:text-primary transition-colors">
                                    {section.number}
                                </span>
                            </div>

                            <h2 className="text-base font-semibold text-foreground mb-2">
                                {section.number}. {section.title}
                            </h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {section.content}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Footer note */}
                <div className="mt-14 pt-8 border-t border-border">
                    <p className="text-sm text-muted-foreground text-center">
                        For any questions regarding these Terms &amp; Conditions, please contact us at{' '}
                        <a
                            href="mailto:support@pranjay.com"
                            className="text-primary hover:underline font-medium"
                        >
                            support@pranjay.com
                        </a>
                    </p>
                    <p className="text-xs text-muted-foreground text-center mt-3">
                        © {new Date().getFullYear()} Pranjay. All rights reserved.
                    </p>
                    <div className="flex justify-center mt-6">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Return to Pranjay
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
