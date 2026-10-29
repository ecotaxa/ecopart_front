import PrivacyStatusInfo from "@/shared/components/PrivacyStatusInfo";
import type { ProjectStatsPrivacy } from "../../api/projectStats.api";
import PrivacyTimeline from "../PrivacyTimeline";
import StatsSection from "./StatsSection";

/**
 * The privacy timeline of the project: the four statuses, the reached ones ticked,
 * each with the date it is (or will be) reached, counted from the oldest sample.
 */
export default function ProjectPrivacyTimeline({ privacy }: { privacy: ProjectStatsPrivacy }) {
    return (
        <StatsSection title="Data privacy status" info={<PrivacyStatusInfo />}>
            <PrivacyTimeline
                status={privacy.status}
                dates={{
                    private: privacy.oldest_sample_utc_date_time,
                    visible: privacy.visible_utc_date_time,
                    public: privacy.public_utc_date_time,
                    open: privacy.open_utc_date_time,
                }}
            />
        </StatsSection>
    );
}
