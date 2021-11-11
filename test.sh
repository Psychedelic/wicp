dfx start --clean --background

dfx identity use admin

dfx canister --no-wallet create --all

dfx identity use minting
MINTING_ACCOUNT=\"$(dfx ledger account-id)\"
MINTING_PRINCIPAL="principal \"$(dfx identity get-principal)\""

dfx identity use alice
ALICE_ACCOUNT=\"$(dfx ledger account-id)\"
ALICE_PRINCIPAL="principal \"$(dfx identity get-principal)\""


dfx identity use admin
ADMIN_ACCOUNT=\"$(dfx ledger account-id)\"
ADMIN_PRINCIPAL="principal \"$(dfx identity get-principal)\""


AMOUNT=100_000_000_000_000 # million

dfx build wicp

dfx canister --no-wallet install wicp

# ADMIN mint 1 million ICP to ADMIN 
dfx canister --no-wallet install 3ledger --argument "record {minting_account=$MINTING_ACCOUNT; initial_values=vec {record{$ADMIN_ACCOUNT;record{e8s=$AMOUNT:nat64;}}}; max_message_size_bytes=null;transaction_window=opt record {secs=300:nat64;nanos=0:nat32};archive_options=null;send_whitelist=vec{};}"

# ADMIN transfer 10000 ICP to Alice
dfx canister --no-wallet call 3ledger send_dfx "record {memo=0:nat64;amount=record{e8s=1_00(0 : nat)0_000_000_000:nat64};fee=record{e8s=10000:nat64};from_subaccount=null;to=$ALICE_ACCOUNT;created_at_time=null}"

# Memo = 1346586967 = 0x50434957 // 0x"WICP"
# b5c38c5c8e63d89751b8f8b3fd9deceda70c281b87957ca44319c9758a3dbef2 // WICP canister id's AccountIdentifier
# admin mint 10 WICP
dfx canister --no-wallet call 3ledger send_dfx "record {memo=1346586967:nat64;amount=record{e8s=1_000_000_000:nat64};fee=record{e8s=10000:nat64};from_subaccount=null;to=\"b5c38c5c8e63d89751b8f8b3fd9deceda70c281b87957ca44319c9758a3dbef2\";created_at_time=null}"

dfx canister --no-wallet call 3ledger notify_dfx "record {block_height=2:nat64;max_fee=record{e8s=10000:nat64};from_subaccount=null;to_canister=principal \"r7inp-6aaaa-aaaaa-aaabq-cai\";to_subaccount=null}"


dfx canister --no-wallet call wicp balanceOf "($ALICE_PRINCIPAL)"
(0 : nat)

dfx canister --no-wallet call wicp balanceOf "($ADMIN_PRINCIPAL)"
(1_000_000_000 : nat)

dfx canister --no-wallet call wicp totalSupply
(1_000_000_000 : nat)


# ADMIN  mint 100 WICP 
dfx canister --no-wallet call 3ledger send_dfx "record {memo=1346586967:nat64;amount=record{e8s=10_000_000_000:nat64};fee=record{e8s=10000:nat64};from_subaccount=null;to=\"b5c38c5c8e63d89751b8f8b3fd9deceda70c281b87957ca44319c9758a3dbef2\";created_at_time=null}"

dfx canister --no-wallet call 3ledger notify_dfx "record {block_height=4:nat64;max_fee=record{e8s=10000:nat64};from_subaccount=null;to_canister=principal \"r7inp-6aaaa-aaaaa-aaabq-cai\";to_subaccount=null}"
[Canister ryjl3-tyaaa-aaaaa-aaaba-cai] [ledger] Checking the ledger for block [4]
[Canister r7inp-6aaaa-aaaaa-aaabq-cai] [wicp] notified about transaction 4 by ryjl3-tyaaa-aaaaa-aaaba-cai
()

dfx canister --no-wallet call wicp balanceOf "($ADMIN_PRINCIPAL)"
(11_000_000_000 : nat)

dfx canister --no-wallet call wicp totalSupply
(11_000_000_000 : nat)

# ALICE Mint 100 WICP
dfx identity use alice

dfx canister --no-wallet call 3ledger send_dfx "record {memo=1346586967:nat64;amount=record{e8s=10_000_000_000:nat64};fee=record{e8s=10000:nat64};from_subaccount=null;to=\"b5c38c5c8e63d89751b8f8b3fd9deceda70c281b87957ca44319c9758a3dbef2\";created_at_time=null}"
[Canister ryjl3-tyaaa-aaaaa-aaaba-cai] [ledger] archive not enabled. skipping archive_blocks()
(6 : nat64)

dfx canister --no-wallet call 3ledger notify_dfx "record {block_height=6:nat64;max_fee=record{e8s=10000:nat64};from_subaccount=null;to_canister=principal \"r7inp-6aaaa-aaaaa-aaabq-cai\";to_subaccount=null}"

[Canister ryjl3-tyaaa-aaaaa-aaaba-cai] [ledger] Checking the ledger for block [6]
[Canister r7inp-6aaaa-aaaaa-aaabq-cai] [wicp] notified about transaction 6 by ryjl3-tyaaa-aaaaa-aaaba-cai
()

dfx canister --no-wallet call wicp balanceOf "($ADMIN_PRINCIPAL)"
(11_000_000_000 : nat)

dfx canister --no-wallet call wicp balanceOf "($ALICE_PRINCIPAL)"
(10_000_000_000 : nat)

dfx canister --no-wallet call wicp totalSupply
(21_000_000_000 : nat)

dfx canister --no-wallet call 3ledger account_balance_dfx '(record {account="b5c38c5c8e63d89751b8f8b3fd9deceda70c281b87957ca44319c9758a3dbef2";})'
(record { e8s = 21_000_000_000 : nat64 })

 dfx canister --no-wallet call 3ledger notify_dfx "record {block_height=6:nat64;max_fee=record{e8s=10000:nat64};from_subaccount=null;to_canister=principal \"r7inp-6aaaa-aaaaa-aaabq-cai\";to_subaccount=null}"
[Canister ryjl3-tyaaa-aaaaa-aaaba-cai] [ledger] Checking the ledger for block [6]
[Canister ryjl3-tyaaa-aaaaa-aaaba-cai] Panicked at 'Notification failed: "The notification state is already true', rosetta-api/ledger_canister/src/main.rs:271:68

# transfer 1 ICP, and waiting 5 min, and can't be notified.
dfx canister --no-wallet call 3ledger send_dfx "record {memo=1346586967:nat64;amount=record{e8s=100_000_000:nat64};fee=record{e8s=10000:nat64};from_subaccount=null;to=\"b5c38c5c8e63d89751b8f8b3fd9deceda70c281b87957ca44319c9758a3dbef2\";created_at_time=null}"

# waiting 5 MIN
dfx canister --no-wallet call 3ledger notify_dfx "record {block_height=8:nat64;max_fee=record{e8s=10000:nat64};from_subaccount=null;to_canister=principal \"r7inp-6aaaa-aaaaa-aaabq-cai\";to_subaccount=null}"
[Canister ryjl3-tyaaa-aaaaa-aaaba-cai] [ledger] Checking the ledger for block [8]
[Canister ryjl3-tyaaa-aaaaa-aaaba-cai] Panicked at Notification failed: "You cannot send a notification for a transaction that is more than 300 seconds old", rosetta-api/ledger_canister/src/main.rs:271:68
The Replica returned an error: code 5, message: Canister ryjl3-tyaaa-aaaaa-aaaba-cai trapped explicitly: Panicked at Notification failed: You cannot send a notification for a transaction that is more than 300 seconds old, rosetta-api/ledger_canister/src/main.rs:271:68

# alice withdraw 10 ICP， burn 10 WICP
dfx canister --no-wallet call wicp withdraw "(1_000_000_000:nat64, $ALICE_ACCOUNT)"
[Canister ryjl3-tyaaa-aaaaa-aaaba-cai] [ledger] archive not enabled. skipping archive_blocks()
(variant { ok = 9 : nat64 })

dfx canister --no-wallet call wicp balanceOf "($ALICE_PRINCIPAL)"
(9_000_000_000 : nat)

dfx canister --no-wallet call wicp totalSupply
(20_000_000_000 : nat)

# need sub the fee
dfx canister --no-wallet call 3ledger account_balance_dfx '(record {account="b5c38c5c8e63d89751b8f8b3fd9deceda70c281b87957ca44319c9758a3dbef2";})'
(record { e8s = 20_099_990_000 : nat64 })

# upgrade the wicp, and sub the withdraw fee

# alice withdraw 15 ICP， burn 15 WICP
dfx canister --no-wallet call wicp withdraw "(1_500_000_000:nat64, $ALICE_ACCOUNT)"
[Canister ryjl3-tyaaa-aaaaa-aaaba-cai] [ledger] archive not enabled. skipping archive_blocks()
(variant { ok = 10 : nat64 })

dfx canister --no-wallet call wicp balanceOf "($ALICE_PRINCIPAL)"
(7_500_000_000 : nat)

dfx canister --no-wallet call wicp totalSupply
(18_500_000_000 : nat)

dfx canister --no-wallet call 3ledger account_balance_dfx '(record {account="b5c38c5c8e63d89751b8f8b3fd9deceda70c281b87957ca44319c9758a3dbef2";})'
(record { e8s = 18_599_990_000 : nat64 })

dfx canister --no-wallet call 3ledger account_balance_dfx "(record {account=$ALICE_ACCOUNT})"
(record { e8s = 992_399_960_000 : nat64 })
