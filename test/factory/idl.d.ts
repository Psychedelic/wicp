import type { Principal } from '@dfinity/principal';
export interface InitArgs {
  'cap' : [] | [Principal],
  'fee' : [] | [bigint],
  'decimals' : [] | [number],
  'fee_to' : [] | [Principal],
  'logo' : [] | [string],
  'name' : [] | [string],
  'custodians' : [] | [Array<Principal>],
  'symbol' : [] | [string],
}
export interface ManualReply {
  'cap' : [] | [Principal],
  'fee' : [] | [bigint],
  'decimals' : [] | [number],
  'fee_to' : [] | [Principal],
  'logo' : [] | [string],
  'name' : [] | [string],
  'created_at' : bigint,
  'upgraded_at' : bigint,
  'custodians' : Array<Principal>,
  'symbol' : [] | [string],
}
export interface _SERVICE {
  'cap' : () => Promise<[] | [Principal]>,
  'custodians' : () => Promise<Array<Principal>>,
  'decimals' : () => Promise<[] | [number]>,
  'fee' : () => Promise<[] | [bigint]>,
  'feeTo' : () => Promise<[] | [Principal]>,
  'logo' : () => Promise<[] | [string]>,
  'metadata' : () => Promise<ManualReply>,
  'name' : () => Promise<[] | [string]>,
  'setCap' : (arg_0: Principal) => Promise<undefined>,
  'setCustodians' : (arg_0: Array<Principal>) => Promise<undefined>,
  'setDecimals' : (arg_0: number) => Promise<undefined>,
  'setFee' : (arg_0: bigint) => Promise<undefined>,
  'setFeeTo' : (arg_0: Principal) => Promise<undefined>,
  'setLogo' : (arg_0: string) => Promise<undefined>,
  'setName' : (arg_0: string) => Promise<undefined>,
  'setSymbol' : (arg_0: string) => Promise<undefined>,
  'symbol' : () => Promise<[] | [string]>,
}