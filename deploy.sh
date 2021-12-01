# do not run the script directly, copy/paste the commands to command line and execute one by one
dfx canister --network ic create wicp_rs
cargo build --release --target wasm32-unknown-unknown && ic-cdk-optimizer target/wasm32-unknown-unknown/release/rust.wasm -o target/wasm32-unknown-unknown/release/opt.wasm
dfx canister --network ic install wicp_rs --argument="(\"data:image/jpeg;base64,$(base64 ./wicp.jpg)\",\"wicp\",\"WICP\", 8:nat8, principal \"$(dfx identity get-principal)\", 0, principal \"$(dfx identity get-principal)\", principal \"<CAP Canister>\")"