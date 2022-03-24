import type { Principal } from '@dfinity/principal';
export type GenericValue = { 'Nat64Content' : bigint } |
  { 'Nat32Content' : number } |
  { 'BoolContent' : boolean } |
  { 'Nat8Content' : number } |
  { 'Int64Content' : bigint } |
  { 'IntContent' : bigint } |
  { 'NatContent' : bigint } |
  { 'Nat16Content' : number } |
  { 'Int32Content' : number } |
  { 'Int8Content' : number } |
  { 'Int16Content' : number } |
  { 'BlobContent' : Array<number> } |
  { 'NestedContent' : Vec } |
  { 'Principal' : Principal } |
  { 'TextContent' : string };
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
export interface Stats {
  'cycles' : bigint,
  'total_transactions' : bigint,
  'total_unique_holders' : bigint,
  'total_supply' : bigint,
}
export interface TxEvent {
  'time' : bigint,
  'operation' : string,
  'details' : Array<[string, GenericValue]>,
  'caller' : Principal,
}
export type Vec = Array<
  [
    string,
    { 'Nat64Content' : bigint } |
      { 'Nat32Content' : number } |
      { 'BoolContent' : boolean } |
      { 'Nat8Content' : number } |
      { 'Int64Content' : bigint } |
      { 'IntContent' : bigint } |
      { 'NatContent' : bigint } |
      { 'Nat16Content' : number } |
      { 'Int32Content' : number } |
      { 'Int8Content' : number } |
      { 'Int16Content' : number } |
      { 'BlobContent' : Array<number> } |
      { 'NestedContent' : Vec } |
      { 'Principal' : Principal } |
      { 'TextContent' : string },
  ]
>;
export interface _SERVICE {
  'allowance' : (arg_0: Principal, arg_1: Principal) => Promise<bigint>,
  'balanceOf' : (arg_0: Principal) => Promise<bigint>,
  'cap' : () => Promise<[] | [Principal]>,
  'custodians' : () => Promise<Array<Principal>>,
  'cycles' : () => Promise<bigint>,
  'decimals' : () => Promise<[] | [number]>,
  'fee' : () => Promise<[] | [bigint]>,
  'feeTo' : () => Promise<[] | [Principal]>,
  'isBlockUsed' : (arg_0: bigint) => Promise<boolean>,
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
  'stats' : () => Promise<Stats>,
  'symbol' : () => Promise<[] | [string]>,
  'totalSupply' : () => Promise<bigint>,
  'totalTransactions' : () => Promise<bigint>,
  'totalUniqueHolders' : () => Promise<bigint>,
  'transaction' : (arg_0: bigint) => Promise<[] | [TxEvent]>,
}
