#!/usr/bin/env python3
# === SECRET SCAN HOOK ===
# Blocks Edit/Write when the new text contains a real secret key shape.
# Matches key shapes only, so docs that merely mention "service_role" pass.
import sys, json, re, base64

data = json.load(sys.stdin)
ti = data.get("tool_input", {})
text = (ti.get("content") or "") + "\n" + (ti.get("new_string") or "")

hits = []
if re.search(r"sb_secret_[A-Za-z0-9_-]{10,}", text):
    hits.append("Supabase secret key (sb_secret_...)")
if re.search(r"AIza[0-9A-Za-z_-]{35}", text):
    hits.append("Google/Gemini API key (AIza...)")
for m in re.finditer(r"eyJ[\w-]{10,}\.(eyJ[\w-]{10,})\.[\w-]{10,}", text):
    try:
        p = m.group(1) + "=" * (-len(m.group(1)) % 4)
        if "service_role" in base64.urlsafe_b64decode(p).decode("utf-8", "ignore"):
            hits.append("Supabase service_role JWT")
    except Exception:
        pass

if hits:
    sys.stderr.write("BLOCKED: this edit would write a secret into a public repo: "
                     + ", ".join(hits) + ". Remove it and ask the user.\n")
    sys.exit(2)
