# ICP <> WICP

## 1. Background

Canister cannot send ICP, the foundation delayed the implementation to January 2022, we need a way to solve the ICP <> WICP exchange problem so we don't have to wait until January.

## 2. Solution

1. ICP → WICP, since canister can receive ICP, ICP can be 1 to 1 converted to WICP
2. WICP → ICP, canister cannot send ICP before January, solution for now: A one way market for WICP → ICP

Holders of WICP wants to convert back to ICP, holders of ICP may want to convert ICP to WICP to participate in swap and liquidity farming, we can build a p2p market to match the orders.

Workflow:

1. A holds 100 WICP, B holds 100 ICP, A wants to sell his WICP for ICP, B wants to get WICP
2. A put an sell order on the market: Sell 100 WICP at a 5% discount; WICP is locked in the market canister
3. B bid on A's sell order, create a buy order: Buy 10 WICP, this locks 10 WICP from A's sell order
4. B transfer 9.5 ICP to A's account, submit the ledger block height to the market canister, the market canister verifies the sender, recipient and amount, if all valid, send the 10 WICP to B
5. A's sell order remaining size is now 90 WICP and can accept new buy orders
6. If a buy order is not paid within 15 mins, it expires and release the locked amount in the corresponding sell order

Canisters:

1. WICP
2. Market: core
3. Ledger proxy: read ledger tx info