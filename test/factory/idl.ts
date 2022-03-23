// @ts-nocheck
export const idlFactory = ({ IDL }) => {
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
  const ManualReply = IDL.Record({
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
  return IDL.Service({
    'cap' : IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'custodians' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'decimals' : IDL.Func([], [IDL.Opt(IDL.Nat8)], ['query']),
    'fee' : IDL.Func([], [IDL.Opt(IDL.Nat)], ['query']),
    'feeTo' : IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'logo' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'metadata' : IDL.Func([], [ManualReply], ['query']),
    'name' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'setCap' : IDL.Func([IDL.Principal], [], []),
    'setCustodians' : IDL.Func([IDL.Vec(IDL.Principal)], [], []),
    'setDecimals' : IDL.Func([IDL.Nat8], [], []),
    'setFee' : IDL.Func([IDL.Nat], [], []),
    'setFeeTo' : IDL.Func([IDL.Principal], [], []),
    'setLogo' : IDL.Func([IDL.Text], [], []),
    'setName' : IDL.Func([IDL.Text], [], []),
    'setSymbol' : IDL.Func([IDL.Text], [], []),
    'symbol' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
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
