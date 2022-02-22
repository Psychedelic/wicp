#/bin/bash
# --- HEALTHCHECK.SH --- 
 
NETWORK="local"

deploy() {
    ./.scripts/deploy.sh $NETWORK
}

info() {
    printf "💎 WICP Canister Info:\n\n"
    printf "Name: "
    dfx canister --network $NETWORK --no-wallet call wicp name
    printf "Symbol: "
    dfx canister --network $NETWORK --no-wallet call wicp symbol
    printf "Total Supply: "
    dfx canister --network $NETWORK --no-wallet call wicp totalSupply
    printf "Decimals: "
    dfx canister --network $NETWORK --no-wallet call wicp decimals
    printf "History Size: "
    dfx canister --network $NETWORK --no-wallet call wicp historySize
}

balance() {
    printf "💎 Balances :\n\n"
    printf "Default Balance: "
    dfx canister --network $NETWORK --no-wallet call wicp balanceOf "(principal \"$DEFAULT_PRINCIPAL_ID\")"
    printf "Alice Balance: "
    dfx canister --network $NETWORK --no-wallet call wicp balanceOf "(principal \"$ALICE_PRINCIPAL_ID\")"
    printf "Bob Balance: "
    dfx canister --network $NETWORK --no-wallet call wicp balanceOf "(principal \"$BOB_PRINCIPAL_ID\")"
}

allowance() {
    printf "Allow Alice access 1000 WICP from the dfx principal id\n"
    dfx canister --network $NETWORK --no-wallet call wicp approve "(principal \"$ALICE_PRINCIPAL_ID\", 1000:nat)"
}

transferFrom() {
    printf "Transfer 1000 WICP from dfx principal id to Bob, as user Alice"
    HOME=$ALICE_HOME dfx canister --network $NETWORK --no-wallet call wicp transferFrom "(principal \"$DEFAULT_PRINCIPAL_ID\",principal \"$BOB_PRINCIPAL_ID\", 999:nat)"
}

transfer() {
    printf "Transfer 500 WICP Bob -> Alice\n"
    HOME=$BOB_HOME dfx canister --network $NETWORK --no-wallet call wicp transfer "(principal \"$ALICE_PRINCIPAL_ID\", 500:nat)"
}

metadata() {
    printf "Metadata: %s\n\n" "$(dfx canister --network $NETWORK --no-wallet call wicp getMetadata)"
}


tests() {
    deploy
    info
    balance
    allowance
    transferFrom
    transfer
    balance
}

. ./.scripts/identity.sh # setup temporary identities 
tests