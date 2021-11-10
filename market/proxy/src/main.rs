use candid::candid_method;
use dfn_core::api::call_with_cleanup;
use dfn_protobuf::protobuf;
use ic_base_types::CanisterId;
use ic_cdk_macros::*;
use ledger_canister::{Block, BlockHeight, BlockRes};

const LEDGER_CANISTER_ID: CanisterId = CanisterId::from_u64(2);

#[update]
#[candid_method(update)]
async fn block_pb(block_height: BlockHeight) -> Block {
    let res: Result<BlockRes, (Option<i32>, String)> =
        call_with_cleanup(LEDGER_CANISTER_ID, "block_pb", protobuf, block_height).await;

    let block = res
        .unwrap()
        .0
        .unwrap()
        .unwrap()
        .decode()
        .expect("unable to decode block");
    block
}

#[cfg(any(target_arch = "wasm32", test))]
fn main() {}

#[cfg(not(any(target_arch = "wasm32", test)))]
fn main() {
    candid::export_service!();
    std::print!("{}", __export_service());
}
