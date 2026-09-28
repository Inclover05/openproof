# OpenProof

OpenProof checks a dated public promise against independent public evidence and historical smart-contract state. It also offers a separate contract-state mode for an exact historical field comparison without claiming anyone made a promise.

## What you can check

- **Admin and owner control**: compare `owner()` with an expected address.
- **Treasury restrictions**: compare `unlockTime()` with a minimum Unix timestamp.
- **Contract changes**: compare the EIP-1967 implementation slot with an expected address.

Ethereum and Base are supported. The cutoff maps to a finalized block; current state never substitutes for missing history. The result is **Supported**, **Contradicted**, or **Insufficient evidence**, only after successful GenLayer contract execution.

## Public sources

Direct public X post URLs use the official X embed endpoint and normalized text. Public Medium articles require a readable article body. Blocked, paywalled, private, deleted, or unrelated sources do not become evidence of a broken promise. Add a separately attributed corroborating source while retaining the original URL. Images, videos, whole threads, identity, and legal or beneficial ownership are outside scope.

## Stack

Next.js 16, React 19, TypeScript, shadcn/ui, Neon Postgres on Vercel, GenLayerJS 1.1.8, and a Python Intelligent Contract on Bradbury. The website stores evidence previews and immutable case inputs. Validators retrieve evidence and own the verdict. Wallets sign directly; the web server holds no signing key.

## Run locally

Use Node 22.13 or newer. Install with `npm ci`. Link the correct Vercel project and run `vercel env pull .env.local` to obtain `DATABASE_URL`. Then run `npm run db:migrate` and `npm run dev`. Do not commit environment files or signing keys.

- `npm test`: JavaScript regression tests.
- `npm run lint`: lint checks.
- `npm run build`: production build and type validation.
- `scripts/verify-api.mjs`: real API and database acceptance checks; set `OPENPROOF_TEST_URL` to the test deployment.
- `tests/test_contract.py` and `tests/test_contract_v2.py`: direct GenLayer SDK fixture tests; require the compatible `genlayer-test` toolchain.
- `scripts/live-suite.mjs`: labelled live Bradbury acceptance tests. These spend test GEN and use an ignored local test key; they are not part of the web runtime.

## Deployment and contracts

Live application: https://openproof-three.vercel.app

Project and user guide: https://openproof-three.vercel.app/OpenProof-Project-and-User-Guide.pdf

Vercel project: `inclover05s-projects/openproof`. Source repository: https://github.com/Inclover05/openproof (private).

Current v2 contract: `0xB74B3339695C50C6d16168708e2B22A7D6D72EAB` on Bradbury, chain 4221. Legacy v1 records retain `0x0546Ba4582b7733DB52E3309692BCF7b5B1CAcCe` and their exact original payloads. See `reports/deployment-social-v2.json` and `reports/live-suite-v2.json` for live execution details.

The original private Sites deployment is preserved at https://openproof-evidence.inclover05.chatgpt.site. Private user-created cases remain there; only explicitly labelled public test records are seeded into the new Vercel database. Earlier D1 migrations and feasibility reports are retained as history.

## Project guide and verification

Read `PROJECT_GUIDE.md` for the project's uses, user experience, evidence outcomes, and limits. The homepage includes an interactive explanation and links to real network-assessed cases. Fictional sample cases are clearly labelled. Recorded checks remain in `reports/` and the test scripts.

Public sharing is read-only; case IDs are unlisted identifiers, not authentication. Do not store private information. The free providers and testnet can rate-limit or change. A supported bounded comparison is not a security audit, proof of identity, investment recommendation, or legal finding.
