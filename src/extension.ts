import * as vscode from 'vscode';
import * as path from 'path';
import * as dotenv from 'dotenv';
import type { GoogleGenAI } from '@google/genai' with { 'resolution-mode': 'import' };
// import OpenAI from 'openai';

// Secrets live in .env (git-ignored); see .env.example
function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is missing. Add it to .env (see .env.example) and restart the extension.`);
    }
    return value;
}

// @google/genai is ESM-only, so it must be loaded with a dynamic import() from this CommonJS extension
let ai: GoogleGenAI | undefined;
async function getGemini(): Promise<GoogleGenAI> {
    if (!ai) {
        const { GoogleGenAI } = await import('@google/genai');
        ai = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') });
    }
    return ai;
}
// const openai = new OpenAI({ apiKey: GROK_API_KEY, baseURL: 'https://api.x.ai/v1' });

export function activate(context: vscode.ExtensionContext) {
    dotenv.config({ path: path.join(context.extensionPath, '.env') });

    let pipelineCmd = vscode.commands.registerCommand('legacyshield.agentPipeline', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const legacyCode = editor.document.getText(editor.selection);
        if (!legacyCode) {
            vscode.window.showErrorMessage('Select legacy code to migrate.');
            return;
        }

        // Create Webview UI
        const panel = vscode.window.createWebviewPanel(
            'legacyShieldUI',
            'LegacyShield: Migration Agent',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        panel.webview.html = getWebviewContent();
        panel.webview.postMessage({ type: 'status', text: 'Step 1: Gemini (Blue Team) is translating legacy code...' });

        try {
            // Step 1: Gemini (Blue Team) Modernizes
            const bluePrompt = `Translate this legacy code into secure, modern Python 3. Return ONLY the raw code without markdown backticks. Code: ${legacyCode}`;
            const blueRes = await (await getGemini()).models.generateContent({ model: 'gemini-3.8-flash', contents: bluePrompt });
            const modernCode = blueRes.text || '';

            panel.webview.postMessage({ type: 'status', text: 'Step 2: Gemini (Red Team) is auditing for zero-day flaws...' });

            // Step 2: Gemini (Red Team) Audits the NEW code
            const redPrompt = `Act as a ruthless red team auditor. Analyze this Python code for vulnerabilities. Provide a Security Score from 1-100, and list 1-2 critical flaws. Format strictly as "SCORE: [number]\nFLAWS: [text]". Code: ${modernCode}`;
            const redRes = await (await getGemini()).models.generateContent({ model: 'gemini-3.8-flash', contents: redPrompt });
            const audit = redRes.text || 'SCORE: 0\nFLAWS: Audit Failed';

            panel.webview.postMessage({ type: 'status', text: 'Step 3: Gemini is applying final security patches...' });

            // Step 3: Gemini Patches based on Red Team feedback
            const patchPrompt = `Here is your modernized code: \n${modernCode}\n\nHere is a red team security audit: \n${audit}\n\nFix the flaws and return ONLY the final secured raw code.`;
            const patchRes = await (await getGemini()).models.generateContent({ model: 'gemini-3.8-flash', contents: patchPrompt });
            const finalCode = (patchRes.text || '').replace(/```python/g, '').replace(/```/g, '').trim();

            // Extract score for the visual heatmap
            const scoreMatch = audit.match(/SCORE:\s*(\d+)/i);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;

            panel.webview.postMessage({ 
                type: 'complete', 
                code: finalCode.replace(/</g, '&lt;').replace(/>/g, '&gt;'), 
                score: score,
                audit: audit 
            });

        } catch (error) {
            panel.webview.postMessage({ type: 'status', text: `Pipeline Error: ${error}` });
        }
    });

    context.subscriptions.push(pipelineCmd);
}

function getWebviewContent() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <style>
                body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); }
                #status { font-weight: bold; margin-bottom: 20px; color: #4DAAF1; font-size: 1.2em; }
                .score-board { padding: 15px; border-radius: 5px; margin-bottom: 20px; font-size: 1.5em; font-weight: bold; text-align: center; }
                .safe { background: rgba(40, 167, 69, 0.2); border: 1px solid #28a745; color: #28a745; }
                .warning { background: rgba(220, 53, 69, 0.2); border: 1px solid #dc3545; color: #dc3545; }
                pre { background: rgba(0,0,0,0.2); padding: 15px; border-radius: 5px; overflow-x: auto; font-family: monospace; }
                .hidden { display: none; }
            </style>
        </head>
        <body>
            <h2>LegacyShield: Autonomous Agent Pipeline</h2>
            <div id="status">Initializing...</div>
            
            <div id="results" class="hidden">
                <div id="scoreBox" class="score-board">Red Team Security Score: <span id="scoreVal"></span>/100</div>
                <h4>Red Team Audit Log:</h4>
                <pre id="auditLog"></pre>
                <h4>Final Secured Code (Gemini Patched):</h4>
                <pre><code id="finalCode"></code></pre>
            </div>

            <script>
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'status') {
                        document.getElementById('status').innerText = message.text;
                    } else if (message.type === 'complete') {
                        document.getElementById('status').innerText = 'Migration & Security Patching Complete!';
                        document.getElementById('results').classList.remove('hidden');
                        document.getElementById('finalCode').innerHTML = message.code;
                        document.getElementById('auditLog').innerText = message.audit;
                        
                        const scoreBox = document.getElementById('scoreBox');
                        document.getElementById('scoreVal').innerText = message.score;
                        scoreBox.className = 'score-board ' + (message.score >= 80 ? 'safe' : 'warning');
                    }
                });
            </script>
        </body>
        </html>
    `;
}
export function deactivate() {}