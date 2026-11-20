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

test("activity enquiry category includes singular and plural enquiry audit actions", () => {
  assert.match(control, /kind\.value==="inquiry"&&\/\(inquir\|enquir\)\/\.test\(action\)/);
});

test("homepage history restore errors are announced in the homepage history panel", () => {
  assert.match(connection, /say\(homepageHistoryList,"Could not restore homepage:/);
});

test("page and homepage version history announce loading and errors accessibly", () => {
  assert.match(connection, /Loading page version history…/);
  assert.match(connection, /Loading homepage version history…/);
  assert.match(connection, /setAttribute\("role","status"\)/);
  assert.match(connection, /setAttribute\("aria-live","polite"\)/);
  assert.match(connection, /setAttribute\("role","alert"\)/);
  assert.match(connection, /setAttribute\("aria-live","assertive"\)/);
  assert.match(connection, /historyList\.setAttribute\("aria-busy","true"\)/);
  assert.match(connection, /homepageHistoryList\.setAttribute\("aria-busy","true"\)/);
  assert.match(connection, /historyList\.removeAttribute\("aria-busy"\)/);
  assert.match(connection, /homepageHistoryList\.removeAttribute\("aria-busy"\)/);
});

test("editing an existing content item resolves its relative media path to the Media Library URL", () => {
  assert.match(features, /new URL\(item\.image,location\.origin\+"\/"\)\.href/);
  assert.match(features, /some\(o=>o\.value===selected\)\?selected:""/);
});

test("Media Library queue detects filenames that collide after extension normalization", () => {
  assert.match(connection, /const candidate=\{file,name:file\.name\},normalizedName=uploadFilename\(candidate\)\.toLowerCase\(\)/);
  assert.match(connection, /uploadFilename\(item\)\.toLowerCase\(\)===normalizedName/);
});

test("media upload controls use non-nested accessible semantics", () => {
  assert.match(html, /id="media-file-input"[^>]*aria-label="Choose image files to upload"/);
  assert.match(html, /id="media-drop-zone" role="group"/);
  assert.doesNotMatch(html, /id="media-drop-zone"[^>]*role="button"/);
  assert.doesNotMatch(connection, /dropZone\.addEventListener\("keydown"/);
});

test("website settings retain the saved logo when Media Library lookup fails or omits it", () => {
  assert.match(control, /Media Library unavailable; the currently saved logo will be retained/);
  assert.match(control, /savedLogoPath\.split\("\/"\)\.pop\(\)/);
  assert.match(control, /currently saved/);
});

test("website settings keep Media Library warnings visible after loading saved settings", () => {
  assert.match(control, /let mediaWarning=""/);
  assert.match(control, /\+\(mediaWarning\?" "\+mediaWarning:""\)/);
  assert.match(control, /!!mediaWarning/);
});

test("website settings preserve local edits and save them before publishing", () => {
  assert.match(control, /Unsaved website settings are being kept/);
  assert.match(control, /form\.addEventListener\("input",\(\)=>\{window\.trsSiteSettingsDirty=true\}\)/);
  assert.match(control, /if\(window\.trsSiteSettingsDirty\)await saveSettingsDraft\(\)/);
  assert.match(control, /window\.trsSiteSettingsDirty=false/);
  assert.match(control, /form\.inert=true/);
  assert.match(control, /form\.inert=false/);
});

test("page and SEO editor baselines update after successful saves and publishing", () => {
  assert.match(connection, /syncPageBaseline\(\)/);
  assert.match(connection, /syncSeoBaseline\(\)/);
  assert.match(connection, /const syncPageBaseline=/);
  assert.match(connection, /const syncSeoBaseline=/);
});

test("page and SEO draft resets require confirmation and lock the editors", () => {
  assert.match(connection, /Delete the saved page draft and restore the published copy\?/);
  assert.match(connection, /Delete the saved SEO draft and restore the published metadata\?/);
  assert.match(connection, /reset\.disabled=true;pf\.inert=true/);
  assert.match(connection, /reset\.disabled=true;sf\.inert=true/);
});

test("page and SEO editors are locked during asynchronous save and publish operations", () => {
  assert.match(connection, /pf\.inert=true/);
  assert.match(connection, /sf\.inert=true/);
  assert.match(connection, /finally\{pf\.inert=false/);
  assert.match(connection, /finally\{sf\.inert=false/);
});

test("page and SEO editors confirm before discarding unsaved changes when switching pages", () => {
  assert.match(connection, /event\.isTrusted/);
  assert.match(connection, /Discard unsaved /);
  assert.match(connection, /event\.stopImmediatePropagation\(\)/);
  assert.match(connection, /pageBaseline=fieldSnapshot\(pageEditorFields\)/);
  assert.match(connection, /seoBaseline=fieldSnapshot\(seoEditorFields\)/);
  assert.match(connection, /trs:media-picker-ready/);
  assert.match(connection, /clear-page-image.*pageImageDirty=true/);
});

test("Content Manager preserves unsaved collection edits during navigation and confirms destructive refresh", () => {
  assert.match(features, /collectionDirty\[kind\]&&!force/);
  assert.match(features, /Unsaved local changes are being kept/);
  assert.match(features, /Discard unsaved local collection changes and reload saved drafts\?/);
  assert.match(features, /loadCollection\(kind,true\)/);
});

test("Content Manager navigation reuses loaded collections so edit selection is not reset", () => {
  assert.match(features, /collectionLoaded\[kind\]&&!force\)return/);
  assert.match(features, /collectionLoaded\[kind\]=true/);
  assert.match(features, /collectionEditing\[kind\]=index/);
});

test("in-flight collection reloads cannot overwrite edits made while the request is pending", () => {
  assert.match(features, /await request\("\/content\?kind="\+kind\);if\(collectionDirty\[kind\]\)/);
  assert.match(features, /collectionDirty\[kind\]=false;loadCollection\(kind,true\)/);
});

test("Content Manager draft save handles its reported failure without an unhandled rejection", () => {
  assert.match(features, /saveCollectionDraft\(kind\)\.catch\(\(\)=>\{\}\)/);
  assert.match(features, /Draft could not be saved: /);
});

test("Recently Deleted loading and error feedback is announced to assistive technology", () => {
  assert.match(features, /Loading recently deleted images…/);
  assert.match(features, /Loading previous collection versions…/);
  assert.match(features, /loading\.setAttribute\("role","status"\)/);
  assert.match(features, /loading\.setAttribute\("aria-live","polite"\)/);
  assert.match(features, /el\.setAttribute\("role","alert"\)/);
  assert.match(features, /el\.setAttribute\("aria-live","assertive"\)/);
  assert.match(features, /loading\.remove\(\);showError\(grid,e\)/);
  assert.match(features, /loading\.remove\(\);showError\(list,e\)/);
});

test("partial Media Library uploads refresh the visible library and report completed files", () => {
  assert.match(connection, /let uploaded=0/);
  assert.match(connection, /if\(uploaded\)window\.dispatchEvent\(new Event\("trs:media-updated"\)\)/);
  assert.match(connection, /\(uploaded\?uploaded\+" image\(s\) uploaded\. ":""\)/);
});

test("Media Library exposes working file-type filters and an authenticated unused-asset scan", () => {
  assert.match(html, /id="media-type-filter"/);
  assert.match(html, /id="media-usage-scan"/);
  assert.match(html, /id="media-usage-report"/);
  assert.match(features, /async function scanMediaUsage\(\)/);
  assert.ok(features.includes("/media/usage?path="));
  assert.match(features, /media-usage-scan.*addEventListener\("click",scanMediaUsage\)/);
  assert.match(features, /unused\.length\+" unused image\(s\)/);
});

test("Media Library supports safe bulk selection and trash operations", () => {
  assert.match(features, /const selectedMediaPaths=new Set\(\)/);
  assert.match(features, /Select all visible media files/);
  assert.match(features, /Move selected to trash/);
  assert.match(features, /await request\("\/media\/delete"/);
  assert.match(features, /selectedMediaPaths\.forEach\(path=>\{if\(!availablePaths\.has\(path\)\)selectedMediaPaths\.delete\(path\)\}\)/);
  assert.match(worker, /This image is still referenced by:/);
  assert.match(controlCss, /\.media-bulk-toolbar/);
});

test("destructive admin actions use the shared accessible confirmation dialog", () => {
  assert.match(admin, /window\.trsConfirm = \(message, options = \{\}\) => new Promise/);
  assert.match(admin, /dialog\.showModal\(\)/);
  assert.match(admin, /aria-labelledby/);
  assert.match(admin, /dialog\.returnValue === "confirm"/);
  assert.doesNotMatch(control, /!confirm\(/);
  assert.doesNotMatch(features, /!confirm\(/);
  assert.doesNotMatch(connection, /!confirm\(/);
  assert.doesNotMatch(connection, /alert\(/);
  assert.doesNotMatch(features, /alert\(/);
  assert.match(controlCss, /\.admin-confirm-dialog::backdrop/);
  assert.match(controlCss, /\.admin-confirm-dialog button:focus-visible/);
});

test("admin sessions support individual revocation without exposing cookie tokens", () => {
  assert.match(worker, /async function sessionFingerprint\(key\)/);
  assert.match(worker, /r==="security\/revoke-session"/);
  assert.match(worker, /sessionRef:await sessionFingerprint\(k\.name\)/);
  assert.match(worker, /if\(key\.name==="session:"\+sid\)continue/);
  assert.match(control, /Revoke session/);
  assert.match(control, /call\("\/security\/revoke-session"/);
});

test("new Control Center modules have matching protected Worker routes", () => {
  for (const route of ["system/health", "preview/page", "media/usage", "security/sessions", "security/revoke-session", "security/revoke-sessions", "site-settings", "publish/site-settings", "schedule", "schedule/retry", "notifications", "inquiries"]) {
    assert.ok(worker.includes('r==="' + route + '"'), "missing Worker route: " + route);
  }
  assert.match(worker, /publishedItems,draft:!!draft/);
});

test("admin HTML IDs remain unique and all admin scripts are loaded", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, "duplicate HTML IDs detected");
  for (const script of ["admin.js", "features.js", "control-center.js", "connection.js"]) assert.ok(html.includes(script));
});

test("Control Center data modules show loading feedback before requests complete", () => {
  for (const label of ["Loading dashboard data…","Loading scheduled publications…","Loading enquiries…","Loading activity events…","Loading notifications…","Running health checks…","Loading repository assets…","Loading active sessions…","Loading saved website settings…"]) {
    assert.ok(control.includes(label), "missing loading state: " + label);
  }
});

test("publishing calendar labels are explicitly associated with their controls", () => {
  assert.match(control, /kindLabel\.htmlFor=kind\.id/);
  assert.match(control, /dateLabel\.htmlFor=date\.id/);
  assert.match(control, /kind\.id="schedule-collection-kind"/);
  assert.match(control, /date\.id="schedule-publish-at"/);
});

test("publishing calendar shows its timezone and blocks past local schedule times", () => {
  assert.match(control, /date\.min=new Date\(now\.getTime\(\)-now\.getTimezoneOffset\(\)\*60000\)\.toISOString\(\)\.slice\(0,16\)/);
  assert.match(control, /resolvedOptions\(\)\.timeZone/);
  assert.match(control, /Publish at \("\+timeZone\+"\)/);
});

test("inquiry pagination advances by the server-returned page size even when duplicate IDs are filtered", () => {
  assert.match(control, /deletedOffset=offset\+pageItems\.length/);
  assert.match(control, /inquiryOffset=offset\+pageItems\.length/);
  assert.match(control, /pageItems\.filter\(x=>!seen\.has\(x\.id\)\)/);
});

test("inquiry Today filter uses Pakistan local calendar date", () => {
  assert.match(control, /timeZone:"Asia\/Karachi"/);
  assert.match(control, /karachiDate\(stamp\)===karachiDate\(now\)/);
  assert.match(control, /T00:00:00\+05:00/);
  assert.match(control, /T23:59:59\.999\+05:00/);
  assert.match(control, /isKarachiToday\(Date\.parse\(x\.at\|\|""\)\)/);
  assert.match(control, /Number\.isFinite\(value\)&&karachiDate\(value\)===karachiDate\(Date\.now\(\)\)/);
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
  assert.match(control, /call\("\/audit\?limit=500"\)/);
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


test("activity timeline can retrieve up to 500 audit events with a bounded API limit", () => {
  assert.match(worker, /searchParams\.get\("limit"\)/);
  assert.match(worker, /Math\.min\(500/);
  assert.match(worker, /slice\(0,limit\)/);
  assert.match(control, /call\("\/audit\?limit=500"\)/);
});


test("page and homepage version history expose accessible loading and error feedback", () => {
  assert.match(connection, /Loading page version history…/);
  assert.match(connection, /Loading homepage version history…/);
  assert.match(connection, /Could not load page history:/);
  assert.match(connection, /Could not load homepage history:/);
  assert.match(connection, /error\.setAttribute\("role","alert"\)/);
  assert.match(connection, /selector\.disabled=true/);
  assert.match(connection, /if\(selector\.value!==slug\)return/);
});


test("Media Library filters supported image formats and labels filename sorting accurately", () => {
  assert.match(features, /mediaType==="all"/);
  assert.match(features, /mediaType==="jpeg"\?\["jpg","jpeg"\]\.includes\(ext\)/);
  assert.match(features, /media-type-filter/);
  assert.match(features, /mediaSort==="name-az"\?a\.name\.localeCompare\(b\.name\)/);
  assert.match(html, /id="media-type-filter" aria-label="Filter media by format"/);
  assert.match(html, /value="jpeg">JPEG images/);
  assert.match(html, /value="name-za">Name Z–A/);
  assert.match(html, /value="name-az">Name A–Z/);
  assert.doesNotMatch(html, /value="newest">/);
});
