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
    assert.ok(control.includes(id === "site-settings" ? '"site-settings":' : id + ":"), "missing Control Center view: " + id);
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
  for (const route of ["system/health", "preview/page", "media/usage", "security/sessions", "security/revoke-sessions", "site-settings", "publish/site-settings", "schedule", "schedule/retry", "notifications", "inquiries"]) {
    assert.ok(worker.includes('r==="' + route + '"'), "missing Worker route: " + route);
  }
  assert.match(worker, /publishedItems,draft:!!draft/);
});

test("admin HTML IDs remain unique and all admin scripts are loaded", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, "duplicate HTML IDs detected");
  for (const script of ["admin.js", "features.js", "control-center.js", "connection.js"]) assert.ok(html.includes(script));
});

test("inquiry inbox provides Gmail-style folders, search, responsive reading and Gmail reply links", () => {
  assert.match(control, /inquiryFolder/);
  assert.match(control, /Search name, email, subject or message/);
  assert.match(control, /Reply in Gmail/);
  assert.match(control, /https:\/\/mail\.google\.com\/mail\//);
  assert.match(control, /URLSearchParams\(\{view:"cm",fs:"1",to:item\.email/);
  assert.match(controlCss, /\.inquiry-shell/);
  assert.match(controlCss, /\.inquiry-shell\.has-selection/);
  assert.match(controlCss, /@media\(max-width:650px\)/);
});
test("analytics copy does not claim Cloudflare analytics is already enabled", () => {
  assert.doesNotMatch(control, /analytics already configured/i);
  assert.match(control, /Confirm that Web Analytics is enabled/);
});

test("command palette supports meaningful aliases and descriptive search without claiming record search", () => {
  assert.match(admin, /const commandAliases = \{/);
  assert.match(admin, /"content-manager": \["showcases", "projects", "social previews", "brand assets"/);
  assert.ok(admin.includes('inquiries: ["messages", "contact form", "customers", "leads", "inbox"]'));
  assert.match(admin, /const searchable = \[item\.label, descriptions\[item\.view\]/);
  assert.match(admin, /Search admin sections/);
  assert.doesNotMatch(admin, /global data search|search all records/i);
});

test("universal search endpoint searches protected enquiries, content, media and activity records", () => {
  assert.match(worker, /r==="search"/);
  assert.match(worker, /prefix:"inquiry:"/);
  assert.match(worker, /collection-draft:/);
  assert.match(worker, /prefix:"audit:"/);
  assert.match(worker, /assets\/uploads/);
  assert.match(worker, /results\.slice\(0,50\)/);
  assert.match(admin, /Search your workspace/);
  assert.match(admin, /fetch\("\/admin-api\/search\?q="/);
  assert.match(adminCss, /\.global-search-dialog/);
});

test("enquiry CSV export is authenticated, complete, formula-safe and excludes deleted records", () => {
  assert.ok(worker.includes('r==="inquiries/export"'));
  assert.ok(worker.includes('prefix:"inquiry:"'));
  assert.ok(worker.includes('status!=="deleted"'));
  assert.ok(worker.includes('const columns=["id","name","email","subject","message","status","createdAt","updatedAt"]'));
  assert.ok(worker.includes('text.replace(/"/g,\'""\')'));
  assert.ok(worker.includes('if(/^[\\s]*[=+\\-@]/.test(text)'));
  assert.ok(worker.includes('const body="\\uFEFF"+lines.join("\\r\\n")+"\\r\\n"'));
  assert.ok(worker.includes('text/csv; charset=utf-8'));
  assert.ok(worker.includes('content-disposition'));
  assert.ok(worker.includes('cache-control":"no-store"'));
  assert.match(control, /Export CSV/);
  assert.ok(control.includes('fetch("/admin-api/inquiries/export",{credentials:"include"})'));
  assert.ok(control.includes("URL.createObjectURL"));
});

test("website settings expose independent homepage section visibility controls", () => {
  assert.match(control, /Homepage section visibility/);
  assert.match(control, /Game project showcases/);
  assert.match(control, /Social media previews/);
  assert.match(control, /sectionVisibility:Object\.fromEntries/);
  assert.match(control, /can be shown again at any time/);
  assert.match(worker, /sectionVisibilityDefaults/);
  assert.match(worker, /applySectionVisibility/);
});

test("centralized brand identity controls cover accent, typography and Media Library logo", () => {
  assert.match(control, /Brand identity/);
  assert.match(control, /Accent colour/);
  assert.match(control, /Typography/);
  assert.match(control, /Website logo/);
  assert.match(control, /call\("\/media\/list"\)/);
  assert.match(control, /brand:\{accentColor:accent\.value,fontFamily:font\.value,logoPath:logo\.value\}/);
  assert.match(worker, /function cleanBrandSettings/);
  assert.match(worker, /function applyBrandStyles/);
  assert.match(worker, /brandFontStacks/);
  assert.match(control, /Live brand preview/);
  assert.match(control, /updateBrandPreview/);
  assert.match(control, /previewImage\.src=logo\.value/);
  assert.match(controlCss, /\.brand-preview/);
  assert.match(control, /Published vs editing/);
  assert.match(control, /Currently published/);
  assert.match(control, /Editing \/ draft/);
  assert.match(control, /data\.settings\?\.brand/);
  assert.match(controlCss, /\.brand-comparison-grid/);
});


test("personal activity timeline supports date and category filters plus safe CSV export", () => {
  assert.match(control, /activity: \["Personal activity timeline"/);
  assert.match(control, /async function loadActivityTimeline/);
  assert.match(control, /call\("\/audit"\)/);
  assert.match(control, /Activity start date/);
  assert.match(control, /Filter activity type/);
  assert.match(control, /the-red-sparrow-activity\.csv/);
  assert.match(control, /activity:loadActivityTimeline/);
  assert.match(controlCss, /\.activity-event/);
  assert.match(worker, /r==="audit"/);
});

test("executive dashboard reports accurate enquiry activity windows", () => {
  assert.ok(worker.includes("periods:{newToday,newLast7Days,newLast30Days}"));
  assert.ok(worker.includes('Asia/Karachi'));
  assert.match(control, /NEW TODAY/);
  assert.match(control, /LAST 7 DAYS/);
  assert.match(control, /LAST 30 DAYS/);
});


test("successful admin sign-in and sign-out are recorded in the audit timeline", () => {
  assert.match(worker, /audit\(env,String\(user\.login\)\.toLowerCase\(\),"login","GitHub OAuth session created"\)/);
  assert.match(worker, /who=await session\(req,env\)/);
  assert.match(worker, /audit\(env,who\.login,"logout","Admin session ended"\)/);
  assert.match(control, /\["security","Security actions"\]/);
});
