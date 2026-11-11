import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

const DEFAULT_API_URL = 'https://e-commerce-p21z.vercel.app';

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
    return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();
}

/**
 * Backend REST API — same API the Next.js site uses.
 * `.env` wins over the baked app.json value so one binary can point at
 * staging or production without editing app.json.
 */
export const API_BASE_URL = (
    firstNonEmpty(
        process.env.EXPO_PUBLIC_API_URL,
        extra.apiUrl as string | undefined,
        DEFAULT_API_URL
    ) ?? DEFAULT_API_URL
).replace(/\/+$/, '');

export const FIREBASE_CONFIG = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyAfTsaEeiBGA05yRvg0ltwZYlbns9xDk38',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'pranjay-ec.firebaseapp.com',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'pranjay-ec',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'pranjay-ec.firebasestorage.app',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '713668069063',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '1:713668069063:web:cd1902252d00177dbb60e2',
};

export const APP_NAME = 'Pranjay';
export const SUPPORT_EMAIL = 'support@pranjay.com';
export const WEBSITE_URL = 'https://www.pranjay.com';

/** Public Razorpay key — same as website NEXT_PUBLIC_RAZORPAY_KEY_ID */
export const RAZORPAY_KEY_ID =
    process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? 'rzp_live_SZO4iQslfD86WW';
