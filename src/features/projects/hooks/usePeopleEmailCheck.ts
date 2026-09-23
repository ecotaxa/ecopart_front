import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { findUsersByEmails } from "@/features/auth/api/users.api";
import { isValidEmail } from "@/shared/utils/validation";
import type { NewProjectFormValues } from "../types/newProject.types";

type People = NewProjectFormValues["people"];
type PersonIdKey = "dataOwnerId" | "chiefScientistId" | "operatorId";
type PersonEmailKey = "dataOwnerEmail" | "chiefScientistEmail" | "operatorEmail";

/** Wait for the user to stop typing before hitting the users search. */
const CHECK_DEBOUNCE_MS = 400;

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
 * Returns whether a lookup is in flight so the section can show a spinner.
 */
export const usePeopleEmailCheck = (
    people: People,
    setValues: Dispatch<SetStateAction<NewProjectFormValues>>,
): boolean => {
    const [checking, setChecking] = useState(false);

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
            setChecking(true);
            try {
                const users = await findUsersByEmails(pending.map((person) => person.email));
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
                if (!cancelled) setChecking(false);
            }
        }, CHECK_DEBOUNCE_MS);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [dataOwnerEmail, chiefScientistEmail, operatorEmail, dataOwnerId, chiefScientistId, operatorId, setValues]);

    return checking;
};
