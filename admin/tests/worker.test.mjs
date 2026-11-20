import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../worker.js", import.meta.url), "utf8");
const instrumented = source.replace(
  "export default {async fetch(req,env)",
  "export { run as __run }; export default {async fetch(req,env)"
);
assert.notEqual(instrumented, source, "Worker entry point can be exposed to tests");
const worker = await import("data:text/javascript;base64," + Buffer.from(instrumented).toString("base64"));
const ORIGIN = "https://theredsparrow.online";
const SESSION = "00000000-0000-4000-8000-000000000001";

class MockKV {
  constructor(initial = {}, { failAudit = false } = {}) {
    this.values = new Map(Object.entries(initial).map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)]));
    this.failAudit = failAudit;
    this.putOptions = new Map();
  }
  async get(key, type) {
    const value = this.values.get(key);
    if (value === undefined) return null;
    return type === "json" ? JSON.parse(value) : value;
  }
  async put(key, value, options) {
    if (this.failAudit && key.startsWith("audit:")) throw new Error("simulated KV audit outage");
    this.values.set(key, String(value));
    if (options) this.putOptions.set(key, options);
  }
  async delete(key) { this.values.delete(key); }
  async list({ prefix = "", limit = 1000 } = {}) {
    return { keys: [...this.values.keys()].filter(key => key.startsWith(prefix)).slice(0, limit).map(name => ({ name })), list_complete: true };
  }
}

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json" }
});

function installGitHubMock({ pages = {}, deleted = [], updated = [] } = {}) {
  const atomic = { blobs: [], trees: [], commits: [], refs: [] };
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input);
    const pathname = url.pathname;
    if (pathname.endsWith("/git/ref/heads/main")) return json({ object: { sha: "a".repeat(40) } });
    if (pathname.endsWith("/git/commits/" + "a".repeat(40))) return json({ tree: { sha: "b".repeat(40) } });
    if (pathname.endsWith("/git/blobs") && init.method === "POST") { atomic.blobs.push(JSON.parse(init.body)); return json({ sha: "b".repeat(40) }); }
    if (pathname.includes("/git/blobs/")) return json({ encoding: "base64", content: Buffer.from("test image bytes").toString("base64") });
    if (pathname.endsWith("/git/trees") && init.method === "POST") { atomic.trees.push(JSON.parse(init.body)); return json({ sha: "c".repeat(40) }); }
    if (pathname.endsWith("/git/commits") && init.method === "POST") { atomic.commits.push(JSON.parse(init.body)); return json({ sha: "d".repeat(40) }); }
    if (pathname.endsWith("/commits") && url.searchParams.has("path")) return json([]);
    if (pathname.endsWith("/git/refs/heads/main") && init.method === "PATCH") { atomic.refs.push(JSON.parse(init.body)); return json({ object: { sha: "d".repeat(40) } }); }
    const prefix = "/repos/hamadcheema/red/contents/";
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    if (init.method === "DELETE") {
      deleted.push(path);
      return json({ commit: { sha: "d".repeat(40) } });
    }
    if (init.method === "PUT") {
      updated.push({ path, body: JSON.parse(init.body) });
      return json({ commit: { sha: "c".repeat(40) } });
    }
    if (path.startsWith("assets/uploads/")) return deleted.includes(path) ? json({ message: "Not Found" }, 404) : json({ sha: "b".repeat(40) });
    if (path.startsWith("assets/trash/")) return json({ sha: "c".repeat(40), size: 16, content: Buffer.from("test image bytes").toString("base64") });
    const html = pages[path] ?? "<!doctype html><html><head><title>Test</title></head><body><h1>Test heading</h1><p class=\"hero-copy\">Test introduction</p></body></html>";
    return json({ sha: "a".repeat(40), content: Buffer.from(html).toString("base64") });
  };
  return { deleted, updated, atomic };
}

function makeEnv(values = {}, options = {}) {
  const kv = new MockKV({ ["session:" + SESSION]: { login: "hamadcheema", created: Date.now() }, ...values }, options);
  return { DRAFTS: kv, GITHUB_TOKEN: "test-token", IP_RATE_LIMIT_SECRET: "test-hmac-secret-for-unit-tests", GITHUB_OWNER: "hamadcheema", GITHUB_REPO: "red", GITHUB_BRANCH: "main" };
}

async function call(path, { method = "GET", body } = {}, env) {
  const request = new Request(ORIGIN + "/admin-api" + path, {
    method,
    headers: {
      origin: ORIGIN,
      cookie: "trs_admin_session=" + SESSION,
      ...(body === undefined ? {} : { "content-type": "application/json" })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  return worker.__run(request, env);
}

test("media deletion blocks a relative URL stored in a published collection", async () => {
  const github = installGitHubMock();
  const env = makeEnv({
    "collection:projects": [{ title: "Game", image: "/assets/uploads/used.jpg" }]
  });
  const response = await call("/media/delete", { method: "POST", body: { path: "assets/uploads/used.jpg" } }, env);
  const result = await response.json();
  assert.equal(response.status, 409);
  assert.match(result.error, /projects collection/);
  assert.deepEqual(github.deleted, []);
});

test("media deletion blocks an image referenced in published HTML", async () => {
  const github = installGitHubMock({
    pages: { "index.html": '<img src="/assets/uploads/used.jpg" alt="Game">' }
  });
  const env = makeEnv();
  const response = await call("/media/delete", { method: "POST", body: { path: "https://theredsparrow.online/assets/uploads/used.jpg?v=1" } }, env);
  const result = await response.json();
  assert.equal(response.status, 409);
  assert.match(result.error, /index.html published page/);
  assert.deepEqual(github.deleted, []);
});

test("unused media can be deleted even if audit logging is unavailable", async () => {
  const github = installGitHubMock();
  const env = makeEnv({}, { failAudit: true });
  const response = await call("/media/delete", { method: "POST", body: { path: "assets/uploads/unused.jpg" } }, env);
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.deleted, true);
  assert.deepEqual(github.deleted, ["assets/uploads/unused.jpg"]);
});

test("DELETE draft removes a remote page draft", async () => {
  const env = makeEnv({ "draft:page:home": { title: "Old draft" } });
  const response = await call("/draft?key=page%3Ahome", { method: "DELETE" }, env);
  assert.equal(response.status, 200);
  assert.equal(await env.DRAFTS.get("draft:page:home", "json"), null);
});

test("page publishing writes descriptive alt text for the selected image", async () => {
  const github = installGitHubMock({ pages: { "index.html": '<html><head><title>Old</title></head><body><h1>Old heading</h1><p class="hero-copy">Old intro</p></body></html>' } });
  const env = makeEnv();
  const response = await call("/publish/page", {
    method: "POST",
    body: {
      slug: "home",
      title: "The Red Sparrow",
      description: "A valid description for The Red Sparrow website.",
      heading: "Ideas into interactive worlds.",
      intro: "A valid introduction for the homepage.",
      imageUrl: ORIGIN + "/assets/uploads/bird.jpg",
      imageAlt: "Red Sparrow brand emblem"
    }
  }, env);
  assert.equal(response.status, 200);
  const update = github.updated.find(item => item.path === "index.html");
  assert.ok(update);
  const publishedHtml = Buffer.from(update.body.content, "base64").toString("utf8");
  assert.match(publishedHtml, /alt="Red Sparrow brand emblem"/);
  assert.match(publishedHtml, /loading="lazy" decoding="async"/);
});

test("SEO publishing updates Open Graph and Twitter image descriptions", async () => {
  const github = installGitHubMock({
    pages: {
      "privacy.html": '<html><head><title>Old</title><meta property="og:image:alt" content="Old image"><meta name="twitter:image" content="https://theredsparrow.online/og-image.png"></head><body></body></html>'
    }
  });
  const env = makeEnv();
  const response = await call("/publish/seo", {
    method: "POST",
    body: {
      slug: "privacy",
      title: "Privacy Policy — The Red Sparrow",
      description: "Privacy information for visitors to The Red Sparrow website.",
      canonical: ORIGIN + "/privacy.html",
      ogTitle: "Privacy Policy — The Red Sparrow",
      ogDescription: "Privacy information about this website.",
      ogImage: ORIGIN + "/og-image.png",
      ogImageAlt: "The Red Sparrow brand emblem on a dark background"
    }
  }, env);
  assert.equal(response.status, 200);
  const update = github.updated.find(item => item.path === "privacy.html");
  assert.ok(update);
  const publishedHtml = Buffer.from(update.body.content, "base64").toString("utf8");
  assert.match(publishedHtml, /property="og:image:alt" content="The Red Sparrow brand emblem on a dark background"/);
  assert.match(publishedHtml, /name="twitter:image:alt" content="The Red Sparrow brand emblem on a dark background"/);
});


test("content endpoint returns both draft and published collection snapshots", async () => {
  const published = [{ title: "Published game", description: "Live item", image: ORIGIN + "/assets/uploads/live.jpg", url: "" }];
  const draft = [{ title: "Draft game", description: "Unpublished item", image: ORIGIN + "/assets/uploads/draft.jpg", url: "" }];
  const env = makeEnv({
    "collection:projects": published,
    "collection-draft:projects": draft,
    "collection-published-at:projects": "2026-11-18T12:00:00.000Z"
  });
  const response = await call("/content?kind=projects", {}, env);
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(result.items, draft);
  assert.deepEqual(result.publishedItems, published);
  assert.equal(result.draft, true);
  assert.equal(result.publishedAt, "2026-11-18T12:00:00.000Z");
});

test("schedule endpoint stores a future collection publication and returns it", async () => {
  const items = [{ title: "Scheduled game", description: "A valid scheduled showcase", image: ORIGIN + "/assets/uploads/game.jpg", url: "" }];
  const env = makeEnv({ "collection-draft:projects": items });
  const scheduledAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const created = await call("/schedule", { method: "POST", body: { kind: "projects", scheduledAt } }, env);
  const createdData = await created.json();
  assert.equal(created.status, 200);
  assert.equal(createdData.scheduled, true);
  const listed = await call("/schedule", {}, env);
  const listedData = await listed.json();
  assert.equal(listed.status, 200);
  assert.equal(listedData.items.length, 1);
  assert.equal(listedData.items[0].id, createdData.id);
  assert.deepEqual(listedData.items[0].items, items);
});


test("failed scheduled publications can be retried without changing their collection snapshot", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const key = "scheduled:1790000000000:" + id;
  const job = {
    id, kind: "projects", items: [{ title: "Saved game" }],
    scheduledAt: "2026-11-17T12:00:00.000Z", status: "failed", error: "Temporary GitHub error"
  };
  const env = makeEnv({ [key]: job });
  const response = await call("/schedule/retry", { method: "POST", body: { id } }, env);
  const result = await response.json();
  const updated = await env.DRAFTS.get(key, "json");
  assert.equal(response.status, 200);
  assert.equal(result.scheduled, true);
  assert.equal(updated.status, "scheduled");
  assert.deepEqual(updated.items, job.items);
  assert.equal(updated.error, undefined);
  assert.ok(Date.parse(updated.scheduledAt) > Date.now());
});

test("inquiry listing reports all stored counts while returning only the latest 100 messages", async () => {
  const values = Object.fromEntries(Array.from({ length: 105 }, (_, i) => {
    const id = "00000000-0000-4000-8000-" + String(i).padStart(12, "0");
    return ["inquiry:" + id, { id, name: "Visitor " + i, email: "visitor" + i + "@example.com", subject: "Question " + i, message: "A sufficiently long enquiry message.", createdAt: new Date(1700000000000 + i * 1000).toISOString(), status: i % 2 === 0 ? "new" : "read" }];
  }));
  const env = makeEnv(values);
  const response = await call("/inquiries", {}, env);
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.total, 105);
  assert.equal(result.unread, 53);
  assert.equal(result.items.length, 100);
});


test("site settings publish all changed public pages in one atomic Git commit", async () => {
  const page = '<!doctype html><html><head><title>Test</title></head><body><section data-trs-section="hero"><h1>Hero stays</h1></section><section data-trs-section="intro">Intro stays</section><section data-trs-section="services">Services stay</section><section data-trs-section="workflow">Workflow stays</section><section data-trs-section="contact">Contact stays</section><a href="mailto:admin@theredsparrow.online">admin@theredsparrow.online</a><a href="mailto:hammad@theredsparrow.online">hammad@theredsparrow.online</a><p>Independent Unity game development.</p></body></html>';
  const pages = Object.fromEntries(["index.html", "about.html", "services.html", "contact.html", "privacy.html", "terms.html"].map(path => [path, page]));
  const github = installGitHubMock({ pages });
  const env = makeEnv();
  const settings = {
    contactEmail: "admin@theredsparrow.online",
    directEmail: "hammad@theredsparrow.online",
    tagline: "Independent interactive game development.",
    announcementEnabled: true,
    announcement: "New work is coming soon."
  };
  const saved = await call("/site-settings", { method: "POST", body: settings }, env);
  assert.equal(saved.status, 200);
  const published = await call("/publish/site-settings", { method: "POST", body: {} }, env);
  const result = await published.json();
  assert.equal(published.status, 200);
  assert.equal(result.files, 6);
  assert.equal(github.atomic.trees.length, 1);
  assert.equal(github.atomic.trees[0].tree.length, 6);
  assert.equal(github.atomic.commits.length, 1);
  assert.equal(github.atomic.refs.length, 1);
  assert.equal(await env.DRAFTS.get("site-settings:draft", "json"), null);
});

test("publishing a collection clears its stale draft snapshot", async () => {
  const items = [{ id: "11111111-1111-4111-8111-111111111111", title: "Published game", description: "A published showcase", image: "assets/uploads/game.jpg", url: "" }];
  const index = '<!doctype html><html><head></head><body><!-- ADMIN:projects:START --><!-- ADMIN:projects:END --><!-- ADMIN:social:START --><!-- ADMIN:social:END --><!-- ADMIN:brands:START --><!-- ADMIN:brands:END --></body></html>';
  installGitHubMock({ pages: { "index.html": index } });
  const env = makeEnv({ "collection-draft:projects": items });
  const response = await call("/publish/content", { method: "POST", body: { kind: "projects" } }, env);
  assert.equal(response.status, 200);
  assert.equal(await env.DRAFTS.get("collection-draft:projects", "json"), null);
  assert.deepEqual(await env.DRAFTS.get("collection:projects", "json"), items);
  assert.equal(env.DRAFTS.putOptions.has("collection:projects"), false, "published collection snapshots must not expire");
});

test("inquiry pagination returns older records without losing total counts", async () => {
  const values = Object.fromEntries(Array.from({ length: 105 }, (_, i) => {
    const id = "00000000-0000-4000-8000-" + String(i).padStart(12, "0");
    return ["inquiry:" + id, { id, name: "Visitor " + i, email: "visitor" + i + "@example.com", subject: "Question " + i, message: "A sufficiently long enquiry message.", createdAt: new Date(1700000000000 + i * 1000).toISOString(), status: "read" }];
  }));
  const env = makeEnv(values);
  const response = await call("/inquiries?offset=100&limit=100", {}, env);
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.total, 105);
  assert.equal(result.offset, 100);
  assert.equal(result.items.length, 5);
  assert.equal(result.hasMore, false);
});


test("malformed public enquiry JSON returns a 400 without leaking parser errors", async () => {
  const env = makeEnv();
  const request = new Request(ORIGIN + "/admin-api/inquiries", { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json" }, body: "{" });
  const response = await worker.default.fetch(request, env);
  const result = await response.json();
  assert.equal(response.status, 400);
  assert.equal(result.error, "Invalid JSON body.");
});

test("content endpoint reports whether the saved draft differs from published content", async () => {
  const published = [{ title: "Live", description: "Live description", image: ORIGIN + "/assets/uploads/live.jpg", url: "" }];
  const draft = [{ title: "Draft", description: "Changed description", image: ORIGIN + "/assets/uploads/live.jpg", url: "" }];
  const env = makeEnv({ "collection:projects": published, "collection-draft:projects": draft });
  const response = await call("/content?kind=projects", {}, env);
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.draftChanged, true);
});


test("unused media can be moved to trash and restored", async () => {
  const github = installGitHubMock();
  const env = makeEnv();
  const deleted = await call("/media/delete", { method: "POST", body: { path: "assets/uploads/unused.jpg" } }, env);
  const deletedResult = await deleted.json();
  assert.equal(deleted.status, 200);
  assert.equal(deletedResult.trashed, true);
  const trashResponse = await call("/media/trash", {}, env);
  const trash = await trashResponse.json();
  assert.equal(trash.items.length, 1);
  assert.equal(trash.items[0].path, "assets/uploads/unused.jpg");
  const restored = await call("/media/restore", { method: "POST", body: { id: trash.items[0].id } }, env);
  const restoredResult = await restored.json();
  assert.equal(restored.status, 200);
  assert.equal(restoredResult.restored, true);
  assert.ok(github.updated.some(x => x.path === "assets/trash/" + trash.items[0].id + "-unused.jpg"));
  assert.ok(github.updated.some(x => x.path === "assets/uploads/unused.jpg"));
  assert.ok(github.deleted.includes("assets/trash/" + trash.items[0].id + "-unused.jpg"));
  assert.equal((await env.DRAFTS.get("trash:media:" + trash.items[0].id)), null);
});


test("publishing selected collection items preserves unselected draft items", async () => {
  const github = installGitHubMock({ pages: { "index.html": '<!doctype html><!-- ADMIN:projects:START --><!-- ADMIN:projects:END -->' } });
  const live = [{ id: "11111111-1111-4111-8111-111111111111", title: "Live", description: "Live item", image: "assets/uploads/live.jpg", url: "" }];
  const selected = [{ id: "22222222-2222-4222-8222-222222222222", title: "Selected", description: "Publish this", image: "assets/uploads/selected.jpg", url: "" }];
  const remaining = [{ id: "33333333-3333-4333-8333-333333333333", title: "Keep draft", description: "Do not publish yet", image: "assets/uploads/draft.jpg", url: "" }];
  const env = makeEnv({ "collection:projects": live, "collection-draft:projects": [...live, ...selected, ...remaining] });
  const response = await call("/publish/content", { method: "POST", body: { kind: "projects", items: [...live, ...selected], preserveDraft: true, remainingDraft: remaining } }, env);
  assert.equal(response.status, 200);
  assert.deepEqual(await env.DRAFTS.get("collection:projects", "json"), [...live, ...selected]);
  assert.deepEqual(await env.DRAFTS.get("collection-draft:projects", "json"), [...live, ...selected, ...remaining]);
  assert.equal(github.updated.some(x => x.path === "index.html"), true);
});


test("scheduled cleanup permanently removes media trash after seven days", async () => {
  const github = installGitHubMock();
  const id = "44444444-4444-4444-8444-444444444444";
  const env = makeEnv({ ["trash:media:" + id]: { id, name: "old.jpg", path: "assets/uploads/old.jpg", trashPath: "assets/trash/" + id + "-old.jpg", size: 10, deletedAt: new Date(Date.now() - 8 * 86400000).toISOString() } });
  await worker.default.scheduled({}, env);
  assert.equal(await env.DRAFTS.get("trash:media:" + id), null);
  assert.ok(github.deleted.includes("assets/trash/" + id + "-old.jpg"));
});


test("GitHub OAuth login binds the state to a short-lived browser cookie", async () => {
  const env = makeEnv();
  env.GITHUB_OAUTH_CLIENT_ID = "test-client";
  const request = new Request(ORIGIN + "/admin-api/auth/login");
  const response = await worker.__run(request, env);
  assert.equal(response.status, 302);
  const location = new URL(response.headers.get("location"));
  assert.equal(location.hostname, "github.com");
  const state = location.searchParams.get("state");
  const cookie = response.headers.get("set-cookie") || "";
  assert.match(cookie, /^trs_oauth_browser=[a-f0-9-]{36};/);
  const browser = cookie.match(/^trs_oauth_browser=([^;]+)/)?.[1];
  assert.deepEqual(await env.DRAFTS.get("oauth-state:" + state, "json"), { browser });
});

test("GitHub OAuth callback rejects state copied into a different browser", async () => {
  const env = makeEnv();
  const state = "00000000-0000-4000-8000-000000000099";
  await env.DRAFTS.put("oauth-state:" + state, JSON.stringify({ browser: "browser-a" }), { expirationTtl: 600 });
  const request = new Request(ORIGIN + "/admin-api/auth/callback?state=" + state + "&code=fake-code", {
    headers: { cookie: "trs_oauth_browser=browser-b" }
  });
  const response = await worker.__run(request, env);
  assert.equal(response.status, 400);
  assert.match(await response.text(), /restart sign-in/);
  assert.equal(await env.DRAFTS.get("oauth-state:" + state), null);
});


test("rollback rejects a commit that is not in the selected file history", async () => {
  const github = installGitHubMock();
  const env = makeEnv();
  const response = await call("/rollback", {
    method: "POST",
    body: { path: "index.html", sha: "f".repeat(40) }
  }, env);
  const result = await response.json();
  assert.equal(response.status, 400);
  assert.match(result.error, /verified history/);
  assert.deepEqual(github.updated, []);
});


test("media uploads remove PNG EXIF and text metadata before committing", async () => {
  const chunk = (name, data = Buffer.alloc(0)) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    return Buffer.concat([length, Buffer.from(name), data, Buffer.alloc(4)]);
  };
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", Buffer.alloc(13)),
    chunk("eXIf", Buffer.from("GPS location metadata")),
    chunk("tEXt", Buffer.from("Comment\\0private note")),
    chunk("IDAT", Buffer.from([1, 2, 3])),
    chunk("IEND")
  ]);
  const github = installGitHubMock();
  const env = makeEnv();
  const response = await call("/media/upload", {
    method: "POST",
    body: {
      name: "metadata-test.png",
      type: "image/png",
      base64: png.toString("base64")
    }
  }, env);
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.uploaded, true);
  const upload = github.updated.find(item => item.path.startsWith("assets/uploads/"));
  assert.ok(upload);
  const saved = Buffer.from(upload.body.content, "base64");
  assert.equal(saved.includes(Buffer.from("eXIf")), false);
  assert.equal(saved.includes(Buffer.from("GPS location metadata")), false);
  assert.equal(saved.includes(Buffer.from("private note")), false);
  assert.equal(saved.includes(Buffer.from("IDAT")), true);
});


test("public enquiries store an HMAC of the visitor IP instead of a plain hash", async () => {
  const env = makeEnv();
  const request = new Request(ORIGIN + "/admin-api/inquiries", {
    method: "POST",
    headers: {
      origin: ORIGIN,
      "cf-connecting-ip": "203.0.113.44",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      consent: true,
      name: "Test Visitor",
      email: "visitor@example.com",
      subject: "Website question",
      message: "This is a test enquiry for the website."
    })
  });
  const response = await worker.__run(request, env);
  assert.equal(response.status, 201);
  const keys = [...env.DRAFTS.values.keys()].filter(key => key.startsWith("inquiry-rate:"));
  assert.equal(keys.length, 1);
  assert.match(keys[0], /^inquiry-rate:[a-f0-9]{64}:[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
  assert.equal(keys[0].includes("203.0.113.44"), false);
});

test("website section visibility hides sections without removing their content", async () => {
  const page = '<html><head></head><body><section data-trs-section="hero"><h1>Hero stays</h1></section><section data-trs-section="intro">Intro stays</section><section data-trs-section="services">Services stay</section><section data-trs-section="workflow">Workflow stays</section><section data-trs-section="contact">Contact stays</section><!-- ADMIN:projects:START --><!-- ADMIN:projects:END --><!-- ADMIN:social:START --><!-- ADMIN:social:END --><!-- ADMIN:brands:START --><!-- ADMIN:brands:END --></body></html>';
  const github = installGitHubMock({ pages: { "index.html": page } });
  const env = makeEnv();
  const visibility = { hero: false, intro: true, services: false, projects: true, social: true, brands: true, workflow: true, contact: false };
  const saved = await call("/site-settings", { method: "POST", body: {
    contactEmail: "admin@theredsparrow.online", directEmail: "hammad@theredsparrow.online",
    tagline: "Independent Unity game development.", sectionVisibility: visibility
  } }, env);
  assert.equal(saved.status, 200);
  const published = await call("/publish/site-settings", { method: "POST", body: {} }, env);
  assert.equal(published.status, 200);
  const blob = github.atomic.blobs.find(item => String(item.content || "").includes("Hero stays"));
  assert.ok(blob);
  const html = String(blob.content);
  assert.match(html, /data-trs-section="hero" style="display:none" hidden><h1>Hero stays<\/h1>/);
  assert.match(html, /data-trs-section="intro">Intro stays<\/section>/);
  assert.match(html, /data-trs-section="services" style="display:none" hidden>Services stay<\/section>/);
  assert.match(html, /data-trs-section="contact" style="display:none" hidden>Contact stays<\/section>/);
  assert.deepEqual((await env.DRAFTS.get("site-settings:live", "json")).sectionVisibility, visibility);
});

test("website section visibility rejects unknown keys and non-boolean values", async () => {
  const env = makeEnv();
  const invalid = await call("/site-settings", { method: "POST", body: {
    contactEmail: "admin@theredsparrow.online", directEmail: "hammad@theredsparrow.online",
    tagline: "Independent Unity game development.", sectionVisibility: { unknown: false }
  } }, env);
  assert.equal(invalid.status, 400);
});
