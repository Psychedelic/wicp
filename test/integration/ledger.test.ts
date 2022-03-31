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

test.serial("transfer ICP success.", async t => {
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

test.serial("verify initial stats.", async t => {
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

test.serial("only custody can query stats.", async t => {
  (await Promise.allSettled(normalActors.map(actor => actor.stats()))).forEach(promise => {
    t.is(promise.status, "rejected");
  });
});

test.serial("verify initial balance.", async t => {
  (await Promise.all(allActors.map(actor => actor.balanceOf(ledgerIdentity.getPrincipal())))).forEach(result => {
    t.is(result, BigInt(0));
  });
  (await Promise.all(allActors.map(actor => actor.balanceOf(minterIdentity.getPrincipal())))).forEach(result => {
    t.is(result, BigInt(0));
  });
  (await Promise.all(allActors.map(actor => actor.balanceOf(aliceIdentity.getPrincipal())))).forEach(result => {
    t.is(result, BigInt(0));
  });
  (await Promise.all(allActors.map(actor => actor.balanceOf(bobIdentity.getPrincipal())))).forEach(result => {
    t.is(result, BigInt(0));
  });
  (await Promise.all(allActors.map(actor => actor.balanceOf(johnIdentity.getPrincipal())))).forEach(result => {
    t.is(result, BigInt(0));
  });
  (await Promise.all(allActors.map(actor => actor.balanceOf(custodianIdentity.getPrincipal())))).forEach(result => {
    t.is(result, BigInt(0));
  });
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

test.serial("error on `mint` unauthorize `from`.", async t => {
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

test.serial("error on `mint` unauthorize `to`.", async t => {
  (await Promise.all([aliceWicpActor.mint([], BigInt(6)), bobWicpActor.mint([], BigInt(7))])).forEach(result =>
    t.deepEqual(result, {Err: {ErrorTo: null}})
  );
});

test.serial("`mint` WICP.", async t => {
  // alice mint
  const result1 = await Promise.all([
    aliceWicpActor.mint([], BigInt(4)),
    aliceWicpActor.mint([], BigInt(4)),
    aliceWicpActor.mint([], BigInt(4)),
    aliceWicpActor.mint([], BigInt(4)),
    aliceWicpActor.mint([], BigInt(4))
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
    bobWicpActor.mint([], BigInt(5)),
    bobWicpActor.mint([], BigInt(5)),
    bobWicpActor.mint([], BigInt(5)),
    bobWicpActor.mint([], BigInt(5)),
    bobWicpActor.mint([], BigInt(5))
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

test.serial("verify WICP balance after `mint`.", async t => {
  (await Promise.all(allActors.map(actor => actor.balanceOf(aliceIdentity.getPrincipal())))).forEach(result => {
    t.is(result, BigInt(50_000_000_000));
  });
  (await Promise.all(allActors.map(actor => actor.balanceOf(bobIdentity.getPrincipal())))).forEach(result => {
    t.is(result, BigInt(20_000_000_000));
  });
  (await Promise.all(allActors.map(actor => actor.balanceOf(johnIdentity.getPrincipal())))).forEach(result => {
    t.is(result, BigInt(0));
  });
  (await Promise.all(allActors.map(actor => actor.balanceOf(custodianIdentity.getPrincipal())))).forEach(result => {
    t.is(result, BigInt(0));
  });
});

test.serial("verify stats after `mint`.", async t => {
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

test.serial("empty on query non-exist transactions.", async t => {
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(0))))).forEach(result => {
    t.deepEqual(result, {Err: {TxNotFound: null}});
  });
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(3))))).forEach(result => {
    t.deepEqual(result, {Err: {TxNotFound: null}});
  });
});

test.serial("verify transactions after `mint`.", async t => {
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(1))))).forEach(result => {
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
    });
  });
  (await Promise.all(allActors.map(actor => actor.transaction(BigInt(2))))).forEach(result => {
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
    });
  });
});

test.serial("should mark block as used after `mint`.", async t => {
  (await Promise.all(allActors.map(actor => actor.isBlockUsed(BigInt(4))))).forEach(result => {
    t.is(result, true);
  });
  (await Promise.all(allActors.map(actor => actor.isBlockUsed(BigInt(5))))).forEach(result => {
    t.is(result, true);
  });
});
