import { CodeGenerationError, createShortLink } from "../../../lib/links/create-short-link.ts";
import { consumeCreateQuota } from "../../../lib/links/rate-limit.ts";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON válido." }, { status: 400 });
  }

  if (
    !body || typeof body !== "object" ||
    !("url" in body) || typeof body.url !== "string"
  ) {
    return Response.json({ error: "Incluye una URL en el campo url." }, { status: 400 });
  }

  let destination: URL;
  try {
    const input = body.url.trim();
    if (!/^https?:\/\/[^/\\]/i.test(input) || /[\s\\]/.test(input)) {
      throw new Error("URL inválida");
    }
    destination = new URL(input);
    if (!destination.hostname) throw new Error("Falta el host");
  } catch {
    return Response.json({ error: "Ingresa una URL absoluta HTTP o HTTPS válida." }, { status: 400 });
  }

  let stage = "configuración de APP_BASE_URL";
  try {
    const baseUrl = new URL(process.env.APP_BASE_URL ?? "");
    if (
      !["http:", "https:"].includes(baseUrl.protocol) ||
      baseUrl.username || baseUrl.password ||
      baseUrl.pathname !== "/" || baseUrl.search || baseUrl.hash
    ) {
      throw new Error("APP_BASE_URL inválida");
    }
    stage = "límite de solicitudes";
    const retryAfter = await consumeCreateQuota(request);
    if (retryAfter > 0) {
      return Response.json({
        error: "Has alcanzado el límite de 10 solicitudes por minuto. Intenta de nuevo en unos momentos.",
      }, {
        status: 429,
        headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" },
      });
    }
    stage = "creación en Firestore";
    const code = await createShortLink(destination.href);
    return Response.json({
      code,
      shortUrl: new URL("/" + code, baseUrl).href,
      destinationUrl: destination.href,
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CodeGenerationError) {
      return Response.json({ error: "Intenta de nuevo en unos momentos." }, { status: 503 });
    }
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    const safeCode = typeof code === "number" || [
      "app/invalid-credential", "app/invalid-app-options", "app/invalid-argument",
      "ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT",
    ].includes(String(code)) ? code : "no disponible";
    const message = error instanceof Error ? error.message : "";
    const networkError = message.match(/\b(ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ENETUNREACH)\b/)?.[1];
    const diagnostic = { stage, code: safeCode, ...(networkError ? { networkError } : {}) };
    console.error("POST /api/links falló", diagnostic);
    return Response.json({
      error: "No se pudo crear el enlace.",
      ...(process.env.NODE_ENV === "development" ? { diagnostic } : {}),
    }, { status: 500 });
  }
}
