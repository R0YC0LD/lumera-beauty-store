import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("builds the Luméra storefront source and worker", async () => {
  const [page, layout, app] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lumera-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /Luméra — Işığını Bul/);
  assert.match(page, /LumeraApp/);
  assert.match(app, /Işığını bul/);
  assert.match(app, /Yönetim demosu/);
  assert.match(app, /Şu an sevilenler/);
  assert.doesNotMatch(`${page}${layout}${app}`, /Your site is taking shape|codex-preview|react-loading-skeleton/i);
  await access(new URL("../dist/server/index.js", import.meta.url));
});

test("ships a self-contained GitHub Pages demo", async () => {
  const html = await readFile(new URL("../github-pages/index.html", import.meta.url), "utf8");
  assert.match(html, /Luméra — Işığını Bul/);
  assert.match(html, /id="productGrid"/);
  assert.match(html, /Sanal POS/);
  assert.match(html, /API anahtarları yalnızca şifreli sunucu ortam değişkenlerinde tutulur/);
  assert.match(html, /@media\(max-width:760px\)/);
});
