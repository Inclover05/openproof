# OpenProof

An evidence workspace for bounded, dated smart-contract promises. Explore without a wallet; collect a public source and a historical chain observation; review and save the exact evidence; optionally submit to a GenLayer Intelligent Contract. The contract independently retrieves evidence and owns the decision. The web server never computes a final verdict.

## Implemented

- Responsive scope, evidence, review and persistent case pages.
- Ethereum (1) and Base (8453); verified cutoff block and next-block boundary.
- Three narrow rubrics: `owner()` equality, `unlockTime()` lower bound, EIP-1967 implementation-slot equality. These do not establish broader control or continuous treasury restrictions.
- Source allowlist, redirect rejection, 500 KB retrieval limit, hashes and explicit missing-evidence states.
- D1 persistence, immutable reviewed snapshots, idempotent saving and per-IP request limits.
- Live Bradbury gas quote, injected-wallet signing, exact-payload transaction verification, recovery by transaction ID, execution-aware results and protocol appeal availability/bond display.
- Clearly labelled illustrative cases and one real unrelated-source test, assessed by five validators.
- Feature-detected `start_case` WebMCP tool with validation and lifecycle cleanup.

## Intelligent Contract

Network: **GenLayer Bradbury, chain 4221**. SDK: **genlayer-js 1.1.8**, pinned.

Contract: `0x0546Ba4582b7733DB52E3309692BCF7b5B1CAcCe`

[Deployment transaction](https://explorer-bradbury.genlayer.com/transactions/0xae4862375dcdad10086d8c163a33b8e399e9e112713fa850fbf235beaf6d6f90)

[Live judgment transaction](https://explorer-bradbury.genlayer.com/transactions/0x83c828ab3977acdddf1be2b6309f3264cdd5670c40e27a2ed0feb66901c2882e)

Demonstration case: `/case/1b9b6bcf-4a34-4e60-bd91-b025f8134c07`. Its database seed contains the actual public result and transaction. Refresh checks the network again.

## Development

Node 22.13+ is required. This app adapts the Sites Vinext/Cloudflare starter to GenLayer; it is not a clone of GenLayer's Vue boilerplate.

```sh
npm ci
node scripts/run-framework.mjs build
npm run dev
node --test tests/core.mjs
node node_modules/typescript/bin/tsc --noEmit
```

If the Windows npm shim is misconfigured, invoke `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"` instead of `npm`.

Apply each migration in `drizzle/` once to a fresh local D1 database before using persistence:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_robust_stepford_cuckoos.sql
```

Repeat with migrations 0001 and 0002. Sites applies packaged migrations during publication. Do not replay schema migrations against an already migrated database.

Python fixtures use `genlayer-test==0.29.2`, `genvm-linter==0.11.0`, `cloudpickle==3.1.2`, pytest and the explicit `v0.2.14` GenVM SDK artifact. Run `pytest tests/test_contract.py -q`. The local `.python-tools` folder is ignored. See the verification report for the direct-runner limitation.

## Secrets and source

No signing key or external API secret is required by the hosted app. The funded test deployment key is local in ignored `.secrets/testnet-key`; it is not in source, browser bundles or the deployment archive. Do not use it for assets with real value. `scripts/network.mjs` and `scripts/verify-live.mjs` are explicit local test utilities.

Authenticated Sites repository: `https://git.chatgpt-team.site/0afa4953-32d1-4d26-9760-b41377cafee4/appgprj_6ab7970b1b94819180ddda5c7c71ec8a.git`

## Current limits

Public RPCs can reject historical state reads. In the September 1 Ethereum check, cutoff mapping succeeded but `eth_getCode` returned HTTP 403. The app preserves that failure and never substitutes current state. Deep historical coverage needs independently accessible archive endpoints and further validation.

The live judgment proves the insufficient-evidence path. Supported and contradicted outcomes for all three templates are tested with controlled fixtures, not three independent real promises. The direct runner's sandbox replay is incompatible with this SDK; live five-validator agreement is recorded separately.

Wallet signing on the published domain, wallet reputation warnings, live appeals, refunds and induced consensus disagreement remain unverified. Do not bypass a wallet warning. Gas and appeal-bond quotes are not guaranteed total charges.

The Site starts owner-private. Case links do not grant stranger access until the owner explicitly changes the audience. A public multi-user launch needs additional abuse, moderation and retention controls.

See [verification report](reports/verification.md) and [reviewer guide](REVIEWER_GUIDE.md).
