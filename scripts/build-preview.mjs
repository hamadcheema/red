import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "dist-preview");

const excluded = [
  ".git", ".github", ".well-known", "dist-preview", "admin-preview",
  "CNAME", "README.md", "sitemap.xml", "ads.txt",
  "admin/worker.js", "admin/wrangler.toml", "admin/SETUP.md", "admin/tests",
];

function shouldCopy(source) {
  const rel = path.relative(root, source).split(path.sep).join("/");
  if (!rel) return true;
  return !excluded.some(item => rel === item || rel.startsWith(item + "/"));
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const entry of fs.readdirSync(root)) {
  const source = path.join(root, entry);
  if (!shouldCopy(source)) continue;
  fs.cpSync(source, path.join(out, entry), { recursive: true, filter: shouldCopy });
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(html|js|xml|txt|svg|css)$/i.test(entry.name)) {
      let content = fs.readFileSync(full, "utf8");
      const rel = path.relative(out, full).split(path.sep).join("/");
      if (rel.startsWith("admin/")) {
        content = content.replaceAll("theredsparrow.online", "preview.theredsparrow.online");
        content = content.replaceAll("/blob/main/", "/blob/cloudflare-preview/");
      } else {
        content = content.replaceAll("https://theredsparrow.online", "https://preview.theredsparrow.online");
      }
      fs.writeFileSync(full, content);
    }
  }
}
walk(out);

fs.writeFileSync(path.join(out, "robots.txt"), "User-agent: *\nDisallow: /\n");
fs.writeFileSync(path.join(out, "_headers"), "/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n");
console.log("Built clean Cloudflare preview into dist-preview.");
