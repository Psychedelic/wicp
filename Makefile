.PHONY: init candid build setup-ledger local stop-replica test format lint clean

LOCAL_CUSTODIAN_PRINCIPAL=$(shell dfx identity get-principal)
LOCAL_LEDGER_ACCOUNT_ID=$(shell dfx ledger account-id)
TEST_CUSTODIAN_PRINCIPAL=$(shell cat test/custodian-test-principal)
TEST_MINTER_ACCOUNT_ID=$(shell cat test/minter-test-account-id)
TEST_LEDGER_ACCOUNT_ID=$(shell cat test/ledger-test-account-id)

IC_VERSION="a7058d009494bea7e1d898a3dd7b525922979039"

init:
	npm --prefix test i
	cargo check
	curl -o ledger.wasm.gz https://download.dfinity.systems/ic/${IC_VERSION}/canisters/ledger-canister_notify-method.wasm.gz
	gunzip -f ledger.wasm.gz
	curl -o ledger.private.did https://raw.githubusercontent.com/dfinity/ic/${IC_VERSION}/rs/rosetta-api/ledger.did
	curl -o ledger.public.did https://raw.githubusercontent.com/dfinity/ic/${IC_VERSION}/rs/rosetta-api/ledger_canister/ledger.did

candid:
	cargo run > wicp.did
	didc bind -t ts wicp.did > test/factory/wicp_idl.d.ts
	echo "// @ts-nocheck" > test/factory/wicp_idl.ts
	didc bind -t js wicp.did >> test/factory/wicp_idl.ts
	didc bind -t ts ledger.public.did > test/factory/ledger_idl.d.ts
	echo "// @ts-nocheck" > test/factory/ledger_idl.ts
	didc bind -t js ledger.public.did >> test/factory/ledger_idl.ts

build: candid
	dfx ping local || dfx start --clean --background
	dfx canister create wicp
	dfx build wicp

setup-ledger: build
	jq '.canisters.ledger={"type":"custom","wasm":"ledger.wasm","candid":"ledger.private.did"}' < dfx.json | sponge dfx.json
	dfx deploy ledger --argument '(record{minting_account="'$(TEST_MINTER_ACCOUNT_ID)'";initial_values=vec{record{"'$(TEST_LEDGER_ACCOUNT_ID)'";record{e8s=100_000_000_000}};record{"'$(LOCAL_LEDGER_ACCOUNT_ID)'";record{e8s=100_000_000_000}}};send_whitelist=vec{}})'
	jq '.canisters.ledger.candid="ledger.public.did"' < dfx.json | sponge dfx.json

local: setup-ledger
	dfx deploy wicp --argument '(opt record{custodians=opt vec{principal"$(LOCAL_CUSTODIAN_PRINCIPAL)"}})'

stop-replica:
	dfx stop

test: stop-replica setup-ledger
	dfx canister install wicp --argument '(opt record{custodians=opt vec{principal"$(TEST_CUSTODIAN_PRINCIPAL)"}})'
	npm --prefix test t
	dfx stop

format:
	npm --prefix test run prettier
	cargo fmt --all

lint:
	npm --prefix test run prebuild
	cargo fmt --all -- --check
	cargo clippy --all-targets --all-features -- -D warnings -D clippy::all

clean:
	cargo clean
	npm --prefix test run clean
	dfx stop
	rm -f ledger.wasm
	rm -f ledger.private.did
	rm -f ledger.public.did
