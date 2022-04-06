import {readFileSync} from "fs";

import {Actor, HttpAgent, Identity, Nonce, makeNonceTransform} from "@dfinity/agent";
import {Ed25519KeyIdentity} from "@dfinity/identity";
import {AccountIdentifier} from "@dfinity/nns";
import {Principal} from "@dfinity/principal";
import fetch from "isomorphic-fetch";

import {idlFactory as ledgerIdlFactory} from "./factory/ledger_idl";
import {_SERVICE as LedgerService} from "./factory/ledger_idl.d";
import {idlFactory as wicpIdlFactory} from "./factory/wicp_idl";
import {_SERVICE as WicpService} from "./factory/wicp_idl.d";

export const aliceIdentity = Ed25519KeyIdentity.generate();
export const bobIdentity = Ed25519KeyIdentity.generate();
export const johnIdentity = Ed25519KeyIdentity.generate();

// for testing only
// principal id = "xxzsj-nukpm-lgp77-ogouk-7u72u-qvpnj-ppjgn-o736o-z4ezi-jvegq-uae"
const custodianSecret = readFileSync("./custodian-test-secret", {encoding: "utf8"});
export const custodianIdentity = Ed25519KeyIdentity.fromSecretKey(Buffer.from(custodianSecret, "hex"));

// for testing only
// principal id = "lnviz-hi3hs-lzbuu-2z5wb-ormd3-jml4y-2ss2c-tytaw-e4xkv-pkugx-fae"
const ledgerSecret = readFileSync("./ledger-test-secret", {encoding: "utf8"});
export const ledgerIdentity = Ed25519KeyIdentity.fromSecretKey(Buffer.from(ledgerSecret, "hex"));

// for testing only
// principal id = "7b4qu-ongaw-i6zhb-3rp5d-4mes3-dpmkm-qqwon-nrsjy-zfcyh-4x5sw-pae"
const minterSecret = readFileSync("./minter-test-secret", {encoding: "utf8"});
export const minterIdentity = Ed25519KeyIdentity.fromSecretKey(Buffer.from(minterSecret, "hex"));

const canisterIds = JSON.parse(readFileSync("../canister_ids.json", {encoding: "utf8"}));

// TODO: migrate into v0.10.5
const makeNonce = () => {
  // Encode 128 bits.
  const buffer = new ArrayBuffer(16);
  const view = new DataView(buffer);
  const now = BigInt(+Date.now());
  const randHi = Math.floor(Math.random() * 0xffffffff);
  const randLo = Math.floor(Math.random() * 0xffffffff);
  view.setBigUint64(0, now);
  view.setUint32(8, randHi);
  view.setUint32(12, randLo);
  return buffer as Nonce;
};

const createActor = async (identity: Identity, type: string): Promise<WicpService | LedgerService> => {
  const agent = new HttpAgent({
    host: "http://127.0.0.1:8000",
    fetch,
    identity
  });

  // https://forum.dfinity.org/t/calling-a-counter-multiple-times-asynchronously-with-promise-all-gives-the-same-value-each-time/11618/4
  agent.addTransform(makeNonceTransform(makeNonce));

  let actor;
  switch (type) {
    case "wicp":
      actor = Actor.createActor<WicpService>(wicpIdlFactory, {
        canisterId: canisterIds[type].local as string,
        agent
      });
      break;
    case "ledger":
      actor = Actor.createActor<LedgerService>(ledgerIdlFactory, {
        canisterId: canisterIds[type].local as string,
        agent
      });
      break;
    default:
      throw new Error("Invalid type");
  }

  // Fetch root key for certificate validation during development
  await agent.fetchRootKey().catch(err => {
    console.error("Unable to fetch root key. Check to ensure that your local replica is running");
    throw err;
  });

  return actor;
};

export const aliceWicpActor = (await createActor(aliceIdentity, "wicp")) as WicpService;
export const bobWicpActor = (await createActor(bobIdentity, "wicp")) as WicpService;
export const johnWicpActor = (await createActor(johnIdentity, "wicp")) as WicpService;
export const custodianWicpActor = (await createActor(custodianIdentity, "wicp")) as WicpService;

export const ledgerActor = (await createActor(ledgerIdentity, "ledger")) as LedgerService;
export const minterActor = (await createActor(minterIdentity, "ledger")) as LedgerService;

export const aliceLedgerActor = (await createActor(aliceIdentity, "ledger")) as LedgerService;
export const bobLedgerActor = (await createActor(bobIdentity, "ledger")) as LedgerService;
export const johnLedgerActor = (await createActor(johnIdentity, "ledger")) as LedgerService;
export const custodianLedgerActor = (await createActor(custodianIdentity, "ledger")) as LedgerService;

export const wicpAccountId = AccountIdentifier.fromPrincipal({
  principal: Principal.fromText(canisterIds["wicp"].local)
});
export const aliceAccountId = AccountIdentifier.fromPrincipal({principal: aliceIdentity.getPrincipal()});
export const bobAccountId = AccountIdentifier.fromPrincipal({principal: bobIdentity.getPrincipal()});
export const johnAccountId = AccountIdentifier.fromPrincipal({principal: johnIdentity.getPrincipal()});
export const custodianAccountId = AccountIdentifier.fromPrincipal({principal: custodianIdentity.getPrincipal()});
export const ledgerAccountId = AccountIdentifier.fromPrincipal({principal: ledgerIdentity.getPrincipal()});
export const minterAccountId = AccountIdentifier.fromPrincipal({principal: minterIdentity.getPrincipal()});
