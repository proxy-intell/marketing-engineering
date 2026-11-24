import unittest
from scripts import build

P = [{"slug": "a", "name": "A", "url": "https://a.dev"}, {"slug": "b", "name": "B", "url": "https://b.dev"}]
OK = [{"slug": "s", "job": "do a thing", "steps": [{"tool": "a", "why": "first"}, {"tool": "b", "why": "then"}]}]

class Setups(unittest.TestCase):
    def test_valid_has_no_errors(self):
        self.assertEqual(build.setup_errors(OK, P), [])

    def test_unknown_tool_unsorted_duplicate_short(self):
        bad = [
            {"slug": "z", "job": "x", "steps": [{"tool": "a", "why": "w"}, {"tool": "nope", "why": "w"}]},
            {"slug": "s", "job": "x", "steps": [{"tool": "a", "why": "w"}]},
            {"slug": "s", "job": "x", "steps": [{"tool": "a", "why": "w"}, {"tool": "a", "why": "w"}]},
        ]
        errs = "\n".join(build.setup_errors(bad, P))
        for needle in ("nope", "sorted by slug", "duplicate", "2 to 6 steps", "repeats a tool"):
            self.assertIn(needle, errs)

    def test_filler_and_length(self):
        bad = [{"slug": "s", "job": "J" * 41, "steps": [{"tool": "a", "why": "a powerful step"}, {"tool": "b", "why": "w" * 61}]}]
        errs = "\n".join(build.setup_errors(bad, P))
        for needle in ("job", "filler", "60"):
            self.assertIn(needle, errs)

    def test_block_orders_by_voters_and_shows_count_at_three(self):
        setups = OK + [{"slug": "t", "job": "another", "steps": OK[0]["steps"]}]
        block = build.setups_block(setups, P, {"t": {"voters": 3}})
        self.assertLess(block.index("another"), block.index("do a thing"))
        self.assertIn("run by 3", block)
        self.assertIn("[A](https://a.dev)", block)
        self.assertIn("https://marketingengineering.dev/setups/t.md", block)

    def test_kind_tag_data_needs_no_install(self):
        self.assertEqual(build.kind_tag({"kind": "data"}), " · data")

if __name__ == "__main__":
    unittest.main()
