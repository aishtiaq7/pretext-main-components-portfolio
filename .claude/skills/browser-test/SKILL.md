---
name: browser-test
description: Start the dev server and validate the portfolio app in the browser. Use when testing UI changes, responsive design, or entity/canvas behavior.
allowed-tools: Bash(nvm *) Bash(npm run *) Bash(curl *)
---

# Browser Test Skill

1. Run `nvm use node && npm run dev` to start the Vite dev server
2. Wait for it to be ready (usually at http://localhost:5173)
3. Use `curl` or describe what to validate in the browser
4. Check for console errors, layout issues, or regressions
5. Stop the server when done