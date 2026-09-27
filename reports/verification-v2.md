# OpenProof v2 release verification

- Next.js production build and TypeScript: passed locally and on Vercel.
- ESLint: passed.
- Contract fixtures: 30 passed across legacy and v2.
- JavaScript regression: 11 passed.
- API acceptance: 12 passed on the public production URL; see api-verification.json.
- Live Bradbury decisions: matching owner Supported, mismatching owner Contradicted, EIP-1967 implementation Supported, unrelated X source Insufficient evidence. All four finalized with successful execution. The unrelated-source round had four AGREE votes and one TIMEOUT; the other three had five AGREE.
- Live source probes: X readable with a normalized hash; Medium blocked with no hash. Both returned five AGREE votes.
- Browser journeys: desktop collect/review/save; mobile explanation, live-case reload, revised-case prefill; public deployment mobile source preflight and finalized record. No errors reported in those checked journeys; no horizontal overflow at 390px.
- Security boundaries: exact source allowlist and direct post paths, redirect rejection, bounded source/request body, schema validation, per-IP action limits, immutable snapshot matching, exact recipient and payload matching, legacy protocol isolation. Signing key absent from tracked source.
- Document: eight-page PDF, every page visually inspected. Editable source in DEMO_GUIDE.md.

Limits: fixture coverage is not live consensus coverage. No positive live treasury-promise case, wallet-extension signature on the final deployed domain, public appeal transaction, or sustained load test. RPC and social source accessibility can change. This is a verified bounded beta, not a universal guarantee.
