# LegacyShield

An autonomous, multi-agent AI pipeline that modernizes and security-hardens legacy code, built as a native VS Code extension.

## Inspiration

The recent "PHP2Shell" crisis (CVE-2026-109618 and CVE-2026-109619) exposed millions of legacy installations to remote code execution, proving that unpatched legacy software is a massive financial and security liability. From experience building enterprise application architecture at JPMorgan Chase, migrating legacy code is rarely just about updating syntax—it is a critical security mandate where a single unchecked string can result in a catastrophic data breach. This inspired LegacyShield: a tool to automate the modernization and security hardening of outdated enterprise codebases without leaving the developer environment.

## What it does

LegacyShield is an autonomous, multi-agent AI pipeline integrated directly into a developer's IDE. Instead of acting as a simple code-completion chatbot, it functions as a contextual security pipeline. When a developer highlights outdated or insecure code, LegacyShield triggers an autonomous "Red Team versus Blue Team" debate loop. It modernizes the syntax, aggressively audits the new code for zero-day vulnerabilities, scores the security posture, and applies a final patch, displaying the entire debate and final secure code in a visual dashboard.

## How it works

The core intelligence is powered by the Google Gemini API (`gemini-3.8-flash`), which runs a three-step agent chain in seconds:

1. **Blue Team (Modernization):** Gemini translates the legacy code into modern, secure Python.
2. **Red Team (Security Audit):** The newly generated code is fed to a second Gemini agent instructed to act as a ruthless attacker. It hunts for vulnerabilities (like SQL injection or memory leaks) and returns a security score out of 100.
3. **Blue Team (Final Patch):** Using the Red Team's findings, the Blue Team agent makes a final pass to apply specific security patches (like `argon2` hashing or parameterized queries).

The results are rendered in a custom VS Code Webview using HTML/CSS: a color-coded score, the audit log, and the final secured code.

## Getting started

### Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- VS Code 1.140 or newer
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Setup

```bash
git clone <your-repo-url>
cd legacyshield
npm install
cp .env.example .env
```

Open `.env` and set your key:

```
GEMINI_API_KEY=your-key-here
```

`.env` is git-ignored, so your key is never committed.

### Run it

1. Open the `legacyshield` folder in VS Code.
2. Run `npm run compile` (or `npm run watch` to rebuild on save).
3. Press **F5** to launch the Extension Development Host.
4. In the new window, open a file with legacy code and select the code (Cmd/Ctrl+A for the whole file).
5. Open the command palette (Cmd/Ctrl+Shift+P) and run **LegacyShield: Run Migration Agent**. You can also right-click the selection and choose it from the editor menu.

A panel opens beside the editor and walks through the three steps.

To stop the debugger, press Shift+F5.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/extension.ts` | Extension entry point, the agent pipeline, and the Webview UI |
| `.env.example` | Template listing the environment variables the extension needs |
| `package.json` | Extension manifest, command and menu contributions |

## Challenges we ran into

Integrating modern ESM-only AI SDKs into the CommonJS architecture of VS Code extensions required dynamic imports and asynchronous module loading. Additionally, we initially architected a dual-model system but ran into API billing and access constraints midway through the hackathon. We had to pivot rapidly, re-engineering our prompt chain to force Gemini to adopt opposing adversarial personas, ensuring the Red Team audit remained highly critical of the Blue Team's output.

## Accomplishments that we're proud of

We are proud of moving beyond a standard web-based AI chat wrapper to build a native, context-aware developer tool. Chaining LLM calls so the model critiques and fixes its own work autonomously, and rendering that adversarial debate in a clean, color-coded IDE dashboard, results in a highly practical enterprise tool.

## What we learned

We learned how to architect VS Code extensions from scratch, including registering commands, handling editor context, and passing messages between the extension host and a Webview UI. We also refined our prompt engineering to force the LLM into strict, adversarial roles without hallucinating or breaking the output format needed for the UI dashboard.

## What's next

The next step is scaling LegacyShield from single-file snippets to repository-wide migrations. We plan to integrate it into CI/CD pipelines (like GitHub Actions) so that pull requests containing legacy patterns are automatically intercepted, audited by the Red Team agent, and returned with a fully modernized, secure Blue Team patch ready for review.

## Known limitations

- Only single selections are supported, not whole repositories.
- Output is always translated to Python 3.
- AI-generated patches are a starting point. Review them before using them in production.
