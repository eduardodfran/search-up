SEARCH UP

🔍 Press a keyboard shortcut → Show floating search bar (on any site) → Enter query → AI gives a short answer → All without leaving the page or opening a new tab.

✅ Phase 1 – Minimal Working Demo (1–2 days)

Setup manifest.json

Create floating search bar (content script)

Register keyboard shortcut (Ctrl+Shift+S)

    Fetch answer from Gemini API and show it below the search input

✅ Phase 2 – Polish (1–2 days)

Add enter key submit

Escape key to close

Minimal dark style with blur/glass effect

    Loading spinner or "thinking…" message

✅ Phase 3 – Deploy to Firefox & Chrome (optional icons/screenshots)

Create icons (128px recommended)

Add screenshot1.png for store listing

Package as ZIP

Upload to:

    addons.mozilla.org

Addition update

✅1. “Quick Actions” After Answer

After showing a response, let users:

    Copy answer 📋

    Share to email / notes

    Open full answer in a tab

    “Explain more” (follow-up)

✅2. Instant Page Summary Shortcut

🧠 Press shortcut → "Summarize this page"

    Uses document.body.innerText → sends to Gemini

    AI returns summary right on the page

    Perfect for long articles, blog posts, Reddit, etc.

✅3. Modes how long the ai will answer

Added three answer length modes:

- **Brief**: 1-2 sentences (quick facts)
- **Detailed**: 3-5 sentences (balanced explanation)
- **Comprehensive**: Full explanation with context and examples

Features:

- Mode selector buttons in search bar UI
- Keyboard shortcuts: Ctrl+1 (Brief), Ctrl+2 (Detailed), Ctrl+3 (Comprehensive)
- Visual indicator showing current mode
- Different prompts sent to AI based on selected mode
- Page summaries automatically use detailed mode
