#/bin/bash
# --- HEALTHCHECK.SH --- 

deploy() {
    ./.scripts/deploy.sh local
}

allowance() {
    pem=$AlicePem
    from="${nameToPrincipal[$1]}"
    to="${nameToPrincipal[$2]}"
    icx --pem=$pem query $tokenID allowance "(principal \"$from\", principal \"$to\")" $tokenPrologueXtc
}

decimals(){
    pem=$AlicePem
    icx --pem=$pem query $tokenID decimals "()" $tokenPrologueXtc
}

getMetadata(){
    pem=$AlicePem
    icx --pem=$pem query $tokenID getMetadata "()" $tokenPrologueXtc
}

historySize(){
    pem=$AlicePem
    icx --pem=$pem query $tokenID historySize "()" $tokenPrologueXtc
}

logo(){
    pem=$AlicePem
    icx --pem=$pem query $tokenID logo "()" $tokenPrologueXtc
}

name(){
    pem=$AlicePem
    icx --pem=$pem query $tokenID nameErc20 "()" $tokenPrologueXtc
}

symbol(){
    pem=$AlicePem
    icx --pem=$pem query $tokenID symbol "()" $tokenPrologueXtc
}

totalSupply(){
    pem=$AlicePem
    icx --pem=$pem query $tokenID totalSupply "()" $tokenPrologueXtc
}

getTransaction(){
	txId=$1
	pem=$AlicePem
	icx --pem=$pem update $tokenID getTransaction "($txId)" $tokenPrologueXtc
}

getTransactions(){
	txId=$1
    limit=$2
	pem=$AlicePem
	icx --pem=$pem update $tokenID getTransactions "($txId, $limit)" $tokenPrologueXtc
}

approve(){
	pem="${nameToPem[$1]}"
	to="${nameToPrincipal[$2]}"
	amount=$3
	icx --pem=$pem update $tokenID approve "(principal \"$to\", $amount)" $tokenPrologueXtc
}

transfer(){
	fromPem="${nameToPem[$1]}"
	to="${nameToPrincipal[$2]}"
	amount=$3
	icx --pem=$fromPem update $tokenID transfer "(principal \"$to\", $amount)" $tokenPrologueXtc
}

transferFrom(){
	from="${nameToPrincipal[$1]}"
	to="${nameToPrincipal[$2]}"
	amount=$3
	callerPem="${nameToPem[$1]}"
	if [ "$#" -eq 4 ]; then
    	callerPem="${nameToPem[$4]}"
	fi
	icx --pem=$callerPem update $tokenID transferFrom "(principal \"$from\",principal \"$to\", $amount)" $tokenPrologueXtc
}

balanceOf(){
	pem=$AlicePem
	account="${nameToPrincipal[$1]}"
	icx --pem=$pem query $tokenID balanceOf "(principal \"$account\")" $tokenPrologueXtc
}

tests() {
    deploy
    name
    symbol
    # logo
    decimals
    getMetadata
    historySize
    totalSupply

    allowance
}

source .scripts/identity.sh # setup temporary identities
deploy
