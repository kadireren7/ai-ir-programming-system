# 30 Day Comeback Plan

A practical rhythm for **Torqa**: a canonical and verifiable workflow specification core for AI-native automation. This is a **guide**, not a guarantee—adjust to your bandwidth.

## Core Rule

**Small, consistent progress beats random big bursts.**  
Thirty minutes of focused work most days beats one exhausted weekend that burns you out and leaves the repo messy.

---

## Week 1 — Stabilize

**Goal:** The repo is accurate, runnable, and boringly reliable.

Examples of concrete work:

- **Review docs** — README, Quickstart, First run, Examples: one pass for stale links, contradictions, and overclaims.
- **Fix wording** — Tighten anything that sounds like a runtime or full platform; keep positioning sharp.
- **Clean repo structure** — Obvious files in the right places; `.gitignore` sane; no stray scratch files committed.
- **Verify examples** — Run `demo.tq` / `demo.py` from docs; run `python -m pytest`; note failures and fix.
- **Improve tests** — Add a small test where coverage is thin (e.g. one more parse error path or semantic edge case), not a rewrite.

**Exit criterion:** A new contributor could follow First run without hitting avoidable errors.

---

## Week 2 — Product Signal

**Goal:** The *spec core* feels slightly easier and clearer to use—not bigger.

Examples:

- **`.tq` usability** — Sharper parser messages for one common mistake; or document one rich-surface pattern if it already exists in code.
- **Better diagnostics** — Clearer distinction in user-facing text: parse vs structural vs semantic failure.
- **One stronger real-world example** — Extend [Examples](examples.md) with a honest, concrete scenario (no fake features).
- **Smoother first-run** — Shorten friction in [first-run.md](first-run.md) or Quickstart based on what confused you when re-running from scratch.

**Exit criterion:** Someone new reports “I understood what failed and why” at least once (even if that someone is you).

---

## Week 3 — Credibility

**Goal:** Outsiders see discipline: automation, clarity, and intent to collaborate.

Examples:

- **CI checks** — Lint/format if not present; doc link check; ensure pytest stays green on PRs.
- **Schema docs** — Short section tying `spec/IR_BUNDLE.schema.json` to Concepts or Architecture.
- **Parsing benchmark** — Optional: tiny script + README note (“parse N times, rough timing”)—honest, not competitive benchmarking.
- **Contribution guide** — `CONTRIBUTING.md`: how to run tests, scope of PRs, positioning reminder.
- **Code comments** — Only where the *why* is non-obvious (IR edge, semantic rule); avoid noise.

**Exit criterion:** A PR from outside would have a clear bar and wouldn’t surprise them with hidden rules.

---

## Week 4 — Visibility

**Goal:** Controlled exposure and feedback—not a launch circus.

Examples:

- **Publish one post** — Blog, dev.to, or a single thoughtful thread; point to README + Diagrams + Why now.
- **Share to communities** — One or two places from [public-launch.md](public-launch.md); read rules; no spam.
- **Collect feedback** — Issues, email, or comments—capture verbatim pain points.
- **Create issues from feedback** — Turn real requests into scoped tickets (or “won’t do” with reason).
- **Choose next milestone** — e.g. “diagnostics v2,” “one IR migration,” “registry extension pattern”—pick **one** focus for month two.

**Exit criterion:** You have a short list of real feedback and a single named next milestone—not a hundred dreams.

---

## Daily Operating System

A light rhythm (15–45 minutes on busy days, more when you have it):

| Habit | Action |
|--------|--------|
| **1 small task** | One issue closed, one paragraph fixed, one test added—finishable today. |
| **1 improvement** | Slightly better error text, link, or comment—not a refactor of everything. |
| **1 note learned** | One line in a dev journal or issue: “users stumble on X” or “parser Y is confusing.” |
| **Commit progress** | Small commits; history should tell a story. |
| **Stop before burnout** | If you’re tired, ship the small thing and walk away. Momentum tomorrow > heroics tonight. |

---

## What to Avoid

- **Rewriting everything** — Polish and extend; don’t burn the repo down for a “perfect” v2 in 30 days.
- **Chasing trends** — New framework buzz, unrelated AI features, or “we need a SaaS” unless that’s the actual product decision.
- **Adding fake features** — No demo-only capabilities that aren’t validated or documented honestly.
- **Giant scope jumps** — “Rewrite in Rust” or “full IDE” in a month—defer to a milestone list, not a panic week.
- **Comparing to huge companies daily** — Measure against last week’s repo and your own plan, not FAANG roadmaps.

---

## Success After 30 Days

Realistic outcomes:

- **Clearer repo** — Docs and examples match the code; positioning is obvious in two minutes.
- **Stronger trust** — Tests + CI + honest limits; fewer “is this production?” surprises because you answered it in writing.
- **Real momentum** — A streak of small commits and at least one visible improvement others can name.
- **Next milestone visible** — One prioritized follow-on (not twenty), informed by feedback or your own usage.

That is enough to call the month a success.

---

## Tone

**Encouraging:** Progress is allowed to be quiet.  
**Practical:** Shippable slices, not manifestos.  
**Disciplined:** Say no often; protect the core positioning and the thin scope.

---

*Torqa stays a specification core—not a runtime. The comeback is about clarity and reliability at that layer.*
