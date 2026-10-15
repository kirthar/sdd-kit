# Clarification sweep

Sweep these eight angles before writing a functional or technical spec. Ask only where the
request, the existing docs **and the code** are silent. Re-asking what is already answered teaches
people to ignore the sweep.

| Angle | Ask about |
|---|---|
| Roles and permissions | Who can do it; who must not; what "everyone" means |
| Empty and degenerate states | Nothing yet, one item, a deleted parent, partial data |
| Errors | Invalid input, conflicts, downstream failure, retries, idempotency |
| Limits and volume | Sizes, rates, pagination, timeouts |
| Data and history | Existing records, backfill, what happens to old data |
| Contract | Inputs, outputs, compatibility, who consumes it |
| Non-functional | Latency, availability, privacy, audit, accessibility |
| Out of scope | What a reader might assume is included but is not |

Rules
- At most 4 questions per batch. Each question offers concrete options and a recommendation.
- Mark each open item `BLOCKING` or `NON-BLOCKING`. When unsure, it is BLOCKING.
- A decision that belongs to the engineer is not a clarification: record it under Decisions with
  the rejected alternative.
- Write each answer where it belongs in the artifact, never as a chat log.
- Never silently repair a vague requirement; it becomes a question.
