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
