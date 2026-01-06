export async function loginRequest(email: string, password: string) {
    const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        throw new Error("Authentication failed");
    }

    return response.json(); // { token }
}
