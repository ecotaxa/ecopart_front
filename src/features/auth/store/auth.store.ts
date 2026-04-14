import { create } from "zustand";
import type { User } from "../types/user";

type AuthState = {
    user: User | null;
    isAuthenticated: boolean;
    isAuthLoading: boolean;
    setUser: (user: User) => void;
    clearUser: () => void;
    finishAuthLoading: () => void;
    setLoading: (loading: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    // Start in loading state until we check if the user is already authenticated
    isAuthLoading: true,

    setUser: (user) =>
        set({
            user,
            isAuthenticated: true,
            isAuthLoading: false, // Auth check is done once we have a user
        }),

    clearUser: () =>
        set({
            user: null,
            isAuthenticated: false,
            isAuthLoading: false,
        }),

    finishAuthLoading: () =>
        set({
            isAuthLoading: false,
        }),
        // Utility to set loading state directly (e.g. during login/logout)
    setLoading: (loading) => set({ isAuthLoading: loading }),
}));