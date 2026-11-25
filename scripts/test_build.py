from scripts import build

P = [{"slug": "a", "name": "A", "url": "https://a.dev"}, {"slug": "b", "name": "B", "url": "https://b.dev"}]
OK = [{"slug": "s", "job": "do a thing", "steps": [{"tool": "a", "why": "first"}, {"tool": "b", "why": "then"}]}]


def test_valid_has_no_errors():
    assert build.setup_errors(OK, P) == []


def test_unknown_tool_unsorted_duplicate_short():
    bad = [
        {"slug": "z", "job": "x", "steps": [{"tool": "a", "why": "w"}, {"tool": "nope", "why": "w"}]},
        {"slug": "s", "job": "x", "steps": [{"tool": "a", "why": "w"}]},
        {"slug": "s", "job": "x", "steps": [{"tool": "a", "why": "w"}, {"tool": "a", "why": "w"}]},
    ]
    errs = "\n".join(build.setup_errors(bad, P))
    for needle in ("nope", "sorted by slug", "duplicate", "2 to 6 steps", "repeats a tool"):
        assert needle in errs


def test_filler_and_length():
    bad = [{"slug": "s", "job": "J" * 41, "steps": [{"tool": "a", "why": "a powerful step"}, {"tool": "b", "why": "w" * 61}]}]
    errs = "\n".join(build.setup_errors(bad, P))
    for needle in ("job", "filler", "60"):
        assert needle in errs


def test_block_orders_by_voters_and_shows_count_at_three():
    setups = OK + [{"slug": "t", "job": "another", "steps": OK[0]["steps"]}]
    block = build.setups_block(setups, P, {"t": {"voters": 3}})
    assert block.index("another") < block.index("do a thing")
    assert "run by 3" in block
    assert "[A](https://a.dev)" in block
    assert "https://marketingengineering.dev/setups/t.md" in block


def test_kind_tag_data_needs_no_install():
    assert build.kind_tag({"kind": "data"}) == " · data"


def test_setup_skill_points_at_the_site_and_names_the_tools():
    text = build.setup_skill(OK[0], P)
    assert text.startswith("---\nname: setup-s\ndescription: Set up the tools to do a thing (A, B)")
    assert "https://marketingengineering.dev/setups/s.md" in text


def test_changelog_is_newest_first_and_a_z_within_a_day():
    products = [
        {"name": "Zed", "url": "https://z.dev", "category": "C", "added": "2026-01-01"},
        {"name": "beta", "url": "https://b.dev", "category": "C", "added": "2026-02-01"},
        {"name": "Alpha", "url": "https://a.dev", "category": "D", "added": "2026-02-01"},
    ]
    body = build.changelog(products)
    assert body.index("## 2026-02-01") < body.index("## 2026-01-01")
    assert body.index("[Alpha]") < body.index("[beta]")
    assert "- Added [Zed](https://z.dev) to C." in body
