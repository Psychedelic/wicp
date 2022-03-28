// @ts-nocheck
export const idlFactory = ({ IDL }) => {
  const Vec = IDL.Rec();
  const InitArgs = IDL.Record({
    'cap' : IDL.Opt(IDL.Principal),
    'fee' : IDL.Opt(IDL.Nat),
    'decimals' : IDL.Opt(IDL.Nat8),
    'fee_to' : IDL.Opt(IDL.Principal),
    'logo' : IDL.Opt(IDL.Text),
    'name' : IDL.Opt(IDL.Text),
    'custodians' : IDL.Opt(IDL.Vec(IDL.Principal)),
    'symbol' : IDL.Opt(IDL.Text),
  });
  const TokenError = IDL.Variant({
    'InsufficientAllowance' : IDL.Null,
    'BlockError' : IDL.Null,
    'InsufficientBalance' : IDL.Null,
    'TxNotFound' : IDL.Null,
    'ErrorOperationStyle' : IDL.Null,
    'Unauthorized' : IDL.Null,
    'LedgerTrap' : IDL.Null,
    'ErrorTo' : IDL.Null,
    'Other' : IDL.Text,
    'BlockUsed' : IDL.Null,
    'AmountTooSmall' : IDL.Null,
  });
  const Result = IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : TokenError });
  const Metadata = IDL.Record({
    'cap' : IDL.Opt(IDL.Principal),
    'fee' : IDL.Opt(IDL.Nat),
    'decimals' : IDL.Opt(IDL.Nat8),
    'fee_to' : IDL.Opt(IDL.Principal),
    'logo' : IDL.Opt(IDL.Text),
    'name' : IDL.Opt(IDL.Text),
    'created_at' : IDL.Nat64,
    'upgraded_at' : IDL.Nat64,
    'custodians' : IDL.Vec(IDL.Principal),
    'symbol' : IDL.Opt(IDL.Text),
  });
  Vec.fill(
    IDL.Vec(
      IDL.Tuple(
        IDL.Text,
        IDL.Variant({
          'Nat64Content' : IDL.Nat64,
          'Nat32Content' : IDL.Nat32,
          'BoolContent' : IDL.Bool,
          'Nat8Content' : IDL.Nat8,
          'Int64Content' : IDL.Int64,
          'IntContent' : IDL.Int,
          'NatContent' : IDL.Nat,
          'Nat16Content' : IDL.Nat16,
          'Int32Content' : IDL.Int32,
          'Int8Content' : IDL.Int8,
          'FloatContent' : IDL.Float64,
          'Int16Content' : IDL.Int16,
          'BlobContent' : IDL.Vec(IDL.Nat8),
          'NestedContent' : Vec,
          'Principal' : IDL.Principal,
          'TextContent' : IDL.Text,
        }),
      )
    )
  );
  const GenericValue = IDL.Variant({
    'Nat64Content' : IDL.Nat64,
    'Nat32Content' : IDL.Nat32,
    'BoolContent' : IDL.Bool,
    'Nat8Content' : IDL.Nat8,
    'Int64Content' : IDL.Int64,
    'IntContent' : IDL.Int,
    'NatContent' : IDL.Nat,
    'Nat16Content' : IDL.Nat16,
    'Int32Content' : IDL.Int32,
    'Int8Content' : IDL.Int8,
    'FloatContent' : IDL.Float64,
    'Int16Content' : IDL.Int16,
    'BlobContent' : IDL.Vec(IDL.Nat8),
    'NestedContent' : Vec,
    'Principal' : IDL.Principal,
    'TextContent' : IDL.Text,
  });
  const TxEvent = IDL.Record({
    'time' : IDL.Nat64,
    'operation' : IDL.Text,
    'details' : IDL.Vec(IDL.Tuple(IDL.Text, GenericValue)),
    'caller' : IDL.Principal,
  });
  const ManualReply = IDL.Record({
    'metadata' : Metadata,
    'tx_records' : IDL.Vec(TxEvent),
    'allowances' : IDL.Vec(
      IDL.Tuple(IDL.Principal, IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat)))
    ),
    'used_blocks' : IDL.Vec(IDL.Nat64),
    'balances' : IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat)),
  });
  const Stats = IDL.Record({
    'cycles' : IDL.Nat,
    'total_transactions' : IDL.Nat,
    'total_unique_holders' : IDL.Nat,
    'total_supply' : IDL.Nat,
  });
  return IDL.Service({
    'allowance' : IDL.Func(
        [IDL.Principal, IDL.Principal],
        [IDL.Nat],
        ['query'],
      ),
    'approve' : IDL.Func([IDL.Principal, IDL.Nat], [Result], []),
    'backup' : IDL.Func([], [ManualReply], ['query']),
    'balanceOf' : IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'cap' : IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'custodians' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'cycles' : IDL.Func([], [IDL.Nat], ['query']),
    'decimals' : IDL.Func([], [IDL.Opt(IDL.Nat8)], ['query']),
    'fee' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'feeTo' : IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'isBlockUsed' : IDL.Func([IDL.Nat64], [IDL.Bool], ['query']),
    'logo' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'metadata' : IDL.Func([], [Metadata], ['query']),
    'mint' : IDL.Func([IDL.Opt(IDL.Vec(IDL.Nat8)), IDL.Nat64], [Result], []),
    'name' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'setCap' : IDL.Func([IDL.Principal], [], []),
    'setCustodians' : IDL.Func([IDL.Vec(IDL.Principal)], [], []),
    'setDecimals' : IDL.Func([IDL.Nat8], [], []),
    'setFee' : IDL.Func([IDL.Nat], [], []),
    'setFeeTo' : IDL.Func([IDL.Principal], [], []),
    'setLogo' : IDL.Func([IDL.Text], [], []),
    'setName' : IDL.Func([IDL.Text], [], []),
    'setSymbol' : IDL.Func([IDL.Text], [], []),
    'stats' : IDL.Func([], [Stats], ['query']),
    'symbol' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'totalSupply' : IDL.Func([], [IDL.Nat], ['query']),
    'totalTransactions' : IDL.Func([], [IDL.Nat], ['query']),
    'totalUniqueHolders' : IDL.Func([], [IDL.Nat], ['query']),
    'transaction' : IDL.Func([IDL.Nat], [IDL.Opt(TxEvent)], ['query']),
    'transfer' : IDL.Func([IDL.Principal, IDL.Nat], [Result], []),
    'transferFrom' : IDL.Func(
        [IDL.Principal, IDL.Principal, IDL.Nat],
        [Result],
        [],
      ),
    'withdraw' : IDL.Func([IDL.Nat, IDL.Text], [Result], []),
  });
};
export const init = ({ IDL }) => {
  const InitArgs = IDL.Record({
    'cap' : IDL.Opt(IDL.Principal),
    'fee' : IDL.Opt(IDL.Nat),
    'decimals' : IDL.Opt(IDL.Nat8),
    'fee_to' : IDL.Opt(IDL.Principal),
    'logo' : IDL.Opt(IDL.Text),
    'name' : IDL.Opt(IDL.Text),
    'custodians' : IDL.Opt(IDL.Vec(IDL.Principal)),
    'symbol' : IDL.Opt(IDL.Text),
  });
  return [IDL.Opt(InitArgs)];
};
