# Edge-case heuristics

Use as prompts when deriving criteria and test cases. Skip a path only with a one-line reason.

| Path | Look for |
|---|---|
| Scary | Security, data loss, money, privacy, irreversible actions |
| Happy | The main success flow, end to end |
| Angry | Invalid input, wrong order, hostile use |
| Delinquent | Expired, revoked, overdue, suspended states |
| Embarrassing | What would be visible and wrong to a user or customer |
| Desolate | Empty, zero, missing, first-time use |
| Forgetful | Interrupted flows, lost sessions, retries, duplicates |
| Indecisive | Changing one's mind: cancel, undo, edit after submit |
| Greedy | Large volumes, many at once, limits |
| Stressful | Slow or failing dependencies, concurrency, timeouts |
