import assert from "node:assert/strict";
import { mock, test } from "node:test";

let lookup;
mock.module("../src/lib/links/repository.ts", {
  namedExports: { findLink: (...args) => lookup(...args) },
});
const { GET } = await import("../src/app/[code]/route.ts");

function resolve(code) {
  return GET(new Request("https://short.example/" + encodeURIComponent(code)), {
    params: Promise.resolve({ code }),
  });
}

test("redirige con 307 y conserva ruta, parámetros y fragmento", async () => {
  for (const destinationUrl of ["https://example.com/path?q=1#part", "http://example.com/"]) {
    lookup = async (code) => {
      assert.equal(code, "old-Code_12");
      return { destinationUrl };
    };
    const response = await resolve("old-Code_12");
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), destinationUrl);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("devuelve 404 para códigos desconocidos", async () => {
  lookup = async () => null;
  const response = await resolve("missing1");
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("rechaza códigos inválidos sin consultar Firestore", async () => {
  lookup = () => assert.fail("No debe consultar Firestore");
  for (const code of ["", "../path", "with space", "a".repeat(65)]) {
    assert.equal((await resolve(code)).status, 404);
  }
});

test("devuelve 500 sin redirigir ante fallos de Firestore o destinos corruptos", async () => {
  lookup = async () => { throw new Error("private detail"); };
  const response = await resolve("valid123");
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "No se pudo consultar el enlace." });
  for (const destinationUrl of ["javascript:alert(1)", "/relative", "bad-url"]) {
    lookup = async () => ({ destinationUrl });
    const result = await resolve("valid123");
    assert.equal(result.status, 500);
    assert.equal(result.headers.get("location"), null);
  }
});
