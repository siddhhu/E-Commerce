import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, authApi } from '@/lib/api';

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    setUser: (user: User) => void;
    setTokens: (accessToken: string, refreshToken: string) => void;
    logout: () => void;
    refreshTokens: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,

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
        }),
        {
            name: 'pranjay-auth',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
