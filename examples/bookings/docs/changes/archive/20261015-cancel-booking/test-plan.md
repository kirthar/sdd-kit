# Test plan: cancel a booking

## Cases
| Case | Criterion | Steps | Expected | Level |
|---|---|---|---|---|
| Cancel a confirmed booking | AC-1 | Create b2, cancel b2, read b2 | Status is cancelled | automated |
| Cancel an unknown booking | AC-2 | Cancel "nope" | Error mentions not found | automated |
| Cancel twice | AC-1 | Cancel b2 again | Still cancelled, no error | developer |
