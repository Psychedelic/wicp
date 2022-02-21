#!/bin/bash

if [[ -z $1 ]];
then
    printf "💎 DIP-721 Deploy Script:\n\n   usage: deploy <local|ic|other> [reinstall]\n\n"
    exit 1;
fi

NETWORK=$1
if [[ $NETWORK == "ic" ]];
then
    CANISTER_CAP_ID=lj532-6iaaa-aaaah-qcc7a-cai
else 
    printf "🙏 Verifying the Cap Service status, please wait...\n\n"

    if [ ! -e "$CAP_ROUTER_ID_PATH" ]; then
        # The extra space is intentional, used for alignment
        printf "⚠️  Warning: The Cap Service is required.\n\n"
        read -r -p "🤖 Enter the local Cap container ID: " CANISTER_CAP_ID
    fi
fi


dfx deploy --network $1 wicp \
	--argument="(
        \"data:image/jpeg;base64,\",
        \"wicp\",
        \"WICP\",
        8:nat8,
        1000000000:nat,
        principal \"$(dfx identity get-principal)\", 
        0, 
        principal \"$(dfx identity get-principal)\", 
        principal \"${CANISTER_CAP_ID}\"
        )"