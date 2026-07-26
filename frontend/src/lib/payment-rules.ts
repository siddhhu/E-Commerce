export const SUPPORT_PHONE = '+91 78700 53331';
export const SUPPORT_PHONE_TEL = 'tel:+917870053331';

export const COD_ALLOWED_STATES = ['Bihar'] as const;

export const COD_RESTRICTED_MESSAGE =
    'Cash on Delivery is limited to Bihar as we are expanding our business. We will enable COD in more states as soon as possible.';

export function isCodAllowedForState(state: string): boolean {
    return COD_ALLOWED_STATES.some(
        (allowedState) => allowedState.toLowerCase() === state.trim().toLowerCase()
    );
}
