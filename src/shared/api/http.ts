export async function http<T>(
    input: RequestInfo,
    init: RequestInit = {},
): Promise<T> {
    const token = localStorage.getItem("token");

    const res = await fetch(input, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
            ...init.headers,
        },
    });

    if (!res.ok) {
        throw new Error("HTTP error");
    }

    return res.json();
}
