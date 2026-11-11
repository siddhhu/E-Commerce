/** KYC document helpers — mirror backend/app/core/kyc.py. */
import type { User } from '@/src/lib/types';

export const KYC_DOCUMENT_TYPES = [
    { id: 'gst', label: 'GST Certificate', short: 'GST' },
    { id: 'pan', label: 'PAN Card', short: 'PAN' },
    { id: 'aadhaar', label: 'Aadhaar Card', short: 'Aadhaar' },
    { id: 'voter_id', label: 'Voter ID', short: 'Voter ID' },
    { id: 'shop_license', label: 'Shop License', short: 'Shop license' },
    { id: 'msme', label: 'MSME Certificate', short: 'MSME' },
    { id: 'shop_establishment', label: 'Shop & Establishment License', short: 'Shop & Est.' },
    { id: 'udyog_aadhar', label: 'UDyog Aadhar (Udyam)', short: 'Udyam' },
] as const;

export type KycDocumentType = (typeof KYC_DOCUMENT_TYPES)[number]['id'];

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const VOTER_ID_REGEX = /^[A-Z0-9]{10,20}$/;
const UDYAM_REGEX = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;

export function normalizeDocumentNumber(type: KycDocumentType | string, value: string): string {
    const normalized = (value || '').trim().toUpperCase().replace(/\s/g, '');
    return type === 'aadhaar' ? normalized.replace(/-/g, '') : normalized;
}

export function isValidDocumentNumber(type: KycDocumentType | string, value: string): boolean {
    const normalized = normalizeDocumentNumber(type, value);
    if (type === 'gst') return GST_REGEX.test(normalized);
    if (type === 'pan') return PAN_REGEX.test(normalized);
    if (type === 'aadhaar') return AADHAAR_REGEX.test(normalized);
    if (type === 'voter_id') return VOTER_ID_REGEX.test(normalized);
    if (type === 'msme' || type === 'udyog_aadhar') return UDYAM_REGEX.test(normalized) || normalized.length >= 5;
    return normalized.length >= 5;
}

export function documentLabel(type?: string | null): string {
    return KYC_DOCUMENT_TYPES.find((doc) => doc.id === type)?.label ?? 'Business document';
}

const DOC_FIELDS: Record<string, keyof User> = {
    gst: 'gst_number',
    pan: 'pan',
    aadhaar: 'aadhaar',
    voter_id: 'voter_id',
    shop_license: 'shop_license',
    msme: 'msme_number',
    shop_establishment: 'shop_establishment_license',
    udyog_aadhar: 'udyog_aadhar',
};

/** Best saved document for a user — used to prefill the verification step. */
export function savedDocumentFor(user: User | null | undefined): { type: KycDocumentType; number: string } {
    if (!user) return { type: 'gst', number: '' };
    const preferred = user.kyc_document_type as KycDocumentType | undefined;
    if (preferred && DOC_FIELDS[preferred]) {
        return { type: preferred, number: String(user[DOC_FIELDS[preferred]] ?? '') };
    }
    for (const doc of KYC_DOCUMENT_TYPES) {
        const value = user[DOC_FIELDS[doc.id]];
        if (typeof value === 'string' && value.trim()) {
            return { type: doc.id, number: value };
        }
    }
    return { type: 'gst', number: '' };
}

export function isKycComplete(user: User | null | undefined): boolean {
    return Boolean(user?.kyc_verified_at && user?.kyc_document_url && user?.kyc_document_type);
}
