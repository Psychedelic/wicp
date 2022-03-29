# Local Development
using local ledger, required minter and ledger account

## Initialized local environment

```bash
$ make init
```

it will initial canister and accounts as bellow:

- ledger canister id: `ryjl3-tyaaa-aaaaa-aaaba-cai`

- ledger account id: `c85ea35a490855796b4293b4db8bf2a31bddb014340c5349a984ad41b139ca2d`
- ledger principal: `lnviz-hi3hs-lzbuu-2z5wb-ormd3-jml4y-2ss2c-tytaw-e4xkv-pkugx-fae`

- minter account id: `eda46c84d1f67b5bcc46d6abf55b548de337b9f43e3d1bceb62cd6b32223846f`
- minter principal: `7b4qu-ongaw-i6zhb-3rp5d-4mes3-dpmkm-qqwon-nrsjy-zfcyh-4x5sw-pae`

### Verify local ledger canister works:

#### Balance:

Example:
```bash
$ dfx canister call ledger account_balance \
'(record{account='$(python3 -c 'print("vec{"+";".join([
str(b) for b in bytes.fromhex("c85ea35a490855796b4293b4db8bf2a31bddb014340c5349a984ad41b139ca2d")
])+"}")')'})'

(record { e8s = 100_000_000_000 : nat64 })
```

#### Transfer

Example:
```bash
$ dfx canister call ledger transfer \
'(record{
to='$(python3 -c 'print("vec{"+";".join([
  str(b) for b in bytes.fromhex("c85ea35a490855796b4293b4db8bf2a31bddb014340c5349a984ad41b139ca2d")
])+"}")')';
memo=0;
amount=record{e8s=50_000_000_000};
fee=record{e8s=10_000};
})'

(variant { Ok = 2 : nat64 })

$ dfx canister call ledger account_balance \
'(record{account='$(python3 -c 'print("vec{"+";".join([
str(b) for b in bytes.fromhex("c85ea35a490855796b4293b4db8bf2a31bddb014340c5349a984ad41b139ca2d")
])+"}")')'})'

(record { e8s = 150_000_000_000 : nat64 })
```

## Deploy local wicp

```bash
$ make local
```

## Integration test

```bash
$ make test
```

### Utilities

#### Format

```bash
$ make format
```

#### Lint

```bash
$ make lint
```

#### Teardown

```bash
$ make clean
```
