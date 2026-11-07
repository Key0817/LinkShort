import { findLink } from "../../lib/links/repository.ts";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await context.params;
  const headers = { "Cache-Control": "no-store" };

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(code)) {
    return Response.json({ error: "Enlace no encontrado." }, { status: 404, headers });
  }

  try {
    const link = await findLink(code);
    if (!link) {
      return Response.json({ error: "Enlace no encontrado." }, { status: 404, headers });
    }

    const destination = new URL(link.destinationUrl);
    if (!["http:", "https:"].includes(destination.protocol)) {
      throw new Error("El destino almacenado tiene un protocolo inválido.");
    }

    return new Response(null, {
      status: 307,
      headers: { ...headers, Location: destination.href },
    });
  } catch {
    console.error("GET /[code] falló al resolver el enlace.");
    return Response.json({ error: "No se pudo consultar el enlace." }, { status: 500, headers });
  }
}
