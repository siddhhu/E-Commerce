import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, authApi } from '@/lib/api';

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    _hasHydrated: boolean;

    // Actions
    setUser: (user: User) => void;
    setTokens: (accessToken: string, refreshToken: string) => void;
    logout: () => void;
    refreshTokens: () => Promise<boolean>;
    adminLogin: (email: string, password: string) => Promise<boolean>;
    setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            _hasHydrated: false,

            setUser: (user) => {
                set({ user, isAuthenticated: true });
            },

            setTokens: (accessToken, refreshToken) => {
                // Also store in localStorage for API client
                if (typeof window !== 'undefined') {
                    localStorage.setItem('access_token', accessToken);
                    localStorage.setItem('refresh_token', refreshToken);
                }
                set({ accessToken, refreshToken });
            },

            logout: () => {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                }
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                });
            },

            refreshTokens: async () => {
                const { refreshToken } = get();
                if (!refreshToken) return false;

                try {
                    set({ isLoading: true });
                    const response = await authApi.refreshToken(refreshToken);

                    set({
                        user: response.user,
                        accessToken: response.access_token,
                        refreshToken: response.refresh_token,
                        isAuthenticated: true,
                        isLoading: false,
                    });

                    if (typeof window !== 'undefined') {
                        localStorage.setItem('access_token', response.access_token);
                        localStorage.setItem('refresh_token', response.refresh_token);
                    }

                    return true;
                } catch {
                    get().logout();
                    set({ isLoading: false });
                    return false;
                }
            },

            adminLogin: async (email, password) => {
                try {
                    set({ isLoading: true });
                    const response = await authApi.adminLogin(email, password);

                    set({
                        user: response.user,
                        accessToken: response.access_token,
                        refreshToken: response.refresh_token,
                        isAuthenticated: true,
                        isLoading: false,
                    });

                    if (typeof window !== 'undefined') {
                        localStorage.setItem('access_token', response.access_token);
                        localStorage.setItem('refresh_token', response.refresh_token);
                    }

                    return true;
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            setHasHydrated: (state) => {
                set({ _hasHydrated: state });
            },
        }),
        {
            name: 'pranjay-auth',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
            onRehydrateStorage: (state) => {
                return (rehydratedState, error) => {
                    if (error) {
                        console.error('An error occurred during hydration', error);
                    } else if (rehydratedState) {
                        // Sync tokens to localStorage for API client on hydration
                        if (typeof window !== 'undefined' && rehydratedState.accessToken) {
                            localStorage.setItem('access_token', rehydratedState.accessToken);
                            if (rehydratedState.refreshToken) {
                                localStorage.setItem('refresh_token', rehydratedState.refreshToken);
                            }
                        }
                        rehydratedState.setHasHydrated(true);
                    }
                };
            },
        }
    )
);
