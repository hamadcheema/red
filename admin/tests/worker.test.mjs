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
  }
  async get(key, type) {
    const value = this.values.get(key);
    if (value === undefined) return null;
    return type === "json" ? JSON.parse(value) : value;
  }
  async put(key, value) {
    if (this.failAudit && key.startsWith("audit:")) throw new Error("simulated KV audit outage");
    this.values.set(key, String(value));
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
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input);
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
    if (path.startsWith("assets/uploads/")) return json({ sha: "b".repeat(40) });
    const html = pages[path] ?? "<!doctype html><html><head><title>Test</title></head><body><h1>Test heading</h1><p class=\"hero-copy\">Test introduction</p></body></html>";
    return json({ sha: "a".repeat(40), content: Buffer.from(html).toString("base64") });
  };
  return { deleted, updated };
}

function makeEnv(values = {}, options = {}) {
  const kv = new MockKV({ ["session:" + SESSION]: { login: "hamadcheema", created: Date.now() }, ...values }, options);
  return { DRAFTS: kv, GITHUB_TOKEN: "test-token", GITHUB_OWNER: "hamadcheema", GITHUB_REPO: "red", GITHUB_BRANCH: "main" };
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
