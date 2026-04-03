# Benchmark task: Conditional logic flow

## Natural language description

A process branches on evaluated conditions over inputs and optional prior outcomes. Example: if the user’s region is `EU`, apply GDPR retention rules; otherwise apply default retention. If the account is `enterprise`, skip the marketing step; otherwise run it. Multiple conditions can combine (e.g. region **and** plan tier). The implementation must make the branch structure explicit enough that an independent reader can see which path runs for which inputs.

## Expected behavior summary

- **Exhaustiveness:** For the defined input space, every combination maps to exactly one **primary path** (or a documented **fallback** path for “else”).
- **No silent default:** If an input combination is undefined, the system must **error** or take an explicit `else` path—never an undocumented mix of branches.
- **Test vectors:** At least three distinct input scenarios are distinguishable: EU vs non-EU, enterprise vs non-enterprise, and one combined case.
- **Side effects:** Actions tied to a branch (e.g. “apply strict retention”) run **only** when that branch is taken.
