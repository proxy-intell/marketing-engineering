import json

import pytest

from scripts.check_voter import check

SLUGS = {"posthog", "resend"}
GOOD = {"login": "octocat", "agent": "claude-code", "voted": "2026-11-24", "tools": [{"slug": "posthog", "usage": "daily"}]}


def run(over=None, files=None, author="octocat"):
    files = files or [{"filename": "voters/octocat.json", "status": "added"}]
    return check(author, files, json.dumps({**GOOD, **(over or {})}), SLUGS)


def test_accepts_own_file_and_its_removal():
    assert run() is None
    assert run(files=[{"filename": "voters/octocat.json", "status": "modified"}]) is None
    assert check("octocat", [{"filename": "voters/octocat.json", "status": "removed"}], None, SLUGS) is None


def test_rejects_other_files_and_other_people():
    assert run(author="mallory")
    assert run(files=[{"filename": "voters/octocat.json", "status": "added"}, {"filename": "README.md", "status": "modified"}])
    assert run(files=[{"filename": "catalog.json", "status": "modified"}])
    assert run(files=[{"filename": "voters/octocat.json", "status": "renamed"}])


@pytest.mark.parametrize("over", [
    {"login": "Octocat"},
    {"agent": "skynet"},
    {"voted": "yesterday"},
    {"tools": []},
    {"tools": [{"slug": "not-listed", "usage": "daily"}]},
    {"tools": [{"slug": "posthog", "usage": "always"}]},
    {"tools": [{"slug": "posthog", "usage": "daily"}, {"slug": "posthog", "usage": "weekly"}]},
    {"tools": [{"slug": "posthog", "usage": "daily", "note": "hi"}]},
    {"extra": 1},
])
def test_rejects_bad_content(over):
    assert run(over)


def test_rejects_broken_json():
    assert check("octocat", [{"filename": "voters/octocat.json", "status": "added"}], "{nope", SLUGS)
