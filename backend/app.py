import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
BASE_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

# --- OpenRouter API config ---
OPENROUTER_API_KEY = "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"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_MODEL = "openai/gpt-4o"

app = Flask(__name__, static_folder="static", static_url_path="/static")
CORS(app)

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "welcomepage.html")

def extract_text_from_response(rj):
    if not isinstance(rj, dict):
        return str(rj)
    if "candidates" in rj and isinstance(rj["candidates"], list) and rj["candidates"]:
        first = rj["candidates"][0]
        if isinstance(first, dict):
            if "content" in first and isinstance(first["content"], list):
                for c in first["content"]:
                    if isinstance(c, dict) and "text" in c:
                        return c["text"]
            if "text" in first and isinstance(first["text"], str):
                return first["text"]
    def find_text(obj):
        if isinstance(obj, dict):
            if "text" in obj and isinstance(obj["text"], str):
                return obj["text"]
            for v in obj.values():
                res = find_text(v)
                if res:
                    return res
        if isinstance(obj, list):
            for item in obj:
                res = find_text(item)
                if res:
                    return res
        return None
    res = find_text(rj)
    return res or ""

def extract_openrouter_text(rj):
    # OpenRouter (OpenAI style) response
    try:
        return rj["choices"][0]["message"]["content"]
    except Exception:
        return str(rj)

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json() or {}
    user_message = data.get("message", "")
    history = data.get("history", [])
    system_instruction = data.get("system", "You are a friendly assistant named JK AI.")
    provider = data.get("provider", "gemini")  # "gemini" or "openrouter"

    if provider == "openrouter":
        # --- OpenRouter API call ---
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "<YOUR_SITE_URL>",
            "X-Title": "<YOUR_SITE_NAME>"
        }
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        for item in history:
            role = item.get("role", "user") if isinstance(item, dict) else "user"
            text = item.get("text") if isinstance(item, dict) else str(item)
            if text:
                messages.append({"role": role, "content": text})
        messages.append({"role": "user", "content": user_message})

        payload = {
            "model": OPENROUTER_MODEL,
            "messages": messages,
            "max_tokens": 512,
            "temperature": 0.2
        }
        try:
            resp = requests.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            resp.raise_for_status()
            rj = resp.json()
            reply_text = extract_openrouter_text(rj)
            return jsonify({"reply": reply_text, "raw": rj})
        except requests.exceptions.RequestException as e:
            err_text = str(e)
            try:
                body = e.response.text
                status = e.response.status_code
                return jsonify({"error": err_text, "status": status, "body": body}), 500
            except Exception:
                return jsonify({"error": err_text}), 500

    else:
        # --- Gemini API call (default) ---
        if not GEMINI_API_KEY:
            return jsonify({"error": "GEMINI_API_KEY not configured on server"}), 500

        contents = []
        for item in history:
            role = item.get("role", "user") if isinstance(item, dict) else "user"
            text = item.get("text") if isinstance(item, dict) else str(item)
            if text:
                contents.append({"role": role, "parts": [{"text": text}]})

        contents.append({"role": "user", "parts": [{"text": user_message}]})

        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": contents,
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 512
            }
        }

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY
        }

        try:
            resp = requests.post(BASE_URL, headers=headers, json=payload, timeout=30)
            resp.raise_for_status()
            rj = resp.json()
            reply_text = extract_text_from_response(rj)
            return jsonify({"reply": reply_text, "raw": rj})
        except requests.exceptions.RequestException as e:
            err_text = str(e)
            try:
                body = e.response.text
                status = e.response.status_code
                return jsonify({"error": err_text, "status": status, "body": body}), 500
            except Exception:
                return jsonify({"error": err_text}), 500

if __name__ == "__main__":
    app.run(debug=True, port=int(os.getenv("PORT", 5000)))
