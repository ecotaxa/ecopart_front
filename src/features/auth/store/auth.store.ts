import { create } from "zustand";
import type { User } from "../types/user";

type AuthState = {
    user: User | null;
    isAuthenticated: boolean;
    isAuthLoading: boolean;
    setUser: (user: User) => void;
    clearUser: () => void;
    finishAuthLoading: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isAuthLoading: true,

    setUser: (user) =>
        set({
            user,
            isAuthenticated: true,
            isAuthLoading: false,
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
}));