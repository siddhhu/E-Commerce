import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { api, configureApiAuth } from '@/src/lib/api';
import type { User } from '@/src/lib/types';

const ACCESS_KEY = 'pranjay_access_token';
const REFRESH_KEY = 'pranjay_refresh_token';
const USER_KEY = 'pranjay_user';

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    user: User | null;
    hydrated: boolean;
    hydrate: () => Promise<void>;
    setSession: (access: string, refresh: string, user: User) => Promise<void>;
    setUser: (user: User) => Promise<void>;
    reloadUser: () => Promise<User | null>;
    logout: () => Promise<void>;
    isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    accessToken: null,
    refreshToken: null,
    user: null,
    hydrated: false,

    hydrate: async () => {
        try {
            const [accessToken, refreshToken, userJson] = await Promise.all([
                SecureStore.getItemAsync(ACCESS_KEY),
                SecureStore.getItemAsync(REFRESH_KEY),
                SecureStore.getItemAsync(USER_KEY),
            ]);

            set({
                accessToken,
                refreshToken,
                user: userJson ? (JSON.parse(userJson) as User) : null,
                hydrated: true,
            });
        } catch {
            set({ accessToken: null, refreshToken: null, user: null, hydrated: true });
        }
    },

    setSession: async (accessToken, refreshToken, user) => {
        set({ accessToken, refreshToken, user });
        await Promise.all([
            SecureStore.setItemAsync(ACCESS_KEY, accessToken),
            SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
            SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
        ]);
    },

    setUser: async (user) => {
        set({ user });
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    },

    reloadUser: async () => {
        if (!get().accessToken) return null;
        try {
            const user = await api.getMe();
            await get().setUser(user);
            return user;
        } catch {
            return get().user;
        }
    },

    logout: async () => {
        set({ accessToken: null, refreshToken: null, user: null });
        await Promise.all([
            SecureStore.deleteItemAsync(ACCESS_KEY),
            SecureStore.deleteItemAsync(REFRESH_KEY),
            SecureStore.deleteItemAsync(USER_KEY),
        ]);
    },

    isAuthenticated: () => Boolean(get().accessToken),
}));

/** Coalesce concurrent refreshes so a single refresh token is never spent twice. */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshSession(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
        const refresh = useAuthStore.getState().refreshToken;
        if (!refresh) return null;
        try {
            const res = await api.refresh(refresh);
            await useAuthStore.getState().setSession(res.access_token, res.refresh_token, res.user);
            return res.access_token;
        } catch {
            await useAuthStore.getState().logout();
            return null;
        } finally {
            refreshInFlight = null;
        }
    })();

    return refreshInFlight;
}

configureApiAuth(
    () => useAuthStore.getState().accessToken,
    refreshSession
);
