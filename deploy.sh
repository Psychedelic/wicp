# do not run the script directly, copy/paste the commands to command line and execute one by one
# this example is just for showing how to deploy
dfx canister --network ic create wicp

cargo build --target wasm32-unknown-unknown --package rust --release \
	&& ic-cdk-optimizer target/wasm32-unknown-unknown/release/rust.wasm \
	-o target/wasm32-unknown-unknown/release/opt.wasm

# cap test canister id glh6n-uaaaa-aaaaj-aadya-cai
dfx canister --network ic install wicp \
	--argument="(\"data:image/jpeg;base64,$(base64 ./WICP-logo.png)\",\"wicp\",\"WICP\", 8:nat8, principal \"$(dfx identity get-principal)\", 0, principal \"$(dfx identity get-principal)\", principal \"glh6n-uaaaa-aaaaj-aadya-cai\")" \
  -m install
