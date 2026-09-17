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
        // EcoPart user id resolved from the email by the import-folder metadata
        // (null when the email is not a known EcoPart account).
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
