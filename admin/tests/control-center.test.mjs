import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL("../../" + path, import.meta.url), "utf8");
const [html, admin, adminCss, control, controlCss, connection, features, worker] = await Promise.all([
  read("admin/index.html"), read("admin/admin.js"), read("admin/admin.css"),
  read("admin/control-center.js"), read("admin/control-center.css"),
  read("admin/connection.js"), read("admin/features.js"), read("admin/worker.js")
]);

test("all Control Center sections are created as visible-on-selection views", () => {
  for (const id of ["analytics", "calendar", "inquiries", "notifications", "health", "preview", "files", "security", "site-settings"]) {
    assert.match(control, new RegExp("\\b" + id + "\\s*:"));
    assert.ok(control.includes('section.id="view-"+id'));
  }
  assert.doesNotMatch(control, /section\.hidden\s*=\s*true/);
  assert.match(admin, /views\(\)\.forEach\(view => view\.classList\.toggle\("active"/);
});

test("Control Center loaders preserve their content mount points", () => {
  assert.match(control, /const mount=\(id\)=>\{const root=\$\(id\);const content=root\?\.querySelector\("\.control-content"\);if\(content\)content\.replaceChildren\(\);return root\}/);
  assert.match(control, /parent\.insertBefore\(section,footer\|\|null\)/);
});

test("mobile and desktop navigation can reach every section", () => {
  assert.match(html, /id="menu-toggle"[^>]*aria-controls="sidebar"/);
  assert.match(admin, /sidebar-backdrop/);
  assert.match(adminCss, /\.sidebar\{[^}]*overflow-y:auto/);
  assert.match(adminCss, /@media\(max-width:650px\)/);
  assert.match(adminCss, /\.sidebar-backdrop:not\(\[hidden\]\)/);
  assert.match(control, /nav-group-label/);
});

test("notification actions navigate within the admin workspace", () => {
  assert.match(control, /window\.showAdminView\?\.\(destination\)/);
  assert.doesNotMatch(control, /a\.href=item\.href/);
});

test("page and SEO drafts use the authenticated remote API without duplicate local storage", () => {
  assert.doesNotMatch(admin, /localStorage/);
  assert.match(connection, /saveRemoteDraft\("page:"/);
  assert.match(connection, /saveRemoteDraft\("seo:"/);
  assert.match(connection, /pendingRemoteValue/);
  assert.match(features, /dataset\.pendingRemoteValue/);
});

test("new Control Center modules have matching protected Worker routes", () => {
  for (const route of ["system/health", "preview/page", "media/usage", "security/sessions", "security/revoke-sessions", "site-settings", "publish/site-settings", "schedule", "notifications", "inquiries"]) {
    assert.ok(worker.includes('r==="' + route + '"'), "missing Worker route: " + route);
  }
  assert.match(worker, /publishedItems,draft:!!draft/);
});

test("admin HTML IDs remain unique and all admin scripts are loaded", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, "duplicate HTML IDs detected");
  for (const script of ["admin.js", "features.js", "control-center.js", "connection.js"]) assert.ok(html.includes(script));
});
