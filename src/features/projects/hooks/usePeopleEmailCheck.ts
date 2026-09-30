import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";

import { findUsersByEmails } from "@/features/auth/api/users.api";
import { isValidEmail } from "@/shared/utils/validation";
import type { NewProjectFormValues } from "../types/newProject.types";

type People = NewProjectFormValues["people"];
type PersonIdKey = "dataOwnerId" | "chiefScientistId" | "operatorId";
type PersonEmailKey = "dataOwnerEmail" | "chiefScientistEmail" | "operatorEmail";

/** One "lookup in progress" flag per person, so each icon answers for its own field. */
export interface PeopleCheckState {
    dataOwner: boolean;
    chiefScientist: boolean;
    operator: boolean;
}

/** Wait for the user to stop typing before hitting the users search. */
const CHECK_DEBOUNCE_MS = 400;

/**
 * A person is "checking" only while the exact email its field currently shows
 * is part of the request in flight. Derived (never stored), so an email that
 * was cleared, fixed or already resolved simply stops matching instead of
 * leaving a spinner behind.
 */
const isChecking = (id: People[PersonIdKey], email: string, emailsInFlight: string[]): boolean => {
    const trimmed = email.trim();
    return id === undefined && isValidEmail(trimmed) && emailsInFlight.includes(trimmed.toLowerCase());
};

/**
 * Resolve the project people emails to EcoPart accounts so the People section
 * can show the "confirmed" / "not registered" icon (New Project page and the
 * project Metadata tab share this).
 *
 * A person id of `undefined` means "not resolved yet": this hook looks the
 * email up (debounced, one request for all pending emails) and writes back the
 * matching `user_id`, or `null` when no active account uses that email. Ids
 * already known (from the import-folder metadata) are left untouched. Emails
 * that are not well-formed are skipped: no request, no icon.
 *
 * Returns, per person, whether their own email is being looked up right now.
 */
export const usePeopleEmailCheck = (
    people: People,
    setValues: Dispatch<SetStateAction<NewProjectFormValues>>,
): PeopleCheckState => {
    // The emails of the request currently in flight (lowercased, empty when idle).
    const [emailsInFlight, setEmailsInFlight] = useState<string[]>([]);

    const { dataOwnerEmail, chiefScientistEmail, operatorEmail, dataOwnerId, chiefScientistId, operatorId } = people;

    useEffect(() => {
        const persons: Array<{ emailKey: PersonEmailKey; idKey: PersonIdKey; email: string; id: People[PersonIdKey] }> = [
            { emailKey: "dataOwnerEmail", idKey: "dataOwnerId", email: dataOwnerEmail.trim(), id: dataOwnerId },
            { emailKey: "chiefScientistEmail", idKey: "chiefScientistId", email: chiefScientistEmail.trim(), id: chiefScientistId },
            { emailKey: "operatorEmail", idKey: "operatorId", email: operatorEmail.trim(), id: operatorId },
        ];
        const pending = persons.filter(({ id, email }) => id === undefined && isValidEmail(email));

        if (pending.length === 0) return;

        // Any edit re-runs this effect: the previous timer / response is dropped.
        let cancelled = false;
        const timer = window.setTimeout(async () => {
            const emails = pending.map((person) => person.email);
            setEmailsInFlight(emails.map((email) => email.toLowerCase()));
            try {
                const users = await findUsersByEmails(emails);
                if (cancelled) return;

                const idByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user.user_id]));
                setValues((prev) => {
                    const next = { ...prev.people };
                    for (const { emailKey, idKey, email } of pending) {
                        // Only settle a field whose email is still the one we looked up.
                        if (prev.people[emailKey].trim() !== email) continue;
                        next[idKey] = idByEmail.get(email.toLowerCase()) ?? null;
                    }
                    return { ...prev, people: next };
                });
            } catch (error) {
                // Leave the ids unresolved (no icon); the next edit retries.
                if (!cancelled) console.error("Failed to check project people accounts", error);
            } finally {
                if (!cancelled) setEmailsInFlight([]);
            }
        }, CHECK_DEBOUNCE_MS);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [dataOwnerEmail, chiefScientistEmail, operatorEmail, dataOwnerId, chiefScientistId, operatorId, setValues]);

    return useMemo(() => ({
        dataOwner: isChecking(dataOwnerId, dataOwnerEmail, emailsInFlight),
        chiefScientist: isChecking(chiefScientistId, chiefScientistEmail, emailsInFlight),
        operator: isChecking(operatorId, operatorEmail, emailsInFlight),
    }), [dataOwnerEmail, chiefScientistEmail, operatorEmail, dataOwnerId, chiefScientistId, operatorId, emailsInFlight]);
};
