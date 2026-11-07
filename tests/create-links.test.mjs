import assert from "node:assert/strict";
import { mock, test } from "node:test";

let save;
mock.module("../src/lib/links/repository.ts", {
  namedExports: { createLink: (...args) => save(...args) },
});

const { POST } = await import("../src/app/api/links/route.ts");
process.env.APP_BASE_URL = "https://short.example";

function request(body) {
  return new Request("https://short.example/api/links", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

test("rechaza JSON y URLs inválidos sin escribir", async () => {
  save = () => assert.fail("No debe escribir");
  for (const body of [null, [], {}, { url: 2 }, { url: "/relative" },
    { url: "ftp://example.com" }, { url: "https:example.com" },
    { url: "https:///example.com" }, { url: "https://" },
    { url: "https://exa mple.com" }, { url: "https://example.com\\path" }]) {
    assert.equal((await POST(request(body))).status, 400);
  }
  const malformed = new Request("https://short.example/api/links", { method: "POST", body: "{" });
  assert.equal((await POST(malformed)).status, 400);
});

test("crea un código criptográfico de ocho caracteres y devuelve 201", async () => {
  const stored = new Map();
  save = async (code, url) => stored.set(code, url);
  for (const url of ["https://example.com/path?q=1#part", "http://example.com/"]) {
    const response = await POST(request({ url }));
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.match(result.code, /^[A-Za-z0-9_-]{8}$/);
    assert.equal(result.shortUrl, "https://short.example/" + result.code);
    assert.equal(stored.get(result.code), url);
  }
});

test("reintenta una colisión y conserva el documento existente", async () => {
  const stored = new Map();
  let attempts = 0;
  let occupiedCode;
  save = async (code, url) => {
    attempts++;
    if (attempts === 1) {
      occupiedCode = code;
      stored.set(code, "https://original.example/");
    }
    if (stored.has(code)) throw Object.assign(new Error("exists"), { code: 6 });
    stored.set(code, url);
  };
  const response = await POST(request({ url: "https://new.example/" }));
  assert.equal(response.status, 201);
  assert.equal(attempts, 2);
  assert.equal(stored.get(occupiedCode), "https://original.example/");
});

test("limita las colisiones a cinco intentos", async () => {
  let attempts = 0;
  save = async () => {
    attempts++;
    throw Object.assign(new Error("exists"), { code: 6 });
  };
  assert.equal((await POST(request({ url: "https://example.com/" }))).status, 503);
  assert.equal(attempts, 5);
});

test("no reintenta otros fallos y oculta detalles internos", async () => {
  let attempts = 0;
  save = async () => {
    attempts++;
    throw Object.assign(new Error("private details"), { code: 7 });
  };
  const response = await POST(request({ url: "https://example.com/" }));
  assert.equal(response.status, 500);
  assert.equal(attempts, 1);
  assert.deepEqual(await response.json(), { error: "No se pudo crear el enlace." });
});

test("valida APP_BASE_URL antes de escribir", async () => {
  const previous = process.env.APP_BASE_URL;
  save = () => assert.fail("No debe escribir");
  try {
    process.env.APP_BASE_URL = "https://short.example/subpath";
    assert.equal((await POST(request({ url: "https://example.com/" }))).status, 500);
  } finally {
    process.env.APP_BASE_URL = previous;
  }
});
