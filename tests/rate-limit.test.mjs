import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mock, test } from "node:test";
import { Timestamp } from "firebase-admin/firestore";

const records = new Map();
let lastId;
mock.module("../src/lib/firebase/admin.ts", {
  namedExports: {
    getDatabase: () => ({
      collection: (name) => {
        assert.equal(name, "linkRateLimits");
        return { doc: (id) => { lastId = id; return id; } };
      },
      runTransaction: async (callback) => callback({
        get: async (id) => ({
          exists: records.has(id),
          data: () => records.get(id),
        }),
        set: (id, data) => records.set(id, data),
      }),
    }),
  },
});
const { consumeCreateQuota } = await import("../src/lib/links/rate-limit.ts");
const secret = "a".repeat(64);
process.env.RATE_LIMIT_SECRET = secret;
process.env.VERCEL = "1";
const request = (ip = "203.0.113.1") => new Request("https://short.example/api/links", {
  headers: { "x-vercel-forwarded-for": ip },
});

test("permite diez solicitudes y rechaza la siguiente sin incrementar el contador", async () => {
  records.clear();
  for (let i = 0; i < 10; i++) assert.equal(await consumeCreateQuota(request()), 0);
  const retryAfter = await consumeCreateQuota(request());
  assert.ok(retryAfter > 0 && retryAfter <= 60);
  assert.equal(records.get(lastId).count, 10);
  assert.match(lastId, /^[a-f0-9]{64}$/);
});

test("renueva una ventana caducada", async () => {
  const id = createHmac("sha256", secret).update("203.0.113.2").digest("hex");
  records.set(id, { count: 10, resetAt: Timestamp.fromMillis(Date.now() - 1) });
  assert.equal(await consumeCreateQuota(request("203.0.113.2")), 0);
  assert.equal(records.get(id).count, 1);
  assert.ok(records.get(id).resetAt.toMillis() > Date.now());
});

test("mantiene cuotas independientes por IP", async () => {
  records.clear();
  for (let i = 0; i < 10; i++) await consumeCreateQuota(request());
  assert.equal(await consumeCreateQuota(request("203.0.113.3")), 0);
});

test("en local ignora las cabeceras aportadas por el cliente", async () => {
  records.clear();
  delete process.env.VERCEL;
  try {
    await consumeCreateQuota(request("203.0.113.1"));
    await consumeCreateQuota(request("203.0.113.2"));
    assert.equal(records.size, 1);
    assert.equal(records.get(lastId).count, 2);
  } finally {
    process.env.VERCEL = "1";
  }
});

test("rechaza IP ausente o inválida y secreto ausente antes de escribir", async () => {
  records.clear();
  await assert.rejects(consumeCreateQuota(request("invalid")));
  await assert.rejects(consumeCreateQuota(new Request("https://short.example/api/links")));
  delete process.env.RATE_LIMIT_SECRET;
  try {
    await assert.rejects(consumeCreateQuota(request()));
  } finally {
    process.env.RATE_LIMIT_SECRET = secret;
  }
  assert.equal(records.size, 0);
});

test("un contador corrupto falla sin reiniciar la cuota", async () => {
  const id = createHmac("sha256", secret).update("203.0.113.4").digest("hex");
  records.set(id, { count: "bad", resetAt: Timestamp.now() });
  await assert.rejects(consumeCreateQuota(request("203.0.113.4")));
  assert.equal(records.get(id).count, "bad");
});
