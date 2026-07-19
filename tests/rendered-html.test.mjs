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
  assert.match(app, /logoClicks/);
  assert.match(app, /Yönetici girişi/);
  assert.doesNotMatch(app, /Yönetim demosu/);
  assert.match(app, /Şu an sevilenler/);
  assert.doesNotMatch(`${page}${layout}${app}`, /Your site is taking shape|codex-preview|react-loading-skeleton/i);
  await access(new URL("../dist/server/index.js", import.meta.url));
});

test("ships the complete GitHub Pages commerce app", async () => {
  const [html, script, css, worker, schema] = await Promise.all([
    readFile(new URL("../github-pages/index.html", import.meta.url), "utf8"),
    readFile(new URL("../github-pages/assets/app.js", import.meta.url), "utf8"),
    readFile(new URL("../github-pages/assets/site.css", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare-worker/src/index.js", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare-worker/schema.sql", import.meta.url), "utf8"),
  ]);
  assert.match(html, /Luméra — Işığını Bul/);
  assert.match(html, /id="productGrid"/);
  assert.match(script, /Sanal POS/);
  assert.match(html, /id="adminLogin"/);
  assert.match(script, /logoClicks>=5/);
  assert.match(script, /username!=="admin"\|\|password!=="12345"/);
  assert.match(script, /\/api\/orders/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(worker, /SESSION_SECRET/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS orders/);
  assert.doesNotMatch(`${html}${script}`, /Yönetim demosu/);
});

test("root copy served by GitHub Pages matches github-pages source", async () => {
  for (const file of ["index.html", "404.html", "config.js", "assets/app.js", "assets/site.css", "CNAME", "robots.txt", "sitemap.xml"]) {
    const [root, source] = await Promise.all([
      readFile(new URL(`../${file}`, import.meta.url), "utf8"),
      readFile(new URL(`../github-pages/${file}`, import.meta.url), "utf8"),
    ]);
    assert.equal(root, source, `${file} kök kopyası github-pages ile aynı olmalı (github-pages'i düzenledikten sonra köke kopyalayın)`);
  }
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /https:\/\/lumrea\.com\//);
});
