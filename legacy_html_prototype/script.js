// ----------------------------------------------------
// PROJECT AEGIS V3 - ENTERPRISE FIREWALL LOGIC CORE
// ----------------------------------------------------

let logCount = 0;

// Advanced Threat Matrix
const THREAT_MATRIX = {
    override: { 
        keywords: ["ignore previous", "forget", "bypass", "system prompt", "act as", "ignore rules", "developer mode", "jailbreak", "override", "disregard"],
        score: 60,
        type: "Protocol Override"
    },
    exfiltration: {
        keywords: ["password", "api key", "secret", "token", "reveal", "credentials", "post", "send to", "http://", "extract", "configuration"],
        score: 80,
        type: "Data Exfiltration"
    },
    destruction: {
        keywords: ["delete", "drop table", "sudo", "execute", "rm -rf", "run command", "drop", "truncate", "format"],
        score: 100,
        type: "System Destruction / Tool Misuse"
    }
};

const BENIGN_INTENTS = ["summarize", "explain", "how do i", "translate", "what is", "analyze", "help me with"];

// UI Elements Registration
const DOM = {
    input: document.getElementById('promptInput'),
    btn: document.getElementById('analyzeBtn'),
    verdict: document.getElementById('verdictContainer'),
    panelFirewall: document.getElementById('firewallPanel'),
    loader: document.getElementById('firewallLoader'),
    panelAI: document.getElementById('aiPanel'),
    response: document.getElementById('responseContainer'),
    packet: document.getElementById('dataPacket'),
    lock: document.getElementById('lockIcon'),
    logs: document.getElementById('logsContent'),
    toggle: document.getElementById('externalToggle'),
    riskBar: document.getElementById('riskBar'),
    riskScore: document.getElementById('riskScore'),
    typing: document.getElementById('typingIndicator'),
    ping: document.getElementById('pingValue')
};

// ----------------------------------------------------
// Real-time Event Listeners
// ----------------------------------------------------

// Simulate network ping randomly
setInterval(() => { DOM.ping.textContent = Math.floor(Math.random() * (24 - 12 + 1) + 12); }, 2000);

// Real-time typing & risk analysis
let typingTimer;
DOM.input.addEventListener('input', () => {
    DOM.typing.classList.add('active');
    clearTimeout(typingTimer);
    
    // Live Risk Calculation
    const val = DOM.input.value.toLowerCase();
    let liveScore = calculateRiskScore(val);
    updateRiskMeter(liveScore);

    typingTimer = setTimeout(() => { DOM.typing.classList.remove('active'); }, 500);
});

// Calculate risk score based on keyword hits
function calculateRiskScore(text) {
    if(!text) return 0;
    let score = 0;
    Object.values(THREAT_MATRIX).forEach(category => {
        category.keywords.forEach(kw => { if(text.includes(kw)) score += (category.score / 2); });
    });
    return Math.min(score, 100); // Cap at 100
}

function updateRiskMeter(score) {
    DOM.riskScore.textContent = Math.floor(score);
    DOM.riskBar.style.width = \`\${score}%\`;
    if(score < 30) DOM.riskBar.style.backgroundColor = 'var(--accent-green)';
    else if(score < 70) DOM.riskBar.style.backgroundColor = 'var(--accent-yellow)';
    else DOM.riskBar.style.backgroundColor = 'var(--accent-red)';
}

function setPrompt(text) {
    DOM.input.value = text;
    DOM.input.dispatchEvent(new Event('input')); // Trigger live score
}

// ----------------------------------------------------
// Core Execution Flow
// ----------------------------------------------------

function analyzePrompt() {
    const rawPrompt = DOM.input.value.trim();
    if (!rawPrompt) return;

    let contextualPrompt = DOM.toggle.checked ? \`[SYSTEM_READ_EXTERNAL_URL: http://untrusted.com]\\nContent: \${rawPrompt}\` : rawPrompt;

    // Reset UI State for analysis
    setAnalysisUIState(true);
    
    // Animate packet drop
    DOM.packet.classList.remove('packet-animate');
    void DOM.packet.offsetWidth; 
    DOM.packet.classList.add('packet-animate');

    // Simulate Deep Packet Inspection & LLM Routing latency
    setTimeout(() => { executeHeuristicEngine(contextualPrompt, rawPrompt); }, 900);
}

function setAnalysisUIState(isActive) {
    if(isActive) {
        DOM.btn.disabled = true;
        DOM.btn.innerHTML = '<span>Inspecting...</span>';
        DOM.loader.style.display = 'block';
        DOM.verdict.innerHTML = '<div class="idle-state terminal-text">> Executing semantic regex layers...</div>';
        DOM.panelFirewall.style.background = 'var(--panel-bg)';
        DOM.panelFirewall.style.borderColor = 'var(--border-highlight)';
        DOM.panelAI.style.background = 'var(--panel-bg)';
        DOM.response.innerHTML = '<div class="idle-state terminal-text">> Awaiting IAM token from firewall...</div>';
        DOM.lock.className = 'lock-icon';
        DOM.lock.textContent = '🔒';
    } else {
        DOM.btn.disabled = false;
        DOM.btn.innerHTML = \`<span>Execute Firewall Route</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>\`;
        DOM.loader.style.display = 'none';
        DOM.input.value = ''; // clear input after execution
        updateRiskMeter(0);
    }
}

// ----------------------------------------------------
// The "Guillotine" Checkpoint Rules
// ----------------------------------------------------

function executeHeuristicEngine(fullPrompt, rawUserPrompt) {
    const lower = fullPrompt.toLowerCase();
    
    let isOverride = THREAT_MATRIX.override.keywords.some(kw => lower.includes(kw));
    let isExfil = THREAT_MATRIX.exfiltration.keywords.some(kw => lower.includes(kw));
    let isDestruct = THREAT_MATRIX.destruction.keywords.some(kw => lower.includes(kw));
    let hasBenign = BENIGN_INTENTS.some(intent => lower.includes(intent));

    let detectedVectors = [];
    if(isOverride) detectedVectors.push("Override");
    if(isExfil) detectedVectors.push("Exfiltration");
    if(isDestruct) detectedVectors.push("Destruction");

    // Decision Logic
    if (isDestruct || (isOverride && !hasBenign)) {
        renderVerdict("BLOCKED", detectedVectors.join(" + "), rawUserPrompt, null);
    } 
    else if ((isOverride || isExfil) && hasBenign) {
        // Complex nested attack filtering
        let sanitized = sanitizePayload(rawUserPrompt, lower);
        renderVerdict("FILTERED", "Nested Attack", rawUserPrompt, sanitized);
    } 
    else {
        renderVerdict("ALLOWED", "None", rawUserPrompt, null);
    }
}

function sanitizePayload(raw, lower) {
    let safe = raw;
    if (lower.includes(" and completely ignore")) safe = raw.substring(0, lower.indexOf(" and completely ignore")).trim();
    if (lower.includes(" and ignore")) safe = raw.substring(0, lower.indexOf(" and ignore")).trim();
    if (lower.includes(" secretly")) safe = raw.substring(0, lower.indexOf(" secretly")).trim();
    return safe + "."; // cap it gracefully
}

// ----------------------------------------------------
// UI Rendering & Logging
// ----------------------------------------------------

function renderVerdict(action, vectors, rawPrompt, sanitizedPrompt) {
    setAnalysisUIState(false);
    
    const timestamp = new Date().toISOString();
    let isExternal = DOM.toggle.checked;

    if (action === "BLOCKED") {
        DOM.panelFirewall.style.background = 'var(--panel-bg-blocked)';
        DOM.panelFirewall.style.borderColor = 'var(--accent-red)';
        DOM.verdict.innerHTML = buildVerdictHTML("🛑", "CRITICAL THREAT DETECTED", "var(--accent-red)", vectors, isExternal, "connection dropped", "blocked-badge");

        DOM.panelAI.style.opacity = '0.6';
        DOM.lock.className = 'lock-icon active-block';
        DOM.lock.innerHTML = '🛡️';
        
        let toolMock = vectors.includes("Destruction") 
            ? \`<div class="tool-call tool-blocked"><div><span style="opacity:0.6">> tool_call: </span>execute_shell()</div><div class="status-tag">REJECTED BY WAF</div></div>\` 
            : '';

        DOM.response.innerHTML = \`<div class="terminal-text" style="color: var(--accent-red);">[ERROR 403] INGRESS TRAFFIC DROPPED AT EDGE.<br>NO DATA REACHED ISOLATED CONTAINER.</div>\${toolMock}\`;

    } else if (action === "FILTERED") {
        DOM.panelFirewall.style.background = 'var(--panel-bg-warning)';
        DOM.panelFirewall.style.borderColor = 'var(--accent-yellow)';
        DOM.verdict.innerHTML = buildVerdictHTML("⚠️", "PAYLOAD HEURISTICALLY SANITIZED", "var(--accent-yellow)", "Nested Prompt Injection", isExternal, "rewritten & forwarded", "filtered-badge");

        DOM.panelAI.style.opacity = '1';
        DOM.lock.className = 'lock-icon active-safe';
        DOM.lock.innerHTML = '🔓';
        
        DOM.response.innerHTML = '<div class="terminal-text">> executing sanitized payload...</div>';
        
        setTimeout(() => {
            DOM.response.innerHTML = \`
                <div style="animation: fadeIn 0.4s ease;">
                    <div class="sandbox-output">
                        I am analyzing the document you provided. The summary will be generated shortly. No other actions will be taken.
                    </div>
                    <div class="tool-call"><div><span style="opacity:0.6">> tool_call: </span>document_analyzer()</div><div class="status-tag allowed-badge">APPROVED</div></div>
                </div>
            \`;
        }, 600);

    } else {
        DOM.panelFirewall.style.background = 'var(--panel-bg-safe)';
        DOM.panelFirewall.style.borderColor = 'var(--accent-green)';
        DOM.verdict.innerHTML = buildVerdictHTML("✅", "PAYLOAD CLEAN", "var(--accent-green)", "0 Heuristic Matches", isExternal, "forwarded to container", "allowed-badge");

        DOM.panelAI.style.opacity = '1';
        DOM.lock.className = 'lock-icon active-safe';
        DOM.lock.innerHTML = '🔓';
        
        DOM.response.innerHTML = '<div class="terminal-text">> awaiting simulation start...</div>';
        
        setTimeout(() => {
            DOM.response.innerHTML = \`
                <div style="animation: fadeIn 0.4s ease;">
                    <div class="sandbox-output">
                        Processing your request completely normally based on the information provided.
                    </div>
                </div>
            \`;
        }, 500);
    }

    logSecurityEvent(timestamp, rawPrompt, vectors, action, sanitizedPrompt, isExternal);
}

function buildVerdictHTML(icon, title, color, vector, isExternal, actionText, badgeClass) {
    return \`
        <div class="verdict-content">
            <div class="verdict-header" style="color: \${color};"><span>\${icon}</span> \${title}</div>
            <div class="verdict-details">
                <div class="threat-row"><span>Vector Matches:</span> <strong>\${vector}</strong></div>
                <div class="threat-row"><span>Ingress Origin:</span> <strong>\${isExternal ? 'Untrusted External Interface' : 'Direct CLI Pipeline'}</strong></div>
                <div class="threat-row" style="margin-top: 8px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 8px;">
                    <span>Layer 7 Routing:</span> <span class="status-tag \${badgeClass}">\${actionText}</span>
                </div>
            </div>
        </div>
    \`;
}

// ----------------------------------------------------
// Audit & Log Management
// ----------------------------------------------------

function logSecurityEvent(time, prompt, threat, action, sanitizedStr, isExternal) {
    logCount++;
    document.getElementById('logCounter').textContent = logCount;
    
    let logClass = \`log-\${action.toLowerCase()}\`;
    let extTag = isExternal ? '<span style="color:var(--accent-blue); font-size:10px;">[EXTERNAL]</span>' : '';
    let sanHtml = sanitizedStr ? \`<div class="log-sanitized">>> sanitized: "\${sanitizedStr}"</div>\` : '';

    const html = \`
        <div class="log-entry \${logClass}">
            <div class="log-meta">
                <span>\${extTag} ID: SEC-\${Math.floor(Math.random()*9000)+1000}</span>
                <span>\${time}</span>
            </div>
            <div class="log-payload">"\${prompt}"</div>
            \${sanHtml}
            <div style="display: flex; justify-content: space-between; margin-top: 6px; font-weight: bold;">
                <span style="color: var(--text-secondary);">Vectors: \${threat}</span>
                <span class="\${logClass}-text">\${action}</span>
            </div>
        </div>
    \`;
    
    DOM.logs.insertAdjacentHTML('afterbegin', html);
}

function toggleLogs() { document.getElementById('logsModal').classList.toggle('active'); }
function clearLogs() { DOM.logs.innerHTML = ''; logCount = 0; document.getElementById('logCounter').textContent = '0'; }
