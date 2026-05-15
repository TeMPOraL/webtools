# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A collection of standalone, single-file browser utilities. Each tool is one
self-contained `.html` file at the repo root with inline `<style>` and
`<script>` — there is no build system, package manager, test suite, linter, or
CI. The `README` is intentionally just `TBD`.

## Running and testing

There is no build step. To run or test any tool, open its `.html` file in a
browser. Several tools use ES modules or `fetch`, which can fail under the
`file://` protocol, so prefer serving the directory statically:

```
python3 -m http.server 8000   # then open http://localhost:8000/<tool>.html
```

"Testing" means manually exercising the tool in a browser — there are no
automated tests. State explicitly when a change could not be browser-verified.

## Architecture and conventions

- **Each file is independent.** Tools share no code, no common JS/CSS, and no
  shared assets. A change to one tool never affects another. Inline everything;
  do not introduce shared modules or a bundler.

- **`index.html` is a hand-maintained landing page.** It lists every tool with
  a display name, the filename, and a one-line description. When you add,
  rename, or remove a tool, update `index.html` to match (it uses its own dark
  theme and is unrelated to the styling of individual tools).

- **Dependencies are loaded from CDNs, pinned to exact versions** in the URL
  (e.g. `@cantoo/pdf-lib@2.6.3`, `@zip.js/zip.js@2.4.26`, OpenCV.js `4.8.0`,
  `piexifjs 1.0.6`). When changing a dependency, keep the version pinned in the
  URL. `esm.sh` has been adopted in places for module-import reliability over
  other CDNs — prefer it for ESM imports.

- **All processing is client-side.** Tools deliberately do everything in the
  browser with no server or upload (e.g. the Document Unlocker advertises
  "Files never leave your device"). Preserve this property — do not add network
  calls that send user data anywhere.

- **Tool version lives in the `<title>`** (e.g. `Photo Scan Deskewer Pro V13`).
  When making a meaningful change to a versioned tool, bump that number and
  reflect it in the commit message (commit history is per-tool, e.g. "Update
  image-auto-cnr-snap.html").

- **Related but separate tools are kept as separate files**, not merged:
  `image-auto-cnr.html` (V5) and `image-auto-cnr-snap.html` (V13, the "Pro"
  variant with snapping) both build on OpenCV.js + piexifjs but evolve
  independently.

- **PWA tools embed their manifest inline.** `save-from-clipboard.html` is
  installable via a `data:` URL `<link rel="manifest">` plus an
  `apple-touch-icon`; there is no separate manifest file.

- Some tools are localized to Polish; check existing UI strings in a file
  before assuming language.
