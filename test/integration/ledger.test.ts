import {
  aliceAccountId,
  aliceActor,
  bobAccountId,
  bobActor,
  custodianAccountId,
  custodianActor,
  johnAccountId,
  johnActor,
  ledgerAccountId,
  ledgerActor,
  minterAccountId
} from "../setup";
import test from "ava";

const normalActors = [aliceActor, bobActor, johnActor];
// const allActors = [...normalActors, custodianActor];

test.serial("transfer ICP success", async t => {
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

test.serial("verify initial stats", async t => {
  const result = await custodianActor.stats();
  t.truthy(result.cycles);
  t.is(result.icps, BigInt(0));
  t.is(result.total_supply, BigInt(0));
  t.is(result.total_transactions, BigInt(0));
  t.is(result.total_unique_holders, BigInt(0));
  t.truthy(await custodianActor.cycles());
  t.is(await custodianActor.icps(), BigInt(0));
  t.is(await custodianActor.totalSupply(), BigInt(0));
  t.is(await custodianActor.totalTransactions(), BigInt(0));
  t.is(await custodianActor.totalUniqueHolders(), BigInt(0));
});

test.serial("only custody can query stats", async t => {
  (await Promise.allSettled(normalActors.map(actor => actor.stats()))).forEach(promise => {
    t.is(promise.status, "rejected");
  });
});
