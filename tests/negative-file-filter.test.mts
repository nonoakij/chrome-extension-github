import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node.js 24 runs this TypeScript file with built-in type stripping.
import { parseExcludeTerms, shouldExcludePath } from "../src/negative-file-filter.ts";

void test("parses comma-separated exclusion terms", () => {
  assert.deepEqual(parseExcludeTerms(" pnpm-lock, generated/ ,, .snap "), [
    "pnpm-lock",
    "generated/",
    ".snap",
  ]);
});

void test("matches terms against the full path without case sensitivity", () => {
  const terms = parseExcludeTerms("GENERATED/, .snap");

  assert.equal(shouldExcludePath("src/generated/client.ts", terms), true);
  assert.equal(shouldExcludePath("src/components/button.SNAP", terms), true);
  assert.equal(shouldExcludePath("src/components/button.ts", terms), false);
});

void test("does not exclude files when the query is empty", () => {
  assert.equal(shouldExcludePath("pnpm-lock.yaml", parseExcludeTerms("")), false);
});
