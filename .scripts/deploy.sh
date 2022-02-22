#!/bin/bash

if [[ -z $1 ]];
then
    printf "💎 DIP-721 Deploy Script:\n\n   usage: deploy <local|ic|other> [reinstall]\n\n"
    exit 1;
fi
NETWORK=$1
MODE=$2

source .scripts/cap_service.sh # this handles setting the cap id variable, and checks to see if it's already been set

if [[ "$MODE" == "reinstall" ]]; then
  MODE="--mode reinstall"
fi

dfx deploy --network $NETWORK wicp \
	--argument="(
        \"data:image/jpeg;base64,$(base64 WICP-logo.png)\",
        \"wicp\",
        \"WICP\",
        8:nat8,
        1000000000:nat,
        principal \"$(dfx identity get-principal)\", 
        0, 
        principal \"$(dfx identity get-principal)\", 
        principal \"$CAP_ID\"
        )" \
    $MODE