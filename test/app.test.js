import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("adımlı Türkçe stüdyo ekranı mevcut", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /Orbit Studio/);
  assert.match(html, /Wikimedia Commons/);
  assert.match(html, /Video laboratuvarı/);
});

test("paket harici bağımlılık gerektirmiyor", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.type, "module");
  assert.equal(pkg.dependencies, undefined);
});
