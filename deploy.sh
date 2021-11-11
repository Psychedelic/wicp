# do not run the script directly, copy/paste the commands to command line and execute one by one
dfx canister --network ic create wicp
dfx build --network ic
dfx canister --network ic install wicp --argument="(\"data:image/jpeg;base64,$(base64 ./wicp.jpg)\", principal \"$(dfx identity get-principal)\")"
