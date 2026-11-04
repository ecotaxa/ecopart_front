export interface NewProjectFormValues {
    rootFolderPath: string;

    instrument: {
        model: string;
        serialNumber: string;
    };

    metadata: {
        title: string;
        acronym: string;
        ship: string[];
        cruise: string;
        description: string;
    };

    people: {
        dataOwnerName: string;
        dataOwnerEmail: string;
        // EcoPart user id behind the email: `undefined` = not resolved yet
        // (looked up by usePeopleEmailCheck), `null` = no active account uses
        // this email, a number = confirmed account (from the import-folder
        // metadata or the lookup).
        dataOwnerId?: number | null;
        chiefScientistName: string;
        chiefScientistEmail: string;
        chiefScientistId?: number | null;
        operatorName: string;
        operatorEmail: string;
        operatorId?: number | null;
    };

    importSettings: {
        overrideDepthOffset: number;
        enableDescentFilter: boolean;
        /** The data were filtered before their import (asked of a UVP5HD project by the STATS tab). */
        filteredProject: boolean;
        /** Warn in the STATS tab when the samples span more than a year; off for a long project. */
        timeDurationCheck: boolean;
    };

    ecoTaxa: {
        instance: string;
        account: string;
        project: string;
        createNewProject: boolean;
    };

    privileges: Array<{
        userId: string;
        role: "Manager" | "Member";
        contact: boolean;
    }>;

    privacy: {
        privateMonths: number;
        visibleMonths: number;
        publicMonths: number;
    };
}
