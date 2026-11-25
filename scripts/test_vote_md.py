"""The check in vote.md prints catalog slugs only: nothing unlisted, no hosts, no secrets."""
import json
import re
import subprocess
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_check_prints_only_matching_catalog_slugs(tmp_path):
    script = textwrap.dedent(re.search(r"python3 - <<'EOF'\n(.*?)\n  EOF", (ROOT / "vote.md").read_text(), re.S).group(1))
    catalog = {"products": [
        {"slug": "stripe", "name": "Stripe", "url": "https://stripe.com", "mcp_url": "https://mcp.stripe.com"},
        {"slug": "resend", "name": "Resend", "url": "https://resend.com"},
        {"slug": "claude-code", "name": "Claude Code", "url": "https://claude.com/claude-code"},
        {"slug": "posthog", "name": "PostHog", "url": "https://posthog.com"},
    ]}
    (tmp_path / "catalog.json").write_text(json.dumps(catalog))
    home, proj = tmp_path / "home", tmp_path / "proj"
    (home / ".claude/skills/internal-deploy").mkdir(parents=True)
    (proj / ".agents/skills/PostHog").mkdir(parents=True)
    (home / ".claude.json").write_text(json.dumps({
        "mcpServers": {
            "pay": {"url": "https://mcp.stripe.com/?api_key=sk_live_SECRET"},
            "corp-vault": {"url": "https://vault.internal.example/mcp", "headers": {"Authorization": "Bearer SECRET"}},
            "lookalike": {"url": "https://notstripe.com/mcp"},
            "shared-domain": {"url": "https://mcp.claude.com/x"},
        },
        "projects": {"/x": {"mcpServers": {"Resend": {"command": "npx", "args": ["--key", "SECRET"]}}}},
    }))
    (proj / ".mcp.json").write_text("not json")
    out = subprocess.run([sys.executable, "-c", script, str(tmp_path / "catalog.json")], cwd=proj, capture_output=True, text=True,
                         env={"HOME": str(home), "PATH": ""})
    assert out.stdout.splitlines() == ["posthog skill", "resend mcp", "stripe mcp"]
    assert out.stderr == ""
