# Pitch Guide: Project Aegis (Prompt Injection Firewall)

## 1. The Opening Hook (The Problem)

"Hi judges. As AI agents become integrated into every industry, the biggest vulnerability isn't the AI's intelligence; it's **Prompt Injection**. Attackers can manipulate LLMs to leak API keys, bypass system prompts, or execute unauthorized commands. Today, most systems rely on the LLM itself to notice if it's being attacked—which is slow, expensive, and easily tricked."

## 2. Our Solution (Project Aegis)

"Our solution is **Project Aegis: a Zero-Trust Prompt Injection Firewall.**
Instead of trusting the AI to defend itself, we physically isolated it. We built an independent security layer—a dual firewall—that sits between the user and the AI Agent."

## 3. How It Works (The 3-Tier Logic)

"Our architecture process every payload through a rigorous pipeline before it ever touches the AI:"

- **Scenario A (Safe Traffic):** If a user asks a normal question, our engine passes it straight to the live AI model.
- **Scenario B (Data Sanitization):** If a user sends a mixed prompt—like asking a normal question but trying to sneak in 'ignore previous instructions'—our engine doesn't just block it. It instantly scrubs the malicious vector and routes only the safe, sanitized intent to the AI.
- **Scenario C (Hard Block):** If the prompt consists entirely of unauthorized instructions or requests for sensitive data—like trying to build a bomb or steal a password—the system drops the connection instantly.

## 4. What We Used (The Tech Stack)

"To build this, we designed a robust, lightweight stack that prioritizes zero-latency interception:"

- **Frontend & Dashboard:** We built a custom **Python & Streamlit** cybersecurity console. It provides a real-time log of the AI's transaction history and threat metrics.
- **The Logic Engine:** We wrote a deterministic inspection engine using pure **Python**. Rather than making expensive API calls to check for threats, we execute instantaneous heuristic array matching and calculate **Shannon Entropy** to detect obfuscated payloads like Base64 attacks.
- **The AI Agent:** Once a prompt is sanitized and cleared by our firewall, we use the **Google Gemini API (`google-genai`)** to generate the final secure response.

## 5. The Output Firewall (Closing Strong)

"Finally, to achieve true Zero-Trust, we implemented an **Output Firewall**. Even if the AI hallucinates or is somehow tricked into outputting a password, our Output Firewall scans the _reply_ before it renders on the screen. If it detects leaked data, it severs the connection."

"In short, Project Aegis proves that AI security doesn't require heavier models—it requires smarter, isolated architectural defense."
