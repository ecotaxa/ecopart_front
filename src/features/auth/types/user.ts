export type User = {
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    is_admin: boolean;
    organisation: string;
    country: string;
    user_planned_usage: string;
};

export type RegisterPayload = {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    organisation: string;
    country: string; // ISO code like "FR"
    user_planned_usage: string; // REQUIRED by backend
};