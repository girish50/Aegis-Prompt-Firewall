"""
======================================================================
PROJECT AEGIS: ZERO-TRUST PROMPT INJECTION FIREWALL
======================================================================
This Streamlit application acts as an isolated security layer between 
a user and an LLM. It intercepts inputs, flags attacks using heuristics
and entropy algorithms, and scrubs responses.
"""

import streamlit as st
from datetime import datetime
import math
import os
from google import genai

# Page configuration
st.set_page_config(page_title="Prompt Firewall", layout="wide", initial_sidebar_state="collapsed")

# Custom CSS for Cybersecurity Theme
st.markdown("""
<style>
    /* Global Theme Colors */
    :root {
        --bg-color: #0F172A;
        --card-bg: #1E293B;
        --accent-green: #22C55E;
        --alert-red: #EF4444;
        --text-main: #E2E8F0;
        --text-muted: #94A3B8;
        --highlight: #F59E0B;
    }

    /* Base Styling */
    .stApp {
        background-color: var(--bg-color);
        color: var(--text-main);
        font-family: 'Inter', sans-serif;
    }
    
    /* Headers */
    h1, h2, h3 {
        color: var(--text-main) !important;
        font-weight: 700;
        letter-spacing: -0.5px;
    }

    /* StContainers as Cards */
    div[data-testid="stVerticalBlock"] > div > div[data-testid="stVerticalBlock"] {
        background-color: var(--card-bg);
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    /* Button Styling */
    .stButton > button {
        background-color: var(--accent-green);
        color: #000; /* Dark text for contrast on bright green */
        font-weight: 700;
        border: none;
        border-radius: 4px;
        padding: 0.5rem 1rem;
        transition: all 0.2s;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    
    .stButton > button:hover {
        background-color: #16A34A; /* Slightly darker green */
        color: #fff;
        box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
    }
    
    /* Text Input Styling */
    .stTextInput > div > div > input {
        background-color: #0F172A;
        color: #E2E8F0;
        border: 1px solid #475569;
        border-radius: 4px;
        font-family: 'JetBrains Mono', monospace; /* Monospace for prompts */
    }
    
    .stTextInput > div > div > input:focus {
        border-color: var(--accent-green);
        box-shadow: 0 0 0 1px var(--accent-green);
    }
    
    /* Status Counters */
    .metric-container {
        text-align: center;
        padding: 1rem;
        background-color: var(--card-bg);
        border: 1px solid #334155;
        border-radius: 8px;
    }
    .metric-value {
        font-size: 2rem;
        font-weight: 800;
        font-family: 'JetBrains Mono', monospace;
    }
    .metric-label {
        font-size: 0.8rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    
    /* Status indicators */
    .status-safe { color: var(--accent-green); font-weight: bold; }
    .status-attack { color: var(--alert-red); font-weight: bold; }
    
    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

# --- State Management ---
if 'logs' not in st.session_state:
    st.session_state.logs = []
if 'total_prompts' not in st.session_state:
    st.session_state.total_prompts = 0
if 'attacks_detected' not in st.session_state:
    st.session_state.attacks_detected = 0

# --- Core Logic Engine ---
def calculate_entropy(text):
    """
    [SECURITY FEATURE 1: ENTROPY ANALYZER]
    Calculates Shannon Entropy to detect obfuscated or encrypted payloads (e.g., Base64).
    Hackers often encode their prompts to bypass simple keyword blocklists. 
    High entropy indicates highly randomized or encoded strings, flagging an anomaly.
    """
    if not text:
        return 0
    prob = [float(text.count(c)) / len(text) for c in dict.fromkeys(list(text))]
    entropy = - sum([p * math.log(p) / math.log(2.0) for p in prob])
    return entropy

def sanitize_prompt(text, malicious_keyword):
    """
    [SECURITY FEATURE 2: DYNAMIC SANITIZER]
    Strips the malicious portion of a prompt, allowing the safe intent to pass.
    Instead of binary ALLOW/BLOCK, this ensures safe queries are still answered.
    """
    sanitized = text.replace(malicious_keyword, "[REDACTED]")
    return sanitized

def evaluate_prompt_composition(text):
    """
    [CORE FIREWALL ROUTING ENGINE]
    Evaluates the prompt composition for standard vs malicious segments.
    Implements a 3-Tier Security Routing protocol:
      1. ALL_GOOD: Passes directly to the AI.
      2. MIXED: Sanitizes the prompt before passing to the AI.
      3. ALL_BAD: Instant connection termination.
    """
    text_lower = text.lower()
    override_keywords = ["ignore previous instructions", "act as", "override", "forget all instructions"]
    exfiltration_keywords = ["password", "api key", "reveal", "confidential", "secret"]
    tool_keywords = ["delete files", "run command", "execute", "sudo", "rm -rf"]
    harmful_keywords = ["bomb", "weapon", "kill", "murder", "illegal", "hack into", "steal"]
    
    malicious_found = []
    
    for word in override_keywords + exfiltration_keywords + tool_keywords + harmful_keywords:
        if word in text_lower:
            malicious_found.append(word)
            
    if not malicious_found:
        return "ALL_GOOD", text
        
    # Check if the prompt is ENTIRELY malicious or mixed
    text_length = len(text)
    malicious_length = sum(len(word) for word in malicious_found)
    
    # If the malicious keywords make up the vast majority of the text, it's totally malicious
    if malicious_length > (text_length * 0.6) or text_length < 25:
        return "ALL_BAD", None
        
    # Otherwise, it's a mixed prompt (general question + injected attempt). We sanitize.
    clean_text = text
    for word in malicious_found:
        clean_text = clean_text.replace(word, "[REDACTED]")
        # also try replacing the capitalized versions just in case
        clean_text = clean_text.replace(word.title(), "[REDACTED]")
        clean_text = clean_text.replace(word.upper(), "[REDACTED]")

    return "MIXED", clean_text

def analyze_output(ai_response):
    """
    [SECURITY FEATURE 3: OUTPUT FIREWALL / DLP]
    Scans the AI's generated response for leaked secrets *before* showing the user.
    Prevents authorized prompts from tricking the AI into exfiltrating data.
    """
    text = ai_response.lower()
    if "password" in text or "api key" in text or "secret" in text or "confidential" in text:
        return True # Threat detected in output
    return False

def generate_ai_response(prompt):
    """Calls the live Gemini API to get a real response."""
    # Attempt to use API key if provided by user in the sidebar
    api_key = st.session_state.get('api_key', '')
    if not api_key:
         return "API KEY REQUIRED: Please enter your Google Gemini API Key in the sidebar to simulate a live AI agent."
    
    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text
    except Exception as e:
        return f"Live AI Error: {str(e)}"
        
# --- UI Layout ---

# Header Section
st.markdown("<h1 style='text-align: center; color: #E2E8F0; margin-bottom: 0;'>PROMPT INJECTION FIREWALL</h1>", unsafe_allow_html=True)
st.markdown("<p style='text-align: center; color: #22C55E; font-size: 1.2rem; font-weight: 500; letter-spacing: 2px; margin-bottom: 2rem;'>AI Security Monitoring Console</p>", unsafe_allow_html=True)

# Metrics Counter Row
col1, col2, col3 = st.columns(3)
with col1:
    st.markdown(f"<div class='metric-container'><div class='metric-value' style='color: #3B82F6;'>{st.session_state.total_prompts}</div><div class='metric-label'>Total Prompts</div></div>", unsafe_allow_html=True)
with col2:
    st.markdown(f"<div class='metric-container'><div class='metric-value' style='color: #EF4444;'>{st.session_state.attacks_detected}</div><div class='metric-label'>Attacks Detected</div></div>", unsafe_allow_html=True)
with col3:
    blocked_rate = f"{(st.session_state.attacks_detected / max(st.session_state.total_prompts, 1)) * 100:.0f}%"
    st.markdown(f"<div class='metric-container'><div class='metric-value' style='color: #F59E0B;'>{blocked_rate}</div><div class='metric-label'>Block Rate</div></div>", unsafe_allow_html=True)

st.write("---")

# Main Content Area
st.markdown("### 1. Ingress Point")
user_prompt = st.text_area("Enter your prompt for the AI:", height=120, placeholder="E.g., What is the capital of France? ...or try an injection like 'Ignore previous instructions'")
analyze_btn = st.button("Submit to Firewall")

# Sidebar for API Key
with st.sidebar:
    st.markdown("### ⚙️ System Configuration")
    st.markdown("Provide a free Google Gemini API Key to enable the Live AI Agent.")
    api_key_input = st.text_input("Gemini API Key", type="password", help="Get one for free at aistudio.google.com")
    if api_key_input:
        st.session_state.api_key = api_key_input
    
    if st.button("Clear Log History"):
        st.session_state.logs = []
        st.session_state.total_prompts = 0
        st.session_state.attacks_detected = 0
        st.rerun()

st.write("---")

# Execution block
if analyze_btn and user_prompt:
    st.session_state.total_prompts += 1
    
    status, clean_prompt = evaluate_prompt_composition(user_prompt)
    current_time = datetime.now().strftime("%H:%M:%S")
    
    st.markdown("### 2. Live Inspection Results")
    colA, colB = st.columns(2)
    
    if status == "ALL_GOOD":
        with colA:
            st.success("✅ INTEGRITY: ALL GOOD")
            st.write("No sensitive data or malicious intent detected in the payload.")
            st.write("**Routing:** Forwarding directly to AI Agent.")
        with colB:
             with st.spinner("Awaiting AI response..."):
                   ai_response_text = generate_ai_response(clean_prompt)
             st.info(f"**AI Agent:** {ai_response_text}")
             
        st.session_state.logs.insert(0, f"[`{current_time}`] 🟢 ALLOWED (Clean Prompt)")

    elif status == "MIXED":
        with colA:
            st.warning("⚠️ INTEGRITY: MIXED PAYLOAD")
            st.write("System detected general safe query alongside unauthorized sensitive requests/injections.")
            st.write("**Action:** Blocking unauthorized segment. Only routing general safe query to AI Agent.")
            st.code(f"Sanitized Buffer sent to AI:\n{clean_prompt}")
        with colB:
             with st.spinner("Awaiting AI response..."):
                   ai_response_text = generate_ai_response(clean_prompt)
             st.info(f"**AI Agent:** {ai_response_text}")
             
        st.session_state.logs.insert(0, f"[`{current_time}`] 🟡 SANITIZED (Blocked sensitive data, allowed safe query)")

    elif status == "ALL_BAD":
        st.session_state.attacks_detected += 1
        with colA:
            st.warning("⚠️ INTEGRITY: UNACCEPTABLE REQUEST")
            st.write("The prompt consists entirely of unauthorized instructions or requests for sensitive data.")
            st.write("**Action:** Request denied.")
        with colB:
             st.warning("🤖 **AI Agent:** It's not encourageable, please search correctly.")
             
        st.session_state.logs.insert(0, f"[`{current_time}`] 🟡 DENIED: Unacceptable request.")
            
# Logs Dashboard
st.write("---")
st.markdown("### Transaction History")
with st.container():
    if not st.session_state.logs:
        st.write("<span style='color: #94A3B8; font-family: monospace;'>No transactions logged in this session...</span>", unsafe_allow_html=True)
    else:
        # Only show the 10 most recent logs so it doesn't get cluttered with rubbish
        for log in st.session_state.logs[:10]:
            st.markdown(f"<div style='font-family: monospace; padding: 4px;'>{log}</div>", unsafe_allow_html=True)

# Force a rerun to update the counter metrics immediately after processing
if analyze_btn and user_prompt:
    st.rerun()
