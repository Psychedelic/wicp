import {
  aliceIdentity,
  aliceWicpActor,
  bobWicpActor,
  custodianIdentity,
  custodianWicpActor,
  johnWicpActor
} from "../setup";
import test, {Assertions} from "ava";
import {Principal} from "@dfinity/principal";

const normalActors = [aliceWicpActor, bobWicpActor, johnWicpActor];
const allActors = [...normalActors, custodianWicpActor];
const cap = Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai"); // just an example

const testName = async (t: Assertions) => {
  (await Promise.all(allActors.map(actor => actor.name()))).forEach(result => t.deepEqual(result, []));
  await t.notThrowsAsync(custodianWicpActor.setName("wicp"));
  (await Promise.all(allActors.map(actor => actor.name()))).forEach(result => t.deepEqual(result, ["wicp"]));
};

const testLogo = async (t: Assertions) => {
  (await Promise.all(allActors.map(actor => actor.logo()))).forEach(result => t.deepEqual(result, []));
  await t.notThrowsAsync(custodianWicpActor.setLogo("wicpLogo"));
  (await Promise.all(allActors.map(actor => actor.logo()))).forEach(result => t.deepEqual(result, ["wicpLogo"]));
};

const testSymbol = async (t: Assertions) => {
  (await Promise.all(allActors.map(actor => actor.symbol()))).forEach(result => t.deepEqual(result, []));
  await t.notThrowsAsync(custodianWicpActor.setSymbol("wicpSymbol"));
  (await Promise.all(allActors.map(actor => actor.symbol()))).forEach(result => t.deepEqual(result, ["wicpSymbol"]));
};

const testDecimals = async (t: Assertions) => {
  (await Promise.all(allActors.map(actor => actor.decimals()))).forEach(result => t.deepEqual(result, []));
  await t.notThrowsAsync(custodianWicpActor.setDecimals(99));
  (await Promise.all(allActors.map(actor => actor.decimals()))).forEach(result => t.deepEqual(result, [99]));
};

const testFee = async (t: Assertions) => {
  (await Promise.all(allActors.map(actor => actor.fee()))).forEach(result => t.deepEqual(result, []));
  await t.notThrowsAsync(custodianWicpActor.setFee(BigInt(1_000_000)));
  (await Promise.all(allActors.map(actor => actor.fee()))).forEach(result => t.deepEqual(result, [BigInt(1_000_000)]));
};

const testFeeTo = async (t: Assertions) => {
  (await Promise.all(allActors.map(actor => actor.feeTo()))).forEach(result => t.deepEqual(result, []));
  await t.notThrowsAsync(custodianWicpActor.setFeeTo(aliceIdentity.getPrincipal()));
  (await Promise.all(allActors.map(actor => actor.feeTo()))).forEach(result =>
    t.deepEqual(result, [aliceIdentity.getPrincipal()])
  );
};

const testCap = async (t: Assertions) => {
  (await Promise.all(allActors.map(actor => actor.cap()))).forEach(result => t.deepEqual(result, []));
  await t.notThrowsAsync(custodianWicpActor.setCap(cap));
  (await Promise.all(allActors.map(actor => actor.cap()))).forEach(result => t.deepEqual(result, [cap]));
};

const testCustodians = async (t: Assertions) => {
  (await Promise.all(allActors.map(actor => actor.custodians()))).forEach(result =>
    t.is(result.filter(custodians => custodians.toText() === custodianIdentity.getPrincipal().toText()).length, 1)
  );
  await t.notThrowsAsync(
    custodianWicpActor.setCustodians([custodianIdentity.getPrincipal(), custodianIdentity.getPrincipal()])
  );
  (await Promise.all(allActors.map(actor => actor.custodians()))).forEach(result =>
    t.deepEqual(result, [custodianIdentity.getPrincipal()])
  );
};

test("simple CRUD metadata.", async t => {
  await Promise.all([
    testName(t),
    testLogo(t),
    testSymbol(t),
    testDecimals(t),
    testFee(t),
    testFeeTo(t),
    testCustodians(t),
    testCap(t)
  ]);
  (await Promise.all(allActors.map(actor => actor.metadata()))).forEach(result => {
    t.deepEqual(result.name, ["wicp"]);
    t.deepEqual(result.logo, ["wicpLogo"]);
    t.deepEqual(result.symbol, ["wicpSymbol"]);
    t.deepEqual(result.decimals, [99]);
    t.deepEqual(result.fee, [BigInt(1_000_000)]);
    t.deepEqual(result.fee_to, [aliceIdentity.getPrincipal()]);
    t.deepEqual(result.cap, [cap]);
    t.deepEqual(result.custodians, [custodianIdentity.getPrincipal()]);
    t.truthy(result.created_at);
    t.truthy(result.upgraded_at);
  });
});

test("error on unauthorized updating metadata.", async t => {
  // setName error when caller is not an custodian
  (await Promise.allSettled(normalActors.map(actor => actor.setName("wicp")))).forEach(promise =>
    t.is(promise.status, "rejected")
  );
  // setLogo error when caller is not an custodian
  (await Promise.allSettled(normalActors.map(actor => actor.setLogo("wicpLogo")))).forEach(promise =>
    t.is(promise.status, "rejected")
  );
  // setSymbol error when caller is not an custodian
  (await Promise.allSettled(normalActors.map(actor => actor.setSymbol("wicpSymbol")))).forEach(promise =>
    t.is(promise.status, "rejected")
  );
  // setCustodians error when caller is not an custodian
  (await Promise.allSettled(normalActors.map(actor => actor.setCustodians([])))).forEach(promise =>
    t.is(promise.status, "rejected")
  );
});
