import json
import unittest

from scripts.check_voter import check

SLUGS = {"posthog", "resend"}
GOOD = {"login": "octocat", "agent": "claude-code", "voted": "2026-11-24", "tools": [{"slug": "posthog", "usage": "daily"}]}


def run(over=None, files=None, author="octocat"):
    files = files or [{"filename": "voters/octocat.json", "status": "added"}]
    return check(author, files, json.dumps({**GOOD, **(over or {})}), SLUGS)


class CheckVoter(unittest.TestCase):
    def test_accepts_own_file_and_its_removal(self):
        self.assertIsNone(run())
        self.assertIsNone(run(files=[{"filename": "voters/octocat.json", "status": "modified"}]))
        self.assertIsNone(check("octocat", [{"filename": "voters/octocat.json", "status": "removed"}], None, SLUGS))

    def test_rejects_other_files_and_other_people(self):
        self.assertTrue(run(author="mallory"))
        self.assertTrue(run(files=[{"filename": "voters/octocat.json", "status": "added"}, {"filename": "README.md", "status": "modified"}]))
        self.assertTrue(run(files=[{"filename": "catalog.json", "status": "modified"}]))
        self.assertTrue(run(files=[{"filename": "voters/octocat.json", "status": "renamed"}]))

    def test_rejects_bad_content(self):
        for over in (
            {"login": "Octocat"},
            {"agent": "skynet"},
            {"voted": "yesterday"},
            {"tools": []},
            {"tools": [{"slug": "not-listed", "usage": "daily"}]},
            {"tools": [{"slug": "posthog", "usage": "always"}]},
            {"tools": [{"slug": "posthog", "usage": "daily"}, {"slug": "posthog", "usage": "weekly"}]},
            {"tools": [{"slug": "posthog", "usage": "daily", "note": "hi"}]},
            {"extra": 1},
        ):
            self.assertTrue(run(over), over)
        self.assertTrue(check("octocat", [{"filename": "voters/octocat.json", "status": "added"}], "{nope", SLUGS))


if __name__ == "__main__":
    unittest.main()
