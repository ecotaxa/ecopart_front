import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store/auth.store";
import { logoutRequest } from "@/features/auth/api/auth.api";
import type { User } from "@/features/auth/types/user";
import { getUserById } from "@/features/auth/api/users.api";
import { CountriesWrapper, type CountryOption } from "@/shared/country-wrapper";
import { REFERENCE_QUERY_KEYS } from "@/shared/api/referenceData.hooks";
import { type EcoTaxaAccountLink, getEcoTaxaAccounts, unlinkEcoTaxaAccount } from "@/shared/api/ecotaxa.api";
import { isNonEmpty, isValidPassword, passwordsMatch } from "@/shared/utils/validation";
import { extractErrorMessage } from "@/shared/utils/errorMessage";
import { changePassword, deleteAccount, fetchMe, updateProfile } from "../api/profile.api";

/** The two tabs of the settings page, in display order (slug = URL segment). */
export const PROFILE_TAB_SLUGS = ["ecopart_account", "ecotaxa_account"] as const;
export type ProfileTabSlug = (typeof PROFILE_TAB_SLUGS)[number];

export interface FeedbackMessage {
    type: "success" | "error";
    text: string;
}

/** Normalise a stored country code to the option list (upper-case ISO code, or none). */
const toKnownCountryCode = (code: string | undefined, options: CountryOption[]) => {
    const upper = code ? code.toUpperCase() : "";
    return options.some((c) => c.code === upper) ? upper : "";
};

/**
 * Hook backing the settings page (`/settings/:userId?/:tabName?`): which account
 * is edited (self, or another user for an admin), the profile / password /
 * delete-account forms, and the linked EcoTaxa accounts list.
 */
export const useProfilePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    // authUser is the logged-in user (drives permissions & self-detection);
    // setUser keeps the store in sync after editing one's own profile.
    const authUser = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);
    const clearUser = useAuthStore((s) => s.clearUser);

    // Canonical URL is /settings/:userId/:tabName. For backward compatibility we
    // also accept /settings/:tabName (no id): a non-numeric first segment is the
    // tab slug, and the target user defaults to the logged-in user.
    const { userId: userIdParam, tabName: tabNameParam } = useParams<{ userId?: string; tabName?: string }>();
    const firstSegmentIsNumeric = userIdParam != null && /^\d+$/.test(userIdParam);
    const routeUserId = firstSegmentIsNumeric ? Number(userIdParam) : null;
    const tabName = firstSegmentIsNumeric ? tabNameParam : (userIdParam ?? tabNameParam);

    // The active tab is driven by the URL slug.
    // Falls back to the legacy `location.state.activeTab`, then to tab 0.
    const slugIndex = tabName ? PROFILE_TAB_SLUGS.indexOf(tabName as ProfileTabSlug) : -1;
    const navState = location.state as { activeTab?: unknown } | null;
    const stateTab = typeof navState?.activeTab === "number" ? navState.activeTab : -1;
    const tabValue = slugIndex >= 0 ? slugIndex : (stateTab >= 0 ? stateTab : 0);

    const handleTabChange = (_e: SyntheticEvent, newValue: number) => {
        const slug = PROFILE_TAB_SLUGS[newValue] ?? PROFILE_TAB_SLUGS[0];
        // Keep the account id in the URL (falls back to the logged-in user's id
        // for the legacy no-id form).
        const idForUrl = routeUserId ?? authUser?.user_id;
        navigate(idForUrl != null ? `/settings/${idForUrl}/${slug}` : `/settings/${slug}`);
    };

    const [loadingUser, setLoadingUser] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // --- STATES: PROFILE ---
    // `currentUser` = logged-in user; `user` = the account being edited (they
    // differ only when an admin edits someone else via /settings/:userId/...).
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [user, setUserData] = useState<User | null>(null);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [organisation, setOrganisation] = useState("");
    const [countryCode, setCountryCode] = useState<string>("");
    const [plannedUsage, setPlannedUsage] = useState("");
    // Admin flag, edited as a form field (only admins can toggle it) and saved with the profile.
    const [isAdmin, setIsAdmin] = useState(false);

    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMessage, setProfileMessage] = useState<FeedbackMessage | null>(null);

    // --- STATES: PASSWORD ---
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<FeedbackMessage | null>(null);

    // --- STATES: DELETE ACCOUNT (Global EcoPart) ---
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // --- STATES: LINKED ACCOUNTS LIST & UNLINK ---
    const [linkedAccounts, setLinkedAccounts] = useState<EcoTaxaAccountLink[]>([]);
    const [showLinkForm, setShowLinkForm] = useState(false);
    // When reconnecting an expired account, seed the form with its email + instance.
    const [reconnectTarget, setReconnectTarget] = useState<{ email: string; instanceId: number } | null>(null);
    const [reconnecting, setReconnecting] = useState<number | null>(null);
    const [openUnlinkDialog, setOpenUnlinkDialog] = useState(false);
    const [accountToUnlink, setAccountToUnlink] = useState<number | null>(null);

    const countryOptions = useMemo<CountryOption[]>(() => CountriesWrapper.list(), []);

    /** Apply a loaded account to the profile form fields. */
    const populateForm = useCallback((target: User) => {
        setFirstName(target.first_name || "");
        setLastName(target.last_name || "");
        setEmail(target.email || "");
        setOrganisation(target.organisation || "");
        setCountryCode(toKnownCountryCode(target.country, countryOptions));
        setPlannedUsage(target.user_planned_usage || "");
        setIsAdmin(!!target.is_admin);
    }, [countryOptions]);

    // --- HELPERS ---
    const fetchLinkedAccounts = useCallback(async (userId: number) => {
        try {
            const accounts = await getEcoTaxaAccounts(userId);
            setLinkedAccounts(accounts);
            // If the user has accounts, default to the list view (form hidden);
            // with none, show the form straight away.
            setShowLinkForm(!(accounts && accounts.length > 0));
        } catch (err) {
            console.error("Failed to load linked accounts", err);
            // SAFETY NET: If the API fails, show the form so the user isn't stuck on an empty screen
            setLinkedAccounts([]);
            setShowLinkForm(true);
        }
        // The project forms read the same list through React Query: keep them in step.
        void queryClient.invalidateQueries({ queryKey: REFERENCE_QUERY_KEYS.ecoTaxaAccounts(userId) });
    }, [queryClient]);

    // --- INITIAL LOAD ---
    useEffect(() => {
        let cancelled = false;

        const loadUserData = async () => {
            setLoadingUser(true);
            setLoadError(null);
            try {
                // Always resolve the logged-in user first (permissions + self check).
                const me = await fetchMe();
                if (cancelled) return;
                setCurrentUser(me);

                // Decide which account to edit. Defaults to self; an id in the URL
                // targets another account (admins only — others are redirected).
                let target: User = me;
                if (routeUserId != null && routeUserId !== me.user_id) {
                    if (!me.is_admin) {
                        navigate(`/settings/${me.user_id}/ecopart_account`, { replace: true });
                        return;
                    }
                    const fetched = await getUserById(routeUserId);
                    if (cancelled) return;
                    if (!fetched) {
                        setLoadError(`No user found with id ${routeUserId}.`);
                        setUserData(null);
                        return;
                    }
                    // AdminUser is a structural superset of User.
                    target = fetched as User;
                }

                setUserData(target);
                populateForm(target);

                // Load connected accounts for the account being edited.
                fetchLinkedAccounts(target.user_id);
            } catch (error) {
                if (cancelled) return;
                console.error("Failed to load user", error);
                setLoadError("Failed to load account.");
            } finally {
                if (!cancelled) setLoadingUser(false);
            }
        };

        loadUserData();
        return () => { cancelled = true; };
    }, [populateForm, fetchLinkedAccounts, routeUserId, navigate]);

    // Whether the account being edited is the logged-in user (vs an admin editing
    // someone else). Password change and store-sync only apply to one's own account.
    const isEditingSelf = !!currentUser && !!user && currentUser.user_id === user.user_id;

    // --- HANDLERS: PROFILE ---
    const handleProfileSave = async () => {
        if (!user) return;
        setProfileMessage(null);
        setProfileSaving(true);
        try {
            const payload: Partial<User> = {
                first_name: firstName, last_name: lastName, organisation, country: countryCode, user_planned_usage: plannedUsage,
            };
            // Only admins can change the admin flag; include it only then.
            if (currentUser?.is_admin) payload.is_admin = isAdmin;
            const updatedProfileData = await updateProfile(user.user_id, payload);
            const mergedUser = { ...user, ...updatedProfileData };
            setUserData(mergedUser);
            // Only sync the auth store when editing one's OWN account — an admin
            // editing another user must not overwrite their own identity.
            if (isEditingSelf) setUser(mergedUser); // keep TopBar Admin link in sync
            setProfileMessage({ type: "success", text: "Profile updated successfully." });
        } catch (err) {
            console.error(err);
            setProfileMessage({ type: "error", text: extractErrorMessage(err, "Failed to update profile.") });
        } finally {
            setProfileSaving(false);
        }
    };

    const handleProfileCancel = () => {
        if (user) {
            populateForm(user);
            setProfileMessage(null);
        }
    };

    // --- HANDLERS: PASSWORD ---
    const passwordIsValid = isValidPassword(newPassword);
    const passwordsAreEqual = passwordsMatch(newPassword, confirmPassword);
    const canSavePassword = isNonEmpty(currentPassword) && isNonEmpty(newPassword) && passwordIsValid && passwordsAreEqual;
    const canSaveProfile = isNonEmpty(firstName) && isNonEmpty(lastName) && isNonEmpty(organisation) && isNonEmpty(countryCode) && isNonEmpty(plannedUsage);

    const handleChangePassword = async () => {
        if (!user || !canSavePassword) return;
        setPasswordMessage(null);
        setPasswordSaving(true);
        try {
            await changePassword(user.user_id, currentPassword, newPassword);
            setPasswordMessage({ type: "success", text: "Password changed successfully." });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            console.error(err);
            setPasswordMessage({ type: "error", text: extractErrorMessage(err, "Failed to change password.") });
        } finally {
            setPasswordSaving(false);
        }
    };

    // --- HANDLERS: DELETE ACCOUNT ---
    const handleDeleteClick = () => setOpenDeleteDialog(true);

    const handleConfirmDelete = async () => {
        if (!user) return;
        setDeleteError(null);
        try {
            await deleteAccount(user.user_id);
            if (isEditingSelf) {
                // Deleting one's own account ends the session: server side (cookies)
                // and client side, then back to the login page.
                try {
                    await logoutRequest();
                } catch (err) {
                    console.warn("[Profile] Logout after account deletion failed", err);
                }
                clearUser();
                queryClient.clear();
                navigate("/login", { state: { successMessage: "Your account has been successfully deleted." } });
            } else {
                // An admin deleted someone else's account — return to the users list.
                navigate("/admin/users");
            }
        } catch (err) {
            console.error(err);
            setDeleteError("Failed to delete account. Please try again or contact support.");
            setOpenDeleteDialog(false);
        }
    };

    // --- HANDLERS: ECOTAXA ACCOUNTS ---
    const handleLoginSuccess = async () => {
        if (!user) return;
        // 1. Refresh list
        await fetchLinkedAccounts(user.user_id);
        // 2. Hide form and clear any reconnect prefill (form remounts fresh next time)
        setShowLinkForm(false);
        setReconnectTarget(null);
    };

    // Reconnect an expired account: unlink it first, then open the link form
    // pre-filled with its email + instance so the user just re-enters the password.
    const handleReconnectClick = async (account: EcoTaxaAccountLink) => {
        if (!user) return;
        const target = {
            email: account.ecotaxa_user_email || account.ecotaxa_user_login || "",
            instanceId: account.ecotaxa_account_instance_id,
        };
        setReconnecting(account.ecotaxa_account_id);
        try {
            await unlinkEcoTaxaAccount(user.user_id, account.ecotaxa_account_id);
            await fetchLinkedAccounts(user.user_id);
        } catch (err) {
            console.error("Failed to unlink account before reconnecting", err);
        } finally {
            setReconnecting(null);
        }
        // Open the pre-filled form (fetchLinkedAccounts may have toggled it off).
        setReconnectTarget(target);
        setShowLinkForm(true);
    };

    const openLinkForm = () => {
        setReconnectTarget(null);
        setShowLinkForm(true);
    };

    const closeLinkForm = () => {
        setShowLinkForm(false);
        setReconnectTarget(null);
    };

    // 1. User clicks the Logout icon -> Open confirmation dialog
    const handleUnlinkClick = (accountId: number) => {
        setAccountToUnlink(accountId);
        setOpenUnlinkDialog(true);
    };

    // 2. User confirms -> Call API and refresh list
    const handleConfirmUnlink = async () => {
        if (!user || accountToUnlink === null) return;

        try {
            await unlinkEcoTaxaAccount(user.user_id, accountToUnlink);
            // No global message needed here as the item just disappears from list
            await fetchLinkedAccounts(user.user_id);
        } catch (err) {
            console.error("Failed to unlink account", err);
        } finally {
            setOpenUnlinkDialog(false);
            setAccountToUnlink(null);
        }
    };

    return {
        // Page
        loadingUser,
        loadError,
        tabValue,
        handleTabChange,
        currentUser,
        user,
        isEditingSelf,
        countryOptions,
        navigate,

        // Profile form
        profile: {
            firstName, setFirstName,
            lastName, setLastName,
            email,
            organisation, setOrganisation,
            countryCode, setCountryCode,
            plannedUsage, setPlannedUsage,
            isAdmin, setIsAdmin,
            saving: profileSaving,
            message: profileMessage,
            canSave: canSaveProfile,
            save: handleProfileSave,
            cancel: handleProfileCancel,
        },

        // Password form
        password: {
            currentPassword, setCurrentPassword,
            newPassword, setNewPassword,
            confirmPassword, setConfirmPassword,
            isValid: passwordIsValid,
            matches: passwordsAreEqual,
            canSave: canSavePassword,
            saving: passwordSaving,
            message: passwordMessage,
            change: handleChangePassword,
        },

        // Delete account
        deleteAccount: {
            dialogOpen: openDeleteDialog,
            error: deleteError,
            open: handleDeleteClick,
            close: () => setOpenDeleteDialog(false),
            confirm: handleConfirmDelete,
        },

        // EcoTaxa accounts
        ecoTaxa: {
            linkedAccounts,
            showLinkForm,
            reconnectTarget,
            reconnecting,
            openLinkForm,
            closeLinkForm,
            onLoginSuccess: handleLoginSuccess,
            reconnect: handleReconnectClick,
            unlinkDialogOpen: openUnlinkDialog,
            requestUnlink: handleUnlinkClick,
            cancelUnlink: () => setOpenUnlinkDialog(false),
            confirmUnlink: handleConfirmUnlink,
        },
    };
};
