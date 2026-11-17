#!/usr/bin/env python3
"""Dependency-free structural checks for The Red Sparrow static website."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_PAGES = ["index.html", "about.html", "services.html", "contact.html", "privacy.html", "terms.html"]
HTML_FILES = sorted([*ROOT.glob("*.html"), *ROOT.glob("admin/*.html")])
errors = []
warnings = []

class SiteParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []
        self.images = []
        self.title_seen = False
        self.description_seen = False
        self.main_count = 0
        self.h1_count = 0

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if "id" in values:
            if values["id"] in self.ids:
                errors.append(f"Duplicate id={values['id']!r}")
            self.ids.add(values["id"])
        if tag == "title":
            self.title_seen = True
        if tag == "meta" and values.get("name", "").lower() == "description":
            self.description_seen = bool(values.get("content", "").strip())
        if tag == "main":
            self.main_count += 1
        if tag == "h1":
            self.h1_count += 1
        for attr in ("href", "src"):
            raw = values.get(attr)
            if raw:
                self.links.append((tag, attr, raw))
        if tag == "img":
            if "alt" not in values:
                errors.append("An <img> is missing its alt attribute")
            self.images.append(values)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

def fail(message):
    errors.append(message)

if not HTML_FILES:
    fail("No HTML files were found.")

for file in HTML_FILES:
    parser = SiteParser()
    try:
        source = file.read_text(encoding="utf-8")
    except Exception as exc:
        fail(f"{file.relative_to(ROOT)}: cannot read file: {exc}")
        continue
    parser.feed(source)
    label = str(file.relative_to(ROOT))
    if "<!doctype html>" not in source.lower():
        fail(f"{label}: missing HTML5 doctype")
    if not parser.title_seen:
        fail(f"{label}: missing title element")
    if file.name not in ("404.html",) and file.parent.name != "admin":
        if not parser.description_seen:
            fail(f"{label}: missing meta description")
        if parser.main_count != 1:
            fail(f"{label}: expected exactly one main landmark, found {parser.main_count}")
        if parser.h1_count != 1:
            fail(f"{label}: expected exactly one h1, found {parser.h1_count}")
    for tag, attr, raw in parser.links:
        parts = urlsplit(raw)
        if parts.scheme or parts.netloc or raw.startswith("data:") or raw.startswith("javascript:"):
            continue
        if raw.startswith("#") or not parts.path:
            continue
        path = parts.path
        if path == "/admin-api/auth/login":
            continue  # Cloudflare Worker route, not a static file.
        if path.startswith("/"):
            target = ROOT / path.lstrip("/")
        else:
            target = file.parent / path
        target = target.resolve()
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file():
            fail(f"{label}: broken local {attr}={raw!r}")
    if file.name == "404.html":
        if 'href="#main"' not in source:
            warnings.append("404.html does not include the public-site skip link.")

# Every public page must appear once in the sitemap.
try:
    sitemap = ElementTree.parse(ROOT / "sitemap.xml").getroot()
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    listed = [node.text.strip() for node in sitemap.findall("sm:url/sm:loc", ns) if node.text]
    expected = ["https://theredsparrow.online/" if name == "index.html"
                else f"https://theredsparrow.online/{name}" for name in PUBLIC_PAGES]
    for url in expected:
        if listed.count(url) != 1:
            fail(f"sitemap.xml must contain {url} exactly once")
    for url in listed:
        if "/admin/" in url or url.endswith("/404.html"):
            fail(f"sitemap.xml should not list admin or 404 URL: {url}")
except Exception as exc:
    fail(f"sitemap.xml could not be parsed: {exc}")

try:
    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    if "https://theredsparrow.online/sitemap.xml" not in robots:
        fail("robots.txt does not reference the sitemap")
except Exception as exc:
    fail(f"robots.txt could not be read: {exc}")

if errors:
    print("Site validation failed:")
    for item in errors:
        print(" - " + item)
    raise SystemExit(1)

print(f"Site validation passed: {len(HTML_FILES)} HTML files, local references, metadata, landmarks and sitemap checked.")
for item in warnings:
    print("Warning: " + item)
