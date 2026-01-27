import { create } from "zustand";

// Currently, the profile page handles its state locally (form state).
// This store is reserved for future global profile state (e.g., UI preferences, cached profile data).

interface ProfileState {
    // Placeholder for future state
    isProfileLoaded: boolean;
    setProfileLoaded: (loaded: boolean) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
    isProfileLoaded: false,
    setProfileLoaded: (loaded) => set({ isProfileLoaded: loaded }),
}));