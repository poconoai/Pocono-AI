#!/usr/bin/env python3
"""
Pocono AI — Header/Footer Rebuild Script
=========================================
When you want to update the nav or footer:

  1. Edit  components/header.html   (nav menu)
     OR    components/footer.html   (footer links)

  2. Run:  python3 rebuild.py

That's it. All 31 pages update instantly.

Usage:
    python3 rebuild.py            # rebuild all pages
    python3 rebuild.py --check    # dry-run, show what would change
    python3 rebuild.py --page about.html  # rebuild one page only
"""

import os, sys, re, shutil
from datetime import datetime

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
HEADER_FILE = os.path.join(SCRIPT_DIR, 'components', 'header.html')
FOOTER_FILE = os.path.join(SCRIPT_DIR, 'components', 'footer.html')
NAV_JS      = 'nav.js?v=94'

# ── Version token in HTML comments ─────────────────────────────────
VERSION_PATTERN = re.compile(r'<!-- Pocono AI v(\d+\w*) -->')
CURRENT_VERSION = '94'

def read_component(path):
    with open(path, encoding='utf-8') as f:
        return f.read().strip()

def get_footer_html(raw_footer):
    """Add the year script inside the footer before closing tag."""
    year_script = '    <script>(function(){var e=document.getElementById("footer-year");if(e)e.textContent=new Date().getFullYear();})()</script>\n'
    return raw_footer.replace('</footer>', year_script + '</footer>')

def find_html_files(directory, only_page=None):
    files = []
    for f in sorted(os.listdir(directory)):
        if not f.endswith('.html'):
            continue
        if f.startswith('_'):
            continue
        if only_page and f != only_page:
            continue
        files.append(os.path.join(directory, f))
    return files

def rebuild_page(fpath, header_html, footer_html, dry_run=False):
    with open(fpath, encoding='utf-8') as f:
        original = f.read()

    content = original

    # Replace inline header block
    # Pattern: <header> ... </header>  (the site nav, not section headers)
    header_pattern = re.compile(r'<header>.*?</header>', re.DOTALL)
    if header_pattern.search(content):
        content = header_pattern.sub(header_html, content, count=1)
    else:
        print(f"  ⚠️  {os.path.basename(fpath)}: no <header> found — skipping")
        return False

    # Replace inline footer block
    footer_pattern = re.compile(r'<footer class="site-footer">.*?</footer>', re.DOTALL)
    if footer_pattern.search(content):
        content = footer_pattern.sub(footer_html, content, count=1)
    else:
        print(f"  ⚠️  {os.path.basename(fpath)}: no <footer> found — skipping")
        return False

    if content == original:
        print(f"  —  {os.path.basename(fpath)}: no changes")
        return False

    if dry_run:
        print(f"  ✓  {os.path.basename(fpath)}: would update")
        return True

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  ✅ {os.path.basename(fpath)}: updated")
    return True

def main():
    args = sys.argv[1:]
    dry_run   = '--check' in args
    only_page = None
    if '--page' in args:
        idx = args.index('--page')
        if idx + 1 < len(args):
            only_page = args[idx + 1]

    if not os.path.exists(HEADER_FILE):
        print(f"ERROR: {HEADER_FILE} not found")
        sys.exit(1)
    if not os.path.exists(FOOTER_FILE):
        print(f"ERROR: {FOOTER_FILE} not found")
        sys.exit(1)

    header_html = read_component(HEADER_FILE)
    footer_html = get_footer_html(read_component(FOOTER_FILE))

    mode = "DRY RUN" if dry_run else "REBUILDING"
    print(f"\nPocono AI — {mode} {'(all pages)' if not only_page else only_page}")
    print(f"Header: {HEADER_FILE}")
    print(f"Footer: {FOOTER_FILE}")
    print()

    html_files = find_html_files(SCRIPT_DIR, only_page)
    if not html_files:
        print(f"No HTML files found{' matching ' + only_page if only_page else ''}.")
        sys.exit(1)

    updated = 0
    for fpath in html_files:
        if rebuild_page(fpath, header_html, footer_html, dry_run):
            updated += 1

    print(f"\n{'Would update' if dry_run else 'Updated'}: {updated}/{len(html_files)} pages")
    if not dry_run and updated > 0:
        print("✅ Done. Deploy as normal.")
    print()

if __name__ == '__main__':
    main()
