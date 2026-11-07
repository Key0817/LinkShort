import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const { getDatabase } = await import("../src/lib/firebase/admin.ts");
const { createLink, findLink } = await import("../src/lib/links/repository.ts");
const code = "check-" + randomUUID();
const destinationUrl = "https://example.com/";
let created = false;

try {
  await createLink(code, destinationUrl);
  created = true;
  const link = await findLink(code);
  if (link?.destinationUrl !== destinationUrl || !link.createdAt) {
    throw new Error("La lectura no coincide con el documento creado.");
  }
  console.log("Firestore verificado. Creación y lectura correctas.");
} catch (error) {
  // No imprimir objetos del SDK que puedan contener configuración privada.
  console.error("No se pudo verificar Firestore. Revisa las credenciales, la base (default) y los permisos IAM.");
  console.error("Código:", error && typeof error === "object" && "code" in error ? error.code : "configuración o validación");
  process.exitCode = 1;
} finally {
  if (created) {
    try {
      await getDatabase().collection("links").doc(code).delete();
      console.log("Documento de comprobación eliminado.");
    } catch {
      console.error("Elimina manualmente el documento de comprobación links/" + code);
      process.exitCode = 1;
    }
  }
}
