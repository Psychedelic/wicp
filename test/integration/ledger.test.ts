import {
    aliceActor,
    aliceIdentity,
    bobActor,
    bobIdentity,
    custodianActor,
    custodianIdentity,
    johnActor,
    johnIdentity
} from "../setup";
import test from "ava";

const normalActors = [aliceActor, bobActor, johnActor];
const allActors = [...normalActors, custodianActor];

test.serial("simple mint NFT and verify information.", async t => {
    // mint
    t.deepEqual(
        await custodianActor.mint(aliceIdentity.getPrincipal(), BigInt(1), [["A", {Nat64Content: BigInt(9999)}]]),
        {Ok: BigInt(1)}
    );

    // verify transaction
    (await Promise.all(allActors.map(actor => actor.transaction(BigInt(1))))).forEach(result => {
        t.like(result, {
            Ok: {
                operation: "mint",
                caller: custodianIdentity.getPrincipal(),
                details: [
                    ["to", {Principal: aliceIdentity.getPrincipal()}],
                    ["token_identifier", {NatContent: BigInt(1)}]
                ]
            }
        });
    });
