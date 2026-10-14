import { isValidEmail } from "@/shared/utils/validation";
import type { NewProjectFormValues } from "../types/newProject.types";
import type { MinimalUserModel, Project } from "../api/projects.api";

/**
 * Helpers shared by the New Project form and the project Metadata / Security
 * tabs: one initial state, one set of parsers, one validator and one
 * backend→form mapping so the three screens can never drift apart.
 */

/** Default privacy delays (in months) applied to a new project. */
export const DEFAULT_PRIVACY = { privateMonths: 2, visibleMonths: 24, publicMonths: 36 } as const;

export const createEmptyProjectFormValues = (): NewProjectFormValues => ({
    rootFolderPath: "",
    instrument: { model: "", serialNumber: "" },
    metadata: { title: "", acronym: "", ship: [], cruise: "", description: "" },
    people: {
        dataOwnerName: "",
        dataOwnerEmail: "",
        dataOwnerId: undefined,
        chiefScientistName: "",
        chiefScientistEmail: "",
        chiefScientistId: undefined,
        operatorName: "",
        operatorEmail: "",
        operatorId: undefined,
    },
    importSettings: { overrideDepthOffset: 0, enableDescentFilter: true },
    ecoTaxa: { instance: "", account: "", project: "", createNewProject: true },
    privileges: [],
    privacy: { ...DEFAULT_PRIVACY },
});

/** Parse an integer, falling back to `fallback` when the input is not a number (never NaN). */
export const safeParseInt = (value: string, fallback = 1): number => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

/** Parse a positive integer; anything invalid or below 1 becomes 1. */
export const parsePositiveInt = (value: string | number): number => {
    const parsed = typeof value === "string" ? Number.parseInt(value, 10) : value;
    return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
};

/** Parse a numeric select value to a nullable integer; empty/undefined/null → null. */
export const toNullableInt = (value: string | number | null | undefined): number | null => {
    if (value === undefined || value === null || value === "") return null;
    const parsed = typeof value === "string" ? Number.parseInt(value, 10) : value;
    return Number.isNaN(parsed) ? null : parsed;
};

/** Flat, per-field error map consumed by the presentational sections. */
export interface ProjectFormErrors {
    rootFolderPath?: string;

    instrumentModel?: string;
    instrumentSerialNumber?: string;

    projectTitle?: string;
    projectAcronym?: string;
    ship?: string;
    cruise?: string;
    projectDescription?: string;

    dataOwnerName?: string;
    dataOwnerEmail?: string;
    chiefScientistName?: string;
    chiefScientistEmail?: string;
    operatorName?: string;
    operatorEmail?: string;

    ecoTaxaInstance?: string;
    ecoTaxaAccount?: string;
    ecoTaxaProject?: string;

    privilegesManager?: string;
    privilegesContact?: string;

    privateMonths?: string;
    visibleMonths?: string;
    publicMonths?: string;
}

/** Which groups of rules a screen wants to enforce (each tab validates only what it edits). */
export interface ProjectValidationScope {
    metadata?: boolean;
    privileges?: boolean;
    privacy?: boolean;
}

const validatePerson = (
    name: string,
    email: string,
    labels: { name: string; email: string },
): { name?: string; email?: string } => {
    const out: { name?: string; email?: string } = {};
    if (!name.trim()) {
        out.name = `${labels.name} is required.`;
    } else if (isValidEmail(name.trim())) {
        // The name field holds something that looks like an email: the two were most likely swapped.
        out.name = "This looks like an email address. Please enter a name.";
    }
    if (!email.trim()) {
        out.email = `${labels.email} is required.`;
    } else if (!isValidEmail(email.trim())) {
        out.email = "Please enter a valid email address.";
    }
    return out;
};

/** The subset of the form the SECURITY tab holds (privileges + privacy only). */
export type SecurityFormValues = Pick<NewProjectFormValues, "privileges" | "privacy">;

const isFullForm = (values: SecurityFormValues | NewProjectFormValues): values is NewProjectFormValues =>
    "rootFolderPath" in values;

/**
 * Validate the project form. Strings are trimmed so whitespace cannot bypass a
 * required field. Returns an empty object when everything passes. The metadata
 * rules only run on the full form (the SECURITY tab passes its own subset).
 */
export const validateProjectForm = (
    values: NewProjectFormValues | SecurityFormValues,
    scope: ProjectValidationScope = { metadata: true, privileges: true, privacy: true },
): ProjectFormErrors => {
    const errors: ProjectFormErrors = {};

    if (scope.metadata && isFullForm(values)) {
        if (!values.rootFolderPath.trim()) errors.rootFolderPath = "Root folder path is required.";

        if (!values.instrument.model.trim()) errors.instrumentModel = "Instrument model is required.";
        if (!values.instrument.serialNumber.trim()) errors.instrumentSerialNumber = "Instrument serial number is required.";

        if (!values.metadata.title.trim()) errors.projectTitle = "Project title is required.";
        if (!values.metadata.acronym.trim()) errors.projectAcronym = "Project acronym is required.";
        if (values.metadata.ship.length === 0) errors.ship = "At least one ship must be selected.";
        if (!values.metadata.cruise.trim()) errors.cruise = "Cruise is required.";
        if (!values.metadata.description.trim()) errors.projectDescription = "Project description is required.";

        const owner = validatePerson(values.people.dataOwnerName, values.people.dataOwnerEmail, {
            name: "Data owner name", email: "Data owner email",
        });
        errors.dataOwnerName = owner.name;
        errors.dataOwnerEmail = owner.email;

        const chief = validatePerson(values.people.chiefScientistName, values.people.chiefScientistEmail, {
            name: "Chief scientist name", email: "Chief scientist email",
        });
        errors.chiefScientistName = chief.name;
        errors.chiefScientistEmail = chief.email;

        const operator = validatePerson(values.people.operatorName, values.people.operatorEmail, {
            name: "Operator name", email: "Operator email",
        });
        errors.operatorName = operator.name;
        errors.operatorEmail = operator.email;
    }

    if (scope.privileges) {
        if (!values.privileges.some((row) => row.role === "Manager")) {
            errors.privilegesManager = "At least one user must be a manager.";
        }
        const selectedContact = values.privileges.find((row) => row.contact);
        if (!selectedContact) {
            errors.privilegesContact = "A contact is required.";
        } else if (!selectedContact.userId.trim()) {
            errors.privilegesContact = "The contact must be linked to a valid user.";
        }
    }

    if (scope.privacy) {
        if (values.privacy.privateMonths < 1) errors.privateMonths = "Delay must be at least 1 month.";
        if (values.privacy.visibleMonths < 1) errors.visibleMonths = "Delay must be at least 1 month.";
        if (values.privacy.publicMonths < 1) errors.publicMonths = "Delay must be at least 1 month.";
    }

    // Drop the `undefined` entries so `Object.values(errors)[0]` is the first real message.
    for (const key of Object.keys(errors) as (keyof ProjectFormErrors)[]) {
        if (errors[key] === undefined) delete errors[key];
    }
    return errors;
};

/**
 * Map the backend error message to the most relevant inline field(s), keeping
 * the raw text so it reads exactly as the server phrased it.
 */
export const mapBackendErrorToFieldErrors = (message: string): Partial<ProjectFormErrors> => {
    const lowered = message.toLowerCase();

    if (lowered.includes("manager")) return { privilegesManager: message };
    if (lowered.includes("contact")) return { privilegesContact: message };
    // Word-bounded so "relationship" does not land on the Ship field.
    if (/\bship\b/.test(lowered)) return { ship: message };
    if ((lowered.includes("ecotaxa") && lowered.includes("project")) || lowered.includes("already linked")) {
        return { ecoTaxaProject: message };
    }
    if (lowered.includes("privacy") || lowered.includes("delay")) {
        return { privateMonths: message, visibleMonths: message, publicMonths: message };
    }
    return {};
};

/** Privilege rows as the backend expects them: a contact plus manager / member arrays. */
export const buildPrivilegesPayload = (privileges: NewProjectFormValues["privileges"]) => {
    const selectedContact = privileges.find((row) => row.contact);
    const toUser = (row: NewProjectFormValues["privileges"][number]): MinimalUserModel => ({
        user_id: safeParseInt(row.userId),
    });
    return {
        contact: selectedContact ? toUser(selectedContact) : undefined,
        managers: privileges.filter((row) => row.role === "Manager" && row.userId.trim() !== "").map(toUser),
        members: privileges.filter((row) => row.role === "Member" && row.userId.trim() !== "").map(toUser),
    };
};

/** Privilege rows (contact radio + manager/member roles) from a backend project. */
export const mapProjectPrivileges = (project: Project): NewProjectFormValues["privileges"] => [
    ...(project.managers ?? []).map((manager) => ({
        userId: manager.user_id.toString(),
        role: "Manager" as const,
        contact: project.contact?.user_id === manager.user_id,
    })),
    ...(project.members ?? []).map((member) => ({
        userId: member.user_id.toString(),
        role: "Member" as const,
        contact: project.contact?.user_id === member.user_id,
    })),
];

/** Privacy delays from a backend project, with the creation defaults for missing values. */
export const mapProjectPrivacy = (project: Project): NewProjectFormValues["privacy"] => ({
    privateMonths: project.privacy_duration ?? DEFAULT_PRIVACY.privateMonths,
    visibleMonths: project.visible_duration ?? DEFAULT_PRIVACY.visibleMonths,
    publicMonths: project.public_duration ?? DEFAULT_PRIVACY.publicMonths,
});

/** Full form state from a backend project (the Metadata tab's initial values). */
export const mapProjectToFormValues = (project: Project): NewProjectFormValues => ({
    rootFolderPath: project.root_folder_path || "",
    instrument: {
        model: project.instrument_model || "",
        serialNumber: project.serial_number || "",
    },
    metadata: {
        title: project.project_title || "",
        acronym: project.project_acronym || "",
        // Ship comes as a comma-separated string from the backend.
        ship: project.ship ? project.ship.split(",").map((s) => s.trim()).filter(Boolean) : [],
        cruise: project.cruise || "",
        description: project.project_description || "",
    },
    // The backend returns no account id for the people: left unresolved so the
    // Metadata tab looks the emails up (usePeopleEmailCheck).
    people: {
        dataOwnerName: project.data_owner_name || "",
        dataOwnerEmail: project.data_owner_email || "",
        dataOwnerId: undefined,
        chiefScientistName: project.chief_scientist_name || "",
        chiefScientistEmail: project.chief_scientist_email || "",
        chiefScientistId: undefined,
        operatorName: project.operator_name || "",
        operatorEmail: project.operator_email || "",
        operatorId: undefined,
    },
    importSettings: {
        overrideDepthOffset: project.override_depth_offset ?? 0,
        enableDescentFilter: project.enable_descent_filter ?? true,
    },
    ecoTaxa: {
        instance: project.ecotaxa_instance_id?.toString() || "",
        // The backend does not return the account id: left empty for the user to pick.
        account: "",
        project: project.ecotaxa_project_id?.toString() || "",
        // Unchecked on an existing project: creating an EcoTaxa project is an explicit
        // choice here (only the New Project form checks it by default).
        createNewProject: false,
    },
    privileges: mapProjectPrivileges(project),
    privacy: mapProjectPrivacy(project),
});
