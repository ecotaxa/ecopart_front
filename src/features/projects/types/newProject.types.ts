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
        filteredBeforeImport: boolean;
        timeDurationCheck: boolean;
    };

    people: {
        dataOwnerName: string;
        dataOwnerEmail: string;
        chiefScientistName: string;
        chiefScientistEmail: string;
        operatorName: string;
        operatorEmail: string;
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

    dataServer: {
        host: string;
        username: string;
        password: string;
        directory: string;
        vectorReference: string;
    };
}