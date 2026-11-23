#!/usr/bin/env python3
"""Build server-ready copies of the Nestmatch storyboards.

The storyboard files in this folder are written for the Claude artifact
viewer, which adds the <!doctype>, <html>, <head> and <body> wrapper itself.
This script wraps each one in a complete HTML document (UTF-8 charset,
mobile viewport, standards mode), rewrites links between storyboards to
relative paths, and writes the result plus a landing page to ../site/.

Usage:  python3 storyboard/build_site.py
"""
import re
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = ROOT / "site"
BASE_URL = "https://www.planfortechnology.info/dev/nestmate/"

# source file -> (output file, short description for <meta name="description">)
PAGES = {
    "index.html": ("app.html", "Clickable storyboard of the Nestmatch buyer app: interview, swipe deck, households, picks and goals."),
    "website.html": ("website.html", "Clickable storyboard of the public Nestmatch website: home, search, listing page, agents page and privacy choices."),
    "agent.html": ("agent.html", "Clickable storyboard of the Nestmatch realtor portal: leads, clients, listings, lead buying, website builder and reports."),
    "admin.html": ("admin.html", "Clickable storyboard of the Nestmatch admin console: brokerages, buyers, reports, leads, pricing, MLS feeds, value ratings, vendors and compliance."),
}

# Links that point at the published claude.ai artifacts -> local files
LINKS = {
    "https://claude.ai/artifact/FCfxdSMzAr8R5dFCrCFC6L": "app.html",
    "https://claude.ai/artifact/FaUW2vEmoutLpMcZeFkHHB": "agent.html",
    "https://claude.ai/artifact/SnRWFY7hwXoP8gwJyH8Qxk": "admin.html",
    "https://claude.ai/artifact/DRn48tEczg4XCcpqKbQVYq": "website.html",
}

# What the artifact viewer's own skeleton provided
BASE_STYLE = (
    "<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}"
    "body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>"
)

HEAD_TAG = re.compile(r"^\s*(<title>.*?</title>|<meta\b[^>]*>|<link\b[^>]*>|<style>.*?</style>)", re.S)


def wrap(src: str, description: str) -> str:
    head_parts = []
    rest = src
    while True:
        m = HEAD_TAG.match(rest)
        if not m:
            break
        tag = m.group(1)
        if 'name="claude:' not in tag:  # artifact-viewer-only hint
            head_parts.append(tag)
        rest = rest[m.end():]
    for url, local in LINKS.items():
        rest = rest.replace(f'href="{url}" target="_blank" rel="noopener"', f'href="{local}"')
        rest = rest.replace(url, local)
    head = "\n".join(head_parts)
    return (
        "<!doctype html>\n<html lang=\"en\">\n<head>\n"
        "<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
        f"<meta name=\"description\" content=\"{description}\">\n"
        "<meta name=\"robots\" content=\"noindex\">\n"
        f"{BASE_STYLE}\n{head}\n</head>\n<body>\n{rest.strip()}\n</body>\n</html>\n"
    )


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for src_name, (out_name, desc) in PAGES.items():
        html = wrap((HERE / src_name).read_text(encoding="utf-8"), desc)
        leftover = [u for u in LINKS if u in html]
        assert not leftover, f"{out_name} still links to {leftover}"
        (OUT / out_name).write_text(html, encoding="utf-8")
        print("wrote", OUT / out_name)
    hub = (HERE / "hub.html").read_text(encoding="utf-8")
    (OUT / "index.html").write_text(wrap(hub, "Nestmatch product storyboards: buyer app, public website, realtor portal and admin console."), encoding="utf-8")
    print("wrote", OUT / "index.html")
    spec = ROOT / "docs" / "Nestmatch-Product-Spec.docx"
    if spec.exists():
        shutil.copy(spec, OUT / "nestmatch-product-spec.docx")
    (OUT / ".htaccess").write_text("AddDefaultCharset UTF-8\nDirectoryIndex index.html\n", encoding="utf-8")
    print("done:", BASE_URL)


if __name__ == "__main__":
    main()
