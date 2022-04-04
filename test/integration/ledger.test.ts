import {
  aliceAccountId,
  aliceIdentity,
  aliceLedgerActor,
  aliceWicpActor,
  bobAccountId,
  bobIdentity,
  bobLedgerActor,
  bobWicpActor,
  custodianAccountId,
  custodianIdentity,
  custodianWicpActor,
  johnAccountId,
  johnIdentity,
  johnWicpActor,
  ledgerAccountId,
  ledgerActor,
  ledgerIdentity,
  minterAccountId,
  minterIdentity,
  wicpAccountId
} from "../setup";
import test from "ava";

const normalActors = [aliceWicpActor, bobWicpActor, johnWicpActor];
const allActors = [...normalActors, custodianWicpActor];

test.serial("transfer ICP successfully.", async t => {
  t.deepEqual(
    await ledgerActor.transfer({
      to: Array.from(Buffer.from(aliceAccountId.toHex(), "hex")),
      fee: {e8s: BigInt(10_000)},
      amount: {e8s: BigInt(70_000_000_000)},
      memo: BigInt(0),
      from_subaccount: [],
      created_at_time: []
    }),
    {Ok: BigInt(2)}
  );
  t.deepEqual(
    await ledgerActor.transfer({
      to: Array.from(Buffer.from(bobAccountId.toHex(), "hex")),
      fee: {e8s: BigInt(10_000)},
      amount: {e8s: BigInt(29_999_980_000)},
      memo: BigInt(0),
      from_subaccount: [],
      created_at_time: []
    }),
    {Ok: BigInt(3)}
  );
  t.deepEqual(
    await ledgerActor.account_balance({
      account: Array.from(Buffer.from(ledgerAccountId.toHex(), "hex"))
    }),
    {e8s: BigInt(0)}
  );
  t.deepEqual(
    await ledgerActor.account_balance({
      account: Array.from(Buffer.from(minterAccountId.toHex(), "hex"))
    }),
    {e8s: BigInt(0)}
  );
  t.deepEqual(
    await ledgerActor.account_balance({
      account: Array.from(Buffer.from(aliceAccountId.toHex(), "hex"))
    }),
    {e8s: BigInt(70_000_000_000)}
  );
  t.deepEqual(
    await ledgerActor.account_balance({
      account: Array.from(Buffer.from(bobAccountId.toHex(), "hex"))
    }),
    {e8s: BigInt(29_999_980_000)}
  );
  t.deepEqual(
    await ledgerActor.account_balance({
      account: Array.from(Buffer.from(johnAccountId.toHex(), "hex"))
    }),
    {e8s: BigInt(0)}
  );
  t.deepEqual(
    await ledgerActor.account_balance({
      account: Array.from(Buffer.from(custodianAccountId.toHex(), "hex"))
    }),
    {e8s: BigInt(0)}
  );
});

test.serial("verify WICP initial stats.", async t => {
  const result = await custodianWicpActor.stats();
  t.truthy(result.cycles);
  t.is(result.icps, BigInt(0));
  t.is(result.total_supply, BigInt(0));
  t.is(result.total_transactions, BigInt(0));
  t.is(result.total_unique_holders, BigInt(0));
  t.truthy(await custodianWicpActor.cycles());
  t.is(await custodianWicpActor.icps(), BigInt(0));
  t.is(await custodianWicpActor.totalSupply(), BigInt(0));
  t.is(await custodianWicpActor.totalTransactions(), BigInt(0));
  t.is(await custodianWicpActor.totalUniqueHolders(), BigInt(0));
});

test.serial("error on query stats when the caller is non-custodian.", async t => {
  (await Promise.allSettled(normalActors.map(actor => actor.stats()))).forEach(promise =>
    t.is(promise.status, "rejected")
  );
  (await Promise.allSettled(normalActors.map(actor => actor.cycles()))).forEach(promise =>
    t.is(promise.status, "rejected")
  );
  (await Promise.allSettled(normalActors.map(actor => actor.icps()))).forEach(promise =>
    t.is(promise.status, "rejected")
  );
  (await Promise.allSettled(normalActors.map(actor => actor.totalSupply()))).forEach(promise =>
    t.is(promise.status, "rejected")
  );
  (await Promise.allSettled(normalActors.map(actor => actor.totalTransactions()))).forEach(promise =>
    t.is(promise.status, "rejected")
  );
  (await Promise.allSettled(normalActors.map(actor => actor.totalUniqueHolders()))).forEach(promise =>
    t.is(promise.status, "rejected")
  );
});

test.serial("error on query backup when the caller is non-custodian.", async t => {
  (await Promise.allSettled(normalActors.map(actor => actor.backup()))).forEach(promise =>
    t.is(promise.status, "rejected")
  );
});

test.serial("verify initial users balance.", async t => {
  (await Promise.all(allActors.map(actor => actor.balanceOf(ledgerIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(0))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(minterIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(0))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(aliceIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(0))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(bobIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(0))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(johnIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(0))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(custodianIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(0))
  );
});

test.serial("transfer ICP to WICP canister.", async t => {
  t.deepEqual(
    await aliceLedgerActor.transfer({
      to: Array.from(Buffer.from(wicpAccountId.toHex(), "hex")),
      fee: {e8s: BigInt(10_000)},
      amount: {e8s: BigInt(50_000_000_000)},
      memo: BigInt(0),
      from_subaccount: [],
      created_at_time: []
    }),
    {Ok: BigInt(4)}
  );
  t.deepEqual(
    await bobLedgerActor.transfer({
      to: Array.from(Buffer.from(wicpAccountId.toHex(), "hex")),
      fee: {e8s: BigInt(10_000)},
      amount: {e8s: BigInt(20_000_000_000)},
      memo: BigInt(0),
      from_subaccount: [],
      created_at_time: []
    }),
    {Ok: BigInt(5)}
  );
  t.deepEqual(
    await ledgerActor.account_balance({
      account: Array.from(Buffer.from(wicpAccountId.toHex(), "hex"))
    }),
    {e8s: BigInt(70_000_000_000)}
  );
  t.deepEqual(
    await ledgerActor.account_balance({
      account: Array.from(Buffer.from(aliceAccountId.toHex(), "hex"))
    }),
    {e8s: BigInt(19_999_990_000)}
  );
  t.deepEqual(
    await ledgerActor.account_balance({
      account: Array.from(Buffer.from(bobAccountId.toHex(), "hex"))
    }),
    {e8s: BigInt(9_999_970_000)}
  );
});

test.serial("error on `mint` invalid operation.", async t => {
  (await Promise.all(allActors.map(actor => actor.mint([], BigInt(1))))).forEach(result =>
    t.deepEqual(result, {Err: {ErrorOperationStyle: null}})
  );
});

test.serial("error on `mint` invalid block.", async t => {
  (await Promise.all(allActors.map(actor => actor.mint([], BigInt(6))))).forEach(result =>
    t.deepEqual(result, {Err: {BlockError: null}})
  );
});

test.serial("error on `mint` unauthorized `from`.", async t => {
  (
    await Promise.all([
      aliceWicpActor.mint([], BigInt(2)),
      aliceWicpActor.mint([], BigInt(5)),
      bobWicpActor.mint([], BigInt(3)),
      bobWicpActor.mint([], BigInt(4)),
      johnWicpActor.mint([], BigInt(4)),
      custodianWicpActor.mint([], BigInt(5))
    ])
  ).forEach(result => t.deepEqual(result, {Err: {Unauthorized: null}}));
});

test.serial("transfer ICP from alice to john.", async t => {
  t.deepEqual(
    await aliceLedgerActor.transfer({
      to: Array.from(Buffer.from(johnAccountId.toHex(), "hex")),
      fee: {e8s: BigInt(10_000)},
      amount: {e8s: BigInt(9_999_980_000)},
      memo: BigInt(0),
      from_subaccount: [],
      created_at_time: []
    }),
    {Ok: BigInt(6)}
  );
  t.deepEqual(
    await ledgerActor.account_balance({
      account: Array.from(Buffer.from(aliceAccountId.toHex(), "hex"))
    }),
    {e8s: BigInt(10_000_000_000)}
  );
  t.deepEqual(
    await ledgerActor.account_balance({
      account: Array.from(Buffer.from(johnAccountId.toHex(), "hex"))
    }),
    {e8s: BigInt(9_999_980_000)}
  );
});

test.serial("transfer ICP from bob to john.", async t => {
  t.deepEqual(
    await bobLedgerActor.transfer({
      to: Array.from(Buffer.from(johnAccountId.toHex(), "hex")),
      fee: {e8s: BigInt(10_000)},
      amount: {e8s: BigInt(999_960_000)},
      memo: BigInt(0),
      from_subaccount: [],
      created_at_time: []
    }),
    {Ok: BigInt(7)}
  );
  t.deepEqual(
    await ledgerActor.account_balance({
      account: Array.from(Buffer.from(bobAccountId.toHex(), "hex"))
    }),
    {e8s: BigInt(9_000_000_000)}
  );
  t.deepEqual(
    await ledgerActor.account_balance({
      account: Array.from(Buffer.from(johnAccountId.toHex(), "hex"))
    }),
    {e8s: BigInt(10_999_940_000)}
  );
});

test.serial("error on `mint` unauthorized `to`.", async t => {
  (await Promise.all([aliceWicpActor.mint([], BigInt(6)), bobWicpActor.mint([], BigInt(7))])).forEach(result =>
    t.deepEqual(result, {Err: {ErrorTo: null}})
  );
});

test.serial("`mint` WICP.", async t => {
  // alice mint
  const result1 = await Promise.all([
    aliceWicpActor.mint([], BigInt(4)), // attempt to break atomicity.
    aliceWicpActor.mint([], BigInt(4)), // attempt to break atomicity.
    aliceWicpActor.mint([], BigInt(4)), // attempt to break atomicity.
    aliceWicpActor.mint([], BigInt(4)), // attempt to break atomicity.
    aliceWicpActor.mint([], BigInt(4)) // attempt to break atomicity.
  ]);
  const ok1 = result1.filter(r => "Ok" in r);
  const err1 = result1.filter(r => "Err" in r);
  t.is(ok1.length, 1);
  t.is(err1.length, 4);
  t.deepEqual(ok1[0], {Ok: BigInt(1)});
  t.deepEqual(err1[0], {Err: {BlockUsed: null}});
  t.deepEqual(err1[1], {Err: {BlockUsed: null}});
  t.deepEqual(err1[2], {Err: {BlockUsed: null}});
  t.deepEqual(err1[3], {Err: {BlockUsed: null}});
  t.deepEqual(await aliceWicpActor.mint([], BigInt(4)), {Err: {BlockUsed: null}});

  // bob mint
  const result2 = await Promise.all([
    bobWicpActor.mint([], BigInt(5)), // attempt to break atomicity.
    bobWicpActor.mint([], BigInt(5)), // attempt to break atomicity.
    bobWicpActor.mint([], BigInt(5)), // attempt to break atomicity.
    bobWicpActor.mint([], BigInt(5)), // attempt to break atomicity.
    bobWicpActor.mint([], BigInt(5)) // attempt to break atomicity.
  ]);
  const ok2 = result2.filter(r => "Ok" in r);
  const err2 = result2.filter(r => "Err" in r);
  t.is(ok2.length, 1);
  t.is(err2.length, 4);
  t.deepEqual(ok2[0], {Ok: BigInt(2)});
  t.deepEqual(err2[0], {Err: {BlockUsed: null}});
  t.deepEqual(err2[1], {Err: {BlockUsed: null}});
  t.deepEqual(err2[2], {Err: {BlockUsed: null}});
  t.deepEqual(err2[3], {Err: {BlockUsed: null}});
  t.deepEqual(await bobWicpActor.mint([], BigInt(5)), {Err: {BlockUsed: null}});
});

test.serial("verify users balance after `mint`.", async t => {
  (await Promise.all(allActors.map(actor => actor.balanceOf(aliceIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(50_000_000_000))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(bobIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(20_000_000_000))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(johnIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(0))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(custodianIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(0))
  );
});

test.serial("verify WICP stats after `mint`.", async t => {
  const result = await custodianWicpActor.stats();
  t.truthy(result.cycles);
  t.is(result.icps, BigInt(70_000_000_000));
  t.is(result.total_supply, BigInt(70_000_000_000));
  t.is(result.total_transactions, BigInt(2));
  t.is(result.total_unique_holders, BigInt(2));
  t.truthy(await custodianWicpActor.cycles());
  t.is(await custodianWicpActor.icps(), BigInt(70_000_000_000));
  t.is(await custodianWicpActor.totalSupply(), BigInt(70_000_000_000));
  t.is(await custodianWicpActor.totalTransactions(), BigInt(2));
  t.is(await custodianWicpActor.totalUniqueHolders(), BigInt(2));
});

test.serial("error on query non-exist transactions.", async t => {
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(0))))).forEach(result =>
    t.deepEqual(result, {Err: {TxNotFound: null}})
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(3))))).forEach(result =>
    t.deepEqual(result, {Err: {TxNotFound: null}})
  );
});

test.serial("verify transactions after `mint`.", async t => {
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(1))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "mint",
        details: [
          ["to", {Principal: aliceIdentity.getPrincipal()}],
          ["block_height", {Nat64Content: BigInt(4)}],
          ["account_id", {TextContent: aliceAccountId.toHex()}],
          ["amount", {NatContent: BigInt(50_000_000_000)}]
        ],
        caller: aliceIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(2))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "mint",
        details: [
          ["to", {Principal: bobIdentity.getPrincipal()}],
          ["block_height", {Nat64Content: BigInt(5)}],
          ["account_id", {TextContent: bobAccountId.toHex()}],
          ["amount", {NatContent: BigInt(20_000_000_000)}]
        ],
        caller: bobIdentity.getPrincipal()
      }
    })
  );
});

test.serial("should mark block as used after `mint`.", async t => {
  (await Promise.all(allActors.map(actor => actor.isBlockUsed(BigInt(4))))).forEach(result => t.is(result, true));
  (await Promise.all(allActors.map(actor => actor.isBlockUsed(BigInt(5))))).forEach(result => t.is(result, true));
});

test.serial("error on `approve` when owner have insufficient balance WICP.", async t => {
  t.falsy(await custodianWicpActor.setFee(BigInt(10_000)));
  t.deepEqual(await custodianWicpActor.approve(custodianIdentity.getPrincipal(), BigInt(1)), {
    Err: {InsufficientBalance: null}
  });
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
});

test.serial("`approve` WICP with fee.", async t => {
  t.falsy(await custodianWicpActor.setFee(BigInt(10_000)));
  t.falsy(await custodianWicpActor.setFeeTo(custodianIdentity.getPrincipal()));
  t.deepEqual(await aliceWicpActor.approve(custodianIdentity.getPrincipal(), BigInt(100_000_000)), {Ok: BigInt(3)});
  t.deepEqual(await aliceWicpActor.approve(custodianIdentity.getPrincipal(), BigInt(0)), {Ok: BigInt(4)});
  t.deepEqual(await bobWicpActor.approve(custodianIdentity.getPrincipal(), BigInt(500_000_000)), {Ok: BigInt(5)});
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
});

test.serial("verify stats after `approve` with fee.", async t => {
  const result = await custodianWicpActor.stats();
  t.truthy(result.cycles);
  t.is(result.icps, BigInt(70_000_000_000));
  t.is(result.total_supply, BigInt(70_000_000_000));
  t.is(result.total_transactions, BigInt(5));
  t.is(result.total_unique_holders, BigInt(3));
  t.truthy(await custodianWicpActor.cycles());
  t.is(await custodianWicpActor.icps(), BigInt(70_000_000_000));
  t.is(await custodianWicpActor.totalSupply(), BigInt(70_000_000_000));
  t.is(await custodianWicpActor.totalTransactions(), BigInt(5));
  t.is(await custodianWicpActor.totalUniqueHolders(), BigInt(3));
});

test.serial("verify users balance after `approve` with fee.", async t => {
  (await Promise.all(allActors.map(actor => actor.balanceOf(aliceIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(49_999_980_000))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(bobIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(19_999_990_000))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(johnIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(0))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(custodianIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(30_000))
  );
});

test.serial("verify users allowance after `approve` with fee.", async t => {
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(aliceIdentity.getPrincipal(), aliceIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(aliceIdentity.getPrincipal(), bobIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(aliceIdentity.getPrincipal(), johnIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(aliceIdentity.getPrincipal(), custodianIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));

  (
    await Promise.all(allActors.map(actor => actor.allowance(bobIdentity.getPrincipal(), aliceIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(bobIdentity.getPrincipal(), bobIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(bobIdentity.getPrincipal(), johnIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(bobIdentity.getPrincipal(), custodianIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(500_010_000)));

  (
    await Promise.all(
      allActors.map(actor => actor.allowance(johnIdentity.getPrincipal(), aliceIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(johnIdentity.getPrincipal(), bobIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(johnIdentity.getPrincipal(), johnIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(johnIdentity.getPrincipal(), custodianIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));

  (
    await Promise.all(
      allActors.map(actor => actor.allowance(custodianIdentity.getPrincipal(), aliceIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(custodianIdentity.getPrincipal(), bobIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(custodianIdentity.getPrincipal(), johnIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(custodianIdentity.getPrincipal(), custodianIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
});

test.serial("verify transactions after `approve` with fee.", async t => {
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(3))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "approve",
        details: [
          ["owner", {Principal: aliceIdentity.getPrincipal()}],
          ["spender", {Principal: custodianIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(100_010_000)}],
          ["fee", {NatContent: BigInt(10_000)}]
        ],
        caller: aliceIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(4))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "approve",
        details: [
          ["owner", {Principal: aliceIdentity.getPrincipal()}],
          ["spender", {Principal: custodianIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(10_000)}],
          ["fee", {NatContent: BigInt(10_000)}]
        ],
        caller: aliceIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(5))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "approve",
        details: [
          ["owner", {Principal: bobIdentity.getPrincipal()}],
          ["spender", {Principal: custodianIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(500_010_000)}],
          ["fee", {NatContent: BigInt(10_000)}]
        ],
        caller: bobIdentity.getPrincipal()
      }
    })
  );
});

test.serial("`approve` WICP with zero fee.", async t => {
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
  t.falsy(await custodianWicpActor.setFeeTo(custodianIdentity.getPrincipal()));
  t.deepEqual(await aliceWicpActor.approve(custodianIdentity.getPrincipal(), BigInt(200_000_000)), {Ok: BigInt(6)});
  t.deepEqual(await aliceWicpActor.approve(custodianIdentity.getPrincipal(), BigInt(0)), {Ok: BigInt(7)});
  t.deepEqual(await bobWicpActor.approve(custodianIdentity.getPrincipal(), BigInt(600_000_000)), {Ok: BigInt(8)});
  t.deepEqual(await johnWicpActor.approve(custodianIdentity.getPrincipal(), BigInt(100_000_000)), {Ok: BigInt(9)});
});

test.serial("verify stats after `approve` with zero fee.", async t => {
  const result = await custodianWicpActor.stats();
  t.truthy(result.cycles);
  t.is(result.icps, BigInt(70_000_000_000));
  t.is(result.total_supply, BigInt(70_000_000_000));
  t.is(result.total_transactions, BigInt(9));
  t.is(result.total_unique_holders, BigInt(3));
  t.truthy(await custodianWicpActor.cycles());
  t.is(await custodianWicpActor.icps(), BigInt(70_000_000_000));
  t.is(await custodianWicpActor.totalSupply(), BigInt(70_000_000_000));
  t.is(await custodianWicpActor.totalTransactions(), BigInt(9));
  t.is(await custodianWicpActor.totalUniqueHolders(), BigInt(3));
});

test.serial("verify users balance after `approve` with zero fee.", async t => {
  t.deepEqual(
    await Promise.all([
      ...allActors.map(actor => actor.balanceOf(aliceIdentity.getPrincipal())),
      ...allActors.map(actor => actor.balanceOf(bobIdentity.getPrincipal())),
      ...allActors.map(actor => actor.balanceOf(johnIdentity.getPrincipal())),
      ...allActors.map(actor => actor.balanceOf(custodianIdentity.getPrincipal()))
    ]),
    [
      BigInt(49_999_980_000),
      BigInt(49_999_980_000),
      BigInt(49_999_980_000),
      BigInt(49_999_980_000),
      BigInt(19_999_990_000),
      BigInt(19_999_990_000),
      BigInt(19_999_990_000),
      BigInt(19_999_990_000),
      BigInt(0),
      BigInt(0),
      BigInt(0),
      BigInt(0),
      BigInt(30_000),
      BigInt(30_000),
      BigInt(30_000),
      BigInt(30_000)
    ]
  );
});

test.serial("verify users allowance after `approve` with zero fee.", async t => {
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(aliceIdentity.getPrincipal(), aliceIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(aliceIdentity.getPrincipal(), bobIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(aliceIdentity.getPrincipal(), johnIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(aliceIdentity.getPrincipal(), custodianIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));

  (
    await Promise.all(allActors.map(actor => actor.allowance(bobIdentity.getPrincipal(), aliceIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(bobIdentity.getPrincipal(), bobIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(bobIdentity.getPrincipal(), johnIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(bobIdentity.getPrincipal(), custodianIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(600_000_000)));

  (
    await Promise.all(
      allActors.map(actor => actor.allowance(johnIdentity.getPrincipal(), aliceIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(johnIdentity.getPrincipal(), bobIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(johnIdentity.getPrincipal(), johnIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(johnIdentity.getPrincipal(), custodianIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(100_000_000)));

  (
    await Promise.all(
      allActors.map(actor => actor.allowance(custodianIdentity.getPrincipal(), aliceIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(custodianIdentity.getPrincipal(), bobIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(custodianIdentity.getPrincipal(), johnIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(custodianIdentity.getPrincipal(), custodianIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
});

test.serial("verify transactions after `approve` with zero fee.", async t => {
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(6))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "approve",
        details: [
          ["owner", {Principal: aliceIdentity.getPrincipal()}],
          ["spender", {Principal: custodianIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(200_000_000)}],
          ["fee", {NatContent: BigInt(0)}]
        ],
        caller: aliceIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(7))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "approve",
        details: [
          ["owner", {Principal: aliceIdentity.getPrincipal()}],
          ["spender", {Principal: custodianIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(0)}],
          ["fee", {NatContent: BigInt(0)}]
        ],
        caller: aliceIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(8))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "approve",
        details: [
          ["owner", {Principal: bobIdentity.getPrincipal()}],
          ["spender", {Principal: custodianIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(600_000_000)}],
          ["fee", {NatContent: BigInt(0)}]
        ],
        caller: bobIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(9))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "approve",
        details: [
          ["owner", {Principal: johnIdentity.getPrincipal()}],
          ["spender", {Principal: custodianIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(100_000_000)}],
          ["fee", {NatContent: BigInt(0)}]
        ],
        caller: johnIdentity.getPrincipal()
      }
    })
  );
});

test.serial("error on `transferFrom` with fee when spender have insufficient allowance WICP.", async t => {
  t.falsy(await custodianWicpActor.setFee(BigInt(1)));
  t.deepEqual(
    await custodianWicpActor.transferFrom(aliceIdentity.getPrincipal(), johnIdentity.getPrincipal(), BigInt(0)),
    {
      Err: {InsufficientAllowance: null}
    }
  );
  t.deepEqual(
    await custodianWicpActor.transferFrom(bobIdentity.getPrincipal(), johnIdentity.getPrincipal(), BigInt(600_000_000)),
    {
      Err: {InsufficientAllowance: null}
    }
  );
  t.deepEqual(
    await custodianWicpActor.transferFrom(
      johnIdentity.getPrincipal(),
      johnIdentity.getPrincipal(),
      BigInt(100_000_000)
    ),
    {
      Err: {InsufficientAllowance: null}
    }
  );
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
});

test.serial("error on `transferFrom` with zero fee when spender have insufficient allowance WICP.", async t => {
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
  t.deepEqual(
    await custodianWicpActor.transferFrom(aliceIdentity.getPrincipal(), johnIdentity.getPrincipal(), BigInt(1)),
    {
      Err: {InsufficientAllowance: null}
    }
  );
  t.deepEqual(
    await custodianWicpActor.transferFrom(bobIdentity.getPrincipal(), johnIdentity.getPrincipal(), BigInt(600_000_001)),
    {
      Err: {InsufficientAllowance: null}
    }
  );
  t.deepEqual(
    await custodianWicpActor.transferFrom(
      johnIdentity.getPrincipal(),
      johnIdentity.getPrincipal(),
      BigInt(100_000_001)
    ),
    {
      Err: {InsufficientAllowance: null}
    }
  );
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
});

test.serial("error on `transferFrom` with fee when owner have insufficient balance WICP.", async t => {
  t.falsy(await custodianWicpActor.setFee(BigInt(1)));
  t.deepEqual(
    await custodianWicpActor.transferFrom(johnIdentity.getPrincipal(), johnIdentity.getPrincipal(), BigInt(99_999_999)),
    {
      Err: {InsufficientBalance: null}
    }
  );
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
});

test.serial("error on `transferFrom` with zero fee when owner have insufficient balance WICP.", async t => {
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
  t.deepEqual(
    await custodianWicpActor.transferFrom(
      johnIdentity.getPrincipal(),
      johnIdentity.getPrincipal(),
      BigInt(100_000_000)
    ),
    {
      Err: {InsufficientBalance: null}
    }
  );
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
});

test.serial("`transferFrom` with fee.", async t => {
  t.falsy(await custodianWicpActor.setFee(BigInt(1)));
  t.deepEqual(
    await custodianWicpActor.transferFrom(bobIdentity.getPrincipal(), johnIdentity.getPrincipal(), BigInt(199_999_999)),
    {
      Ok: BigInt(10)
    }
  );
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
});

test.serial("verify stats after `transferFrom` with fee.", async t => {
  const result = await custodianWicpActor.stats();
  t.truthy(result.cycles);
  t.is(result.icps, BigInt(70_000_000_000));
  t.is(result.total_supply, BigInt(70_000_000_000));
  t.is(result.total_transactions, BigInt(10));
  t.is(result.total_unique_holders, BigInt(4));
  t.truthy(await custodianWicpActor.cycles());
  t.is(await custodianWicpActor.icps(), BigInt(70_000_000_000));
  t.is(await custodianWicpActor.totalSupply(), BigInt(70_000_000_000));
  t.is(await custodianWicpActor.totalTransactions(), BigInt(10));
  t.is(await custodianWicpActor.totalUniqueHolders(), BigInt(4));
});

test.serial("verify users balance after `transferFrom` with fee.", async t => {
  (await Promise.all(allActors.map(actor => actor.balanceOf(aliceIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(49_999_980_000))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(bobIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(19_799_990_000))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(johnIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(199_999_999))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(custodianIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(30_001))
  );
});

test.serial("verify users allowance after `transferFrom` with fee.", async t => {
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(aliceIdentity.getPrincipal(), aliceIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(aliceIdentity.getPrincipal(), bobIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(aliceIdentity.getPrincipal(), johnIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(aliceIdentity.getPrincipal(), custodianIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));

  (
    await Promise.all(allActors.map(actor => actor.allowance(bobIdentity.getPrincipal(), aliceIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(bobIdentity.getPrincipal(), bobIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(bobIdentity.getPrincipal(), johnIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(bobIdentity.getPrincipal(), custodianIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(400_000_000)));

  (
    await Promise.all(
      allActors.map(actor => actor.allowance(johnIdentity.getPrincipal(), aliceIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(johnIdentity.getPrincipal(), bobIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(johnIdentity.getPrincipal(), johnIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(johnIdentity.getPrincipal(), custodianIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(100_000_000)));

  (
    await Promise.all(
      allActors.map(actor => actor.allowance(custodianIdentity.getPrincipal(), aliceIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(custodianIdentity.getPrincipal(), bobIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(custodianIdentity.getPrincipal(), johnIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(custodianIdentity.getPrincipal(), custodianIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
});

test.serial("verify transactions after `transferFrom` with fee.", async t => {
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(10))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "transferFrom",
        details: [
          ["from", {Principal: bobIdentity.getPrincipal()}],
          ["to", {Principal: johnIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(199_999_999)}],
          ["fee", {NatContent: BigInt(1)}]
        ],
        caller: custodianIdentity.getPrincipal()
      }
    })
  );
});

test.serial("`transferFrom` with zero fee.", async t => {
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
  t.deepEqual(
    await custodianWicpActor.transferFrom(bobIdentity.getPrincipal(), johnIdentity.getPrincipal(), BigInt(400_000_000)),
    {
      Ok: BigInt(11)
    }
  );
  // NOTE: recommended to have fee
  t.deepEqual(
    await custodianWicpActor.transferFrom(aliceIdentity.getPrincipal(), aliceIdentity.getPrincipal(), BigInt(0)),
    {
      Ok: BigInt(12)
    }
  );
  t.deepEqual(
    await custodianWicpActor.transferFrom(bobIdentity.getPrincipal(), bobIdentity.getPrincipal(), BigInt(0)),
    {
      Ok: BigInt(13)
    }
  );
  t.deepEqual(
    await custodianWicpActor.transferFrom(johnIdentity.getPrincipal(), johnIdentity.getPrincipal(), BigInt(0)),
    {
      Ok: BigInt(14)
    }
  );
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
});

test.serial("verify stats after `transferFrom` with zero fee.", async t => {
  const result = await custodianWicpActor.stats();
  t.truthy(result.cycles);
  t.is(result.icps, BigInt(70_000_000_000));
  t.is(result.total_supply, BigInt(70_000_000_000));
  t.is(result.total_transactions, BigInt(14));
  t.is(result.total_unique_holders, BigInt(4));
  t.truthy(await custodianWicpActor.cycles());
  t.is(await custodianWicpActor.icps(), BigInt(70_000_000_000));
  t.is(await custodianWicpActor.totalSupply(), BigInt(70_000_000_000));
  t.is(await custodianWicpActor.totalTransactions(), BigInt(14));
  t.is(await custodianWicpActor.totalUniqueHolders(), BigInt(4));
});

test.serial("verify users balance after `transferFrom` with zero fee.", async t => {
  (await Promise.all(allActors.map(actor => actor.balanceOf(aliceIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(49_999_980_000))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(bobIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(19_399_990_000))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(johnIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(599_999_999))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(custodianIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(30_001))
  );
});

test.serial("verify users allowance after `transferFrom` with zero fee.", async t => {
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(aliceIdentity.getPrincipal(), aliceIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(aliceIdentity.getPrincipal(), bobIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(aliceIdentity.getPrincipal(), johnIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(aliceIdentity.getPrincipal(), custodianIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));

  (
    await Promise.all(allActors.map(actor => actor.allowance(bobIdentity.getPrincipal(), aliceIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(bobIdentity.getPrincipal(), bobIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(bobIdentity.getPrincipal(), johnIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(bobIdentity.getPrincipal(), custodianIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));

  (
    await Promise.all(
      allActors.map(actor => actor.allowance(johnIdentity.getPrincipal(), aliceIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(johnIdentity.getPrincipal(), bobIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(allActors.map(actor => actor.allowance(johnIdentity.getPrincipal(), johnIdentity.getPrincipal())))
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(johnIdentity.getPrincipal(), custodianIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(100_000_000)));

  (
    await Promise.all(
      allActors.map(actor => actor.allowance(custodianIdentity.getPrincipal(), aliceIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(custodianIdentity.getPrincipal(), bobIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(custodianIdentity.getPrincipal(), johnIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
  (
    await Promise.all(
      allActors.map(actor => actor.allowance(custodianIdentity.getPrincipal(), custodianIdentity.getPrincipal()))
    )
  ).forEach(result => t.is(result, BigInt(0)));
});

test.serial("verify transactions after `transferFrom` with zero fee.", async t => {
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(11))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "transferFrom",
        details: [
          ["from", {Principal: bobIdentity.getPrincipal()}],
          ["to", {Principal: johnIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(400_000_000)}],
          ["fee", {NatContent: BigInt(0)}]
        ],
        caller: custodianIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(12))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "transferFrom",
        details: [
          ["from", {Principal: aliceIdentity.getPrincipal()}],
          ["to", {Principal: aliceIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(0)}],
          ["fee", {NatContent: BigInt(0)}]
        ],
        caller: custodianIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(13))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "transferFrom",
        details: [
          ["from", {Principal: bobIdentity.getPrincipal()}],
          ["to", {Principal: bobIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(0)}],
          ["fee", {NatContent: BigInt(0)}]
        ],
        caller: custodianIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(14))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "transferFrom",
        details: [
          ["from", {Principal: johnIdentity.getPrincipal()}],
          ["to", {Principal: johnIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(0)}],
          ["fee", {NatContent: BigInt(0)}]
        ],
        caller: custodianIdentity.getPrincipal()
      }
    })
  );
});

test.serial("error on `transfer` with fee when owner have insufficient balance WICP.", async t => {
  t.falsy(await custodianWicpActor.setFee(BigInt(1)));
  t.deepEqual(await aliceWicpActor.transfer(aliceIdentity.getPrincipal(), BigInt(49_999_980_000)), {
    Err: {InsufficientBalance: null}
  });
  t.deepEqual(await bobWicpActor.transfer(bobIdentity.getPrincipal(), BigInt(19_399_990_000)), {
    Err: {InsufficientBalance: null}
  });
  t.deepEqual(await johnWicpActor.transfer(johnIdentity.getPrincipal(), BigInt(599_999_999)), {
    Err: {InsufficientBalance: null}
  });
  t.deepEqual(await custodianWicpActor.transfer(custodianIdentity.getPrincipal(), BigInt(30_001)), {
    Err: {InsufficientBalance: null}
  });
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
});

test.serial("error on `transfer` with zero fee when owner have insufficient balance WICP.", async t => {
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
  t.deepEqual(await aliceWicpActor.transfer(aliceIdentity.getPrincipal(), BigInt(49_999_980_001)), {
    Err: {InsufficientBalance: null}
  });
  t.deepEqual(await bobWicpActor.transfer(bobIdentity.getPrincipal(), BigInt(19_399_990_001)), {
    Err: {InsufficientBalance: null}
  });
  t.deepEqual(await johnWicpActor.transfer(johnIdentity.getPrincipal(), BigInt(600_000_000)), {
    Err: {InsufficientBalance: null}
  });
  t.deepEqual(await custodianWicpActor.transfer(custodianIdentity.getPrincipal(), BigInt(30_002)), {
    Err: {InsufficientBalance: null}
  });
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
});

test.serial("`transfer` WICP with fee.", async t => {
  t.falsy(await custodianWicpActor.setFee(BigInt(1)));
  t.deepEqual(await aliceWicpActor.transfer(custodianIdentity.getPrincipal(), BigInt(49_699_979_999)), {
    Ok: BigInt(15)
  });
  t.deepEqual(await bobWicpActor.transfer(custodianIdentity.getPrincipal(), BigInt(19_199_989_999)), {
    Ok: BigInt(16)
  });
  t.deepEqual(await johnWicpActor.transfer(custodianIdentity.getPrincipal(), BigInt(499_999_998)), {
    Ok: BigInt(17)
  });
  t.deepEqual(await custodianWicpActor.transfer(custodianIdentity.getPrincipal(), BigInt(0)), {
    Ok: BigInt(18)
  });
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
});

test.serial("verify stats after `transfer` with fee.", async t => {
  const result = await custodianWicpActor.stats();
  t.truthy(result.cycles);
  t.is(result.icps, BigInt(70_000_000_000));
  t.is(result.total_supply, BigInt(70_000_000_000));
  t.is(result.total_transactions, BigInt(18));
  t.is(result.total_unique_holders, BigInt(4));
  t.truthy(await custodianWicpActor.cycles());
  t.is(await custodianWicpActor.icps(), BigInt(70_000_000_000));
  t.is(await custodianWicpActor.totalSupply(), BigInt(70_000_000_000));
  t.is(await custodianWicpActor.totalTransactions(), BigInt(18));
  t.is(await custodianWicpActor.totalUniqueHolders(), BigInt(4));
});

test.serial("verify users balance after `transfer` with fee.", async t => {
  (await Promise.all(allActors.map(actor => actor.balanceOf(aliceIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(300_000_000))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(bobIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(200_000_000))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(johnIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(100_000_000))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(custodianIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(69_400_000_000))
  );
});

test.serial("verify transactions after `transfer` with fee.", async t => {
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(15))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "transfer",
        details: [
          ["from", {Principal: aliceIdentity.getPrincipal()}],
          ["to", {Principal: custodianIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(49_699_979_999)}],
          ["fee", {NatContent: BigInt(1)}]
        ],
        caller: aliceIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(16))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "transfer",
        details: [
          ["from", {Principal: bobIdentity.getPrincipal()}],
          ["to", {Principal: custodianIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(19_199_989_999)}],
          ["fee", {NatContent: BigInt(1)}]
        ],
        caller: bobIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(17))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "transfer",
        details: [
          ["from", {Principal: johnIdentity.getPrincipal()}],
          ["to", {Principal: custodianIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(499_999_998)}],
          ["fee", {NatContent: BigInt(1)}]
        ],
        caller: johnIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(18))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "transfer",
        details: [
          ["from", {Principal: custodianIdentity.getPrincipal()}],
          ["to", {Principal: custodianIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(0)}],
          ["fee", {NatContent: BigInt(1)}]
        ],
        caller: custodianIdentity.getPrincipal()
      }
    })
  );
});

test.serial("`transfer` WICP with zero fee.", async t => {
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
  t.deepEqual(await aliceWicpActor.transfer(custodianIdentity.getPrincipal(), BigInt(100_000_000)), {
    Ok: BigInt(19)
  });
  t.deepEqual(await bobWicpActor.transfer(custodianIdentity.getPrincipal(), BigInt(100_000_000)), {
    Ok: BigInt(20)
  });
  t.deepEqual(await johnWicpActor.transfer(custodianIdentity.getPrincipal(), BigInt(100_000_000)), {
    Ok: BigInt(21)
  });
  t.deepEqual(await custodianWicpActor.transfer(custodianIdentity.getPrincipal(), BigInt(100_000_000)), {
    Ok: BigInt(22)
  });
  t.falsy(await custodianWicpActor.setFee(BigInt(0)));
});

test.serial("verify stats after `transfer` with zero fee.", async t => {
  const result = await custodianWicpActor.stats();
  t.truthy(result.cycles);
  t.is(result.icps, BigInt(70_000_000_000));
  t.is(result.total_supply, BigInt(70_000_000_000));
  t.is(result.total_transactions, BigInt(22));
  t.is(result.total_unique_holders, BigInt(3));
  t.truthy(await custodianWicpActor.cycles());
  t.is(await custodianWicpActor.icps(), BigInt(70_000_000_000));
  t.is(await custodianWicpActor.totalSupply(), BigInt(70_000_000_000));
  t.is(await custodianWicpActor.totalTransactions(), BigInt(22));
  t.is(await custodianWicpActor.totalUniqueHolders(), BigInt(3));
});

test.serial("verify users balance after `transfer` with zero fee.", async t => {
  (await Promise.all(allActors.map(actor => actor.balanceOf(aliceIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(200_000_000))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(bobIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(100_000_000))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(johnIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(0))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(custodianIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(69_700_000_000))
  );
});

test.serial("verify transactions after `transfer` with zero fee.", async t => {
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(19))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "transfer",
        details: [
          ["from", {Principal: aliceIdentity.getPrincipal()}],
          ["to", {Principal: custodianIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(100_000_000)}],
          ["fee", {NatContent: BigInt(0)}]
        ],
        caller: aliceIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(20))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "transfer",
        details: [
          ["from", {Principal: bobIdentity.getPrincipal()}],
          ["to", {Principal: custodianIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(100_000_000)}],
          ["fee", {NatContent: BigInt(0)}]
        ],
        caller: bobIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(21))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "transfer",
        details: [
          ["from", {Principal: johnIdentity.getPrincipal()}],
          ["to", {Principal: custodianIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(100_000_000)}],
          ["fee", {NatContent: BigInt(0)}]
        ],
        caller: johnIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(22))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "transfer",
        details: [
          ["from", {Principal: custodianIdentity.getPrincipal()}],
          ["to", {Principal: custodianIdentity.getPrincipal()}],
          ["amount", {NatContent: BigInt(100_000_000)}],
          ["fee", {NatContent: BigInt(0)}]
        ],
        caller: custodianIdentity.getPrincipal()
      }
    })
  );
});

test.serial("error on `withdraw` with amount exceed u64 range.", async t => {
  t.deepEqual(await aliceWicpActor.withdraw(BigInt("0xffffffffffffffffffff"), aliceAccountId.toHex()), {
    Err: {Other: "failed to cast usize from nat"}
  });
});

test.serial("error on `withdraw` with invalid e8s amount.", async t => {
  t.deepEqual(await johnWicpActor.withdraw(BigInt(0), johnAccountId.toHex()), {
    Err: {InvalidE8sAmount: null}
  });
});

test.serial("error on `withdraw` with invalid account id.", async t => {
  t.deepEqual(await aliceWicpActor.withdraw(BigInt(10_000), `${aliceAccountId.toHex()}asdfasfjdklfjsf"`), {
    Err: {InvalidAccountId: null}
  });
});

test.serial("error on `withdraw` when owner have insufficient balance WICP.", async t => {
  t.deepEqual(await aliceWicpActor.withdraw(BigInt(200_000_001), aliceAccountId.toHex()), {
    Err: {InsufficientBalance: null}
  });
  t.deepEqual(await bobWicpActor.withdraw(BigInt(100_000_001), bobAccountId.toHex()), {
    Err: {InsufficientBalance: null}
  });
  t.deepEqual(await johnWicpActor.withdraw(BigInt(1), johnAccountId.toHex()), {
    Err: {InsufficientBalance: null}
  });
  t.deepEqual(await custodianWicpActor.withdraw(BigInt(69_700_000_001), custodianAccountId.toHex()), {
    Err: {InsufficientBalance: null}
  });
});

test.serial("withdraw WICP.", async t => {
  t.deepEqual(await aliceWicpActor.withdraw(BigInt(200_000_000), aliceAccountId.toHex()), {
    Ok: BigInt(23)
  });
  t.deepEqual(await bobWicpActor.withdraw(BigInt(100_000_000), bobAccountId.toHex()), {
    Ok: BigInt(24)
  });
  t.deepEqual(await custodianWicpActor.withdraw(BigInt(69_700_000_000), custodianAccountId.toHex()), {
    Ok: BigInt(25)
  });
});

test.serial("verify stats after `withdraw`.", async t => {
  const result = await custodianWicpActor.stats();
  t.truthy(result.cycles);
  t.is(result.icps, BigInt(0));
  t.is(result.total_supply, BigInt(0));
  t.is(result.total_transactions, BigInt(25));
  t.is(result.total_unique_holders, BigInt(0));
  t.truthy(await custodianWicpActor.cycles());
  t.is(await custodianWicpActor.icps(), BigInt(0));
  t.is(await custodianWicpActor.totalSupply(), BigInt(0));
  t.is(await custodianWicpActor.totalTransactions(), BigInt(25));
  t.is(await custodianWicpActor.totalUniqueHolders(), BigInt(0));
});

test.serial("verify users balance after `withdraw`.", async t => {
  (await Promise.all(allActors.map(actor => actor.balanceOf(aliceIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(0))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(bobIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(0))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(johnIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(0))
  );
  (await Promise.all(allActors.map(actor => actor.balanceOf(custodianIdentity.getPrincipal())))).forEach(result =>
    t.is(result, BigInt(0))
  );
});

test.serial("verify transactions after `withdraw`.", async t => {
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(23))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "withdraw",
        details: [
          ["from", {Principal: aliceIdentity.getPrincipal()}],
          ["to", {TextContent: aliceAccountId.toHex()}],
          ["amount", {NatContent: BigInt(200_000_000)}],
          ["block_height", {Nat64Content: BigInt(8)}]
        ],
        caller: aliceIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(24))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "withdraw",
        details: [
          ["from", {Principal: bobIdentity.getPrincipal()}],
          ["to", {TextContent: bobAccountId.toHex()}],
          ["amount", {NatContent: BigInt(100_000_000)}],
          ["block_height", {Nat64Content: BigInt(9)}]
        ],
        caller: bobIdentity.getPrincipal()
      }
    })
  );
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(25))))).forEach(result =>
    t.like(result, {
      Ok: {
        operation: "withdraw",
        details: [
          ["from", {Principal: custodianIdentity.getPrincipal()}],
          ["to", {TextContent: custodianAccountId.toHex()}],
          ["amount", {NatContent: BigInt(69_700_000_000)}],
          ["block_height", {Nat64Content: BigInt(10)}]
        ],
        caller: custodianIdentity.getPrincipal()
      }
    })
  );
});
