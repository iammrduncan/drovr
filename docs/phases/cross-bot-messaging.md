# Cross-bot messaging

Bots message each other with one verb, `send`. A reply is a send back to the original sender that references the original message id. Guards are a server-stamped hop count, replies that do not trigger further sends, an idempotency key on each send, no self-sends, a cap on sends per turn, and a per-pair rate limit.

Not planned yet.
