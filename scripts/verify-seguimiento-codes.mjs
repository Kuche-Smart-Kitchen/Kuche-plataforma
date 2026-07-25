#!/usr/bin/env node

/**
 * Smoke check for public seguimiento codes against backend login payload.
 *
 * Usage:
 *   node scripts/verify-seguimiento-codes.mjs
 *   API_BASE_URL=http://localhost:3001 node scripts/verify-seguimiento-codes.mjs
 */

const API_BASE_URL = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001")
  .split(",")
  .map((value) => value.trim())
  .find(Boolean) || "http://localhost:3001";

const CASES = [
  {
    code: "NY277S",
    expectedCount: 6,
    expectedTypes: ["diseno", "cotizacion_formal", "hoja_taller", "recibo_1", "recibo_2"],
    expectedExts: ["png", "pdf", "jpg"],
  },
  {
    code: "US3XXB",
    expectedCount: 5,
    expectedTypes: ["diseno", "cotizacion_formal", "hoja_taller", "recibo_1"],
    expectedExts: ["pdf", "png", "jpg"],
  },
  {
    code: "HM7ACW",
    expectedCount: 3,
    expectedTypes: ["diseno", "cotizacion_formal", "hoja_taller"],
    expectedExts: ["pdf", "jpg"],
  },
];

const normalize = (value) => String(value || "").trim().toLowerCase();

const uniqueSorted = (values) => Array.from(new Set(values.filter(Boolean))).sort();

const getProjectFromPayload = (payload) => {
  if (!payload || typeof payload !== "object") return null;
  if (payload.project && typeof payload.project === "object") return payload.project;
  if (payload.data && typeof payload.data === "object" && payload.data.project && typeof payload.data.project === "object") {
    return payload.data.project;
  }
  return null;
};

const collectFileSummary = (project) => {
  const files = Array.isArray(project?.archivos) ? project.archivos : [];

  const types = uniqueSorted(
    files.map((file) => normalize(file?.tipo || file?.type)),
  );

  const exts = uniqueSorted(
    files
      .map((file) => String(file?.nombre || file?.name || ""))
      .map((name) => {
        const i = name.lastIndexOf(".");
        return i >= 0 ? normalize(name.slice(i + 1)) : "";
      }),
  );

  return {
    count: files.length,
    types,
    exts,
  };
};

const hasAllExpected = (actual, expected) => expected.every((value) => actual.includes(normalize(value)));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchLoginWithRetry = async (code) => {
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(`${API_BASE_URL}/api/seguimiento/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ codigo: code }),
    });

    if (response.status !== 429 || attempt === maxAttempts) {
      return response;
    }

    const retryAfter = Number.parseInt(response.headers.get("retry-after") || "", 10);
    const backoffMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : 800 * 2 ** (attempt - 1);
    await wait(backoffMs);
  }

  throw new Error("unreachable retry state");
};

const testCase = async (test) => {
  const response = await fetchLoginWithRetry(test.code);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const project = getProjectFromPayload(payload);
  if (!project) {
    throw new Error("login response does not include project payload");
  }

  const summary = collectFileSummary(project);
  const countOk = summary.count === test.expectedCount;
  const typesOk = hasAllExpected(summary.types, test.expectedTypes.map(normalize));
  const extsOk = hasAllExpected(summary.exts, test.expectedExts.map(normalize));

  return {
    summary,
    ok: countOk && typesOk && extsOk,
    checks: {
      countOk,
      typesOk,
      extsOk,
    },
  };
};

const run = async () => {
  let failures = 0;

  console.log(`Using API base: ${API_BASE_URL}`);

  for (const test of CASES) {
    try {
      const result = await testCase(test);
      const status = result.ok ? "PASS" : "FAIL";
      console.log(`\n[${status}] ${test.code}`);
      console.log(`  count: expected ${test.expectedCount}, got ${result.summary.count}`);
      console.log(`  types: ${result.summary.types.join(", ") || "(none)"}`);
      console.log(`  exts: ${result.summary.exts.join(", ") || "(none)"}`);

      if (!result.ok) {
        failures += 1;
        if (!result.checks.countOk) console.log("  - count mismatch");
        if (!result.checks.typesOk) console.log("  - missing expected types");
        if (!result.checks.extsOk) console.log("  - missing expected extensions");
      }
    } catch (error) {
      failures += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`\n[FAIL] ${test.code}`);
      console.log(`  error: ${message}`);
    }
  }

  if (failures > 0) {
    console.log(`\nDone with ${failures} failing case(s).`);
    process.exit(1);
  }

  console.log("\nAll seguimiento code checks passed.");
};

void run();
