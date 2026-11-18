#!/usr/bin/env python3
# === VERIFY AFTER EDIT HOOK ===
# Runs after every Edit/Write (main assistant and agents alike). If a JS file was edited it must still
# parse; for any app file (js, html, css) the repeatable checks in .claude/checks/run-checks.js must
# still pass. On a failure the message goes back to whoever made the edit (exit 2) so it is fixed or
# reverted at once instead of being found later by the user.
import sys, json, os, subprocess

data = json.load(sys.stdin)
path = (data.get("tool_input") or {}).get("file_path") or ""
root = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
ext = os.path.splitext(path)[1].lower()
if ext not in (".js", ".html", ".css") or not os.path.abspath(path).startswith(os.path.abspath(root)):
    sys.exit(0)

problems = []
if ext == ".js":
    r = subprocess.run(["node", "--check", path], capture_output=True, text=True)
    if r.returncode != 0:
        problems.append("Syntax error in %s: %s" % (os.path.basename(path), (r.stderr.strip().splitlines() or ["?"])[-1]))
checks = os.path.join(root, ".claude", "checks", "run-checks.js")
if os.path.exists(checks):
    r = subprocess.run(["node", checks], capture_output=True, text=True, cwd=root)
    if r.returncode != 0:
        problems += [l for l in r.stdout.splitlines() if l.startswith("FAIL")]

if problems:
    sys.stderr.write("CHECK FAILED after editing %s. Fix it now or revert your edit before doing anything else:\n- %s\n"
                     % (os.path.basename(path), "\n- ".join(problems)))
    sys.exit(2)
