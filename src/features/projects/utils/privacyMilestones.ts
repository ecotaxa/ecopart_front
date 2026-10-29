import type { ProjectPrivacyStatus } from "./projectAccess";

/** The date each privacy status is (or will be) reached; the private one is the oldest sample. */
export type PrivacyDates = Record<ProjectPrivacyStatus, string | null>;

/**
 * When `months` full months have elapsed since the oldest sample, as the backend counts them
 * (ecopart_back project-privacy.ts privacyMilestone): midnight UTC of the same day of the month,
 * or of the 1st of the following month when the target month has no such day. Null without a
 * readable date.
 */
export function privacyMilestone(oldestSampleDate: string | null, months: number): string | null {
    if (!oldestSampleDate) return null;
    const from = new Date(oldestSampleDate);
    if (Number.isNaN(from.getTime())) return null;
    const day = from.getUTCDate();
    const target = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, day));
    const milestone = target.getUTCDate() === day ? target : new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months + 1, 1));
    return milestone.toISOString();
}

/** The four dates of the privacy timeline, the delays chained from the oldest sample. */
export function privacyDates(
    oldestSampleDate: string | null,
    privateMonths: number,
    visibleMonths: number,
    publicMonths: number,
): PrivacyDates {
    return {
        private: oldestSampleDate,
        visible: privacyMilestone(oldestSampleDate, privateMonths),
        public: privacyMilestone(oldestSampleDate, privateMonths + visibleMonths),
        open: privacyMilestone(oldestSampleDate, privateMonths + visibleMonths + publicMonths),
    };
}
