export async function requestPasswordReset(email: string) {
  try {
    await fetch("/auth/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {
    // Swallow errors on purpose
  }
}

export async function resetPassword(
  token: string,
  password: string
) {
  const res = await fetch("/auth/password/reset", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reset_password_token: token, new_password: password }),
  });

  if (!res.ok) {
    let message = "Password reset failed";

    try {
      const data = await res.json();
      if (typeof data?.errors?.[0] === "string") {
        message = data.errors[0];
      } else if (typeof data?.message === "string") {
        message = data.message;
      }
    } catch {
      // ignore JSON parse errors
    }

    throw new Error(message);
  }
}
