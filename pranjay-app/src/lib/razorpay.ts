import Constants from 'expo-constants';
import { RAZORPAY_KEY_ID } from '@/src/config';

export interface RazorpaySuccess {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

/** True when running a dev/production build with native modules (not Expo Go). */
export function isRazorpayNativeAvailable(): boolean {
    if (Constants.appOwnership === 'expo') return false;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('react-native-razorpay');
        return true;
    } catch {
        return false;
    }
}

export const RAZORPAY_EXPO_GO_MESSAGE =
    'Online payment needs a Pranjay dev build (not Expo Go). Run: npx expo run:ios — see docs/IOS_SETUP.md';

/**
 * Opens Razorpay checkout — same two-phase flow as the website.
 * Backend: POST /checkout/prepare → native SDK → POST /checkout/complete
 */
export async function openRazorpayPayment(params: {
    orderId: string;
    amountPaise: number;
    description: string;
    prefill: { name: string; email?: string; contact: string };
}): Promise<RazorpaySuccess> {
    if (!isRazorpayNativeAvailable()) {
        throw new Error(RAZORPAY_EXPO_GO_MESSAGE);
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RazorpayCheckout = require('react-native-razorpay').default as {
        open: (options: Record<string, unknown>) => Promise<RazorpaySuccess>;
    };

    const data = await RazorpayCheckout.open({
        description: params.description,
        currency: 'INR',
        key: RAZORPAY_KEY_ID,
        amount: String(params.amountPaise),
        name: 'Pranjay Cosmetics',
        order_id: params.orderId,
        prefill: {
            name: params.prefill.name,
            email: params.prefill.email || 'customer@pranjay.com',
            contact: params.prefill.contact.replace(/\D/g, '').slice(-10),
        },
        theme: { color: '#E91E63' },
    });

    return {
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_order_id: data.razorpay_order_id,
        razorpay_signature: data.razorpay_signature,
    };
}
