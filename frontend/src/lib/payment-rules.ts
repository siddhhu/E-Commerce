export const COD_ALLOWED_STATES = ['Bihar'] as const;

export const COD_RESTRICTED_MESSAGE =
    'We are not accepting COD orders outside Bihar. We are expanding and will enable this soon.';

export function isCodAllowedForState(state: string): boolean {
    return COD_ALLOWED_STATES.some(
        (allowedState) => allowedState.toLowerCase() === state.trim().toLowerCase()
    );
}
