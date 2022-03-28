.PHONY: init candid build local stop-replica test format lint clean

LOCAL_CUSTODIAN_PRINCIPAL=$(shell dfx identity get-principal)
TEST_CUSTODIAN_PRINCIPAL=$(shell cat test/custodian-test-principal)
TEST_MINTER_ACCOUNT_ID=$(shell cat test/minter-test-account-id)
TEST_LEDGER_ACCOUNT_ID=$(shell cat test/ledger-test-account-id)

init:
	npm --prefix test i
	cargo check

candid:
	cargo run > wicp.did
	didc bind -t ts wicp.did > test/factory/idl.d.ts
	echo "// @ts-nocheck" > test/factory/idl.ts
	didc bind -t js wicp.did >> test/factory/idl.ts

build: candid
	dfx ping local || dfx start --clean --background
	dfx canister create wicp
	dfx build wicp

setup-ledger: build
	jq '.canisters.ledger={"type":"custom","wasm":"ledger.wasm","candid":"ledger.private.did"}' < dfx.json | sponge dfx.json
	dfx deploy ledger --argument '(record{minting_account="'$(TEST_MINTER_ACCOUNT_ID)'";initial_values=vec{record{"'$(TEST_LEDGER_ACCOUNT_ID)'";record{e8s=100_000_000_000}};};send_whitelist=vec{}})'
	jq '.canisters.ledger={"type":"custom","wasm":"ledger.wasm","candid":"ledger.public.did"}' < dfx.json | sponge dfx.json

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
