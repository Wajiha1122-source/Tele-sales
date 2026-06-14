const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://tele-sales.onrender.com";

export async function api(path, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.clear();
      window.location.href = "/";
    }
    const fieldErrors = data.details?.fieldErrors;
    const validationMessage = fieldErrors
      ? Object.entries(fieldErrors)
          .filter(([, messages]) => messages?.length)
          .map(([field, messages]) => `${titleize(field)}: ${messages[0]}`)
          .join(" ")
      : "";
    throw new Error(validationMessage || data.message || "Request failed");
  }
  return data;
}

export const titleize = (value = "") =>
  value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
