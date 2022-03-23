use ic_cdk::api::call::ManualReply;
use ic_cdk::api::{caller, time, trap};
use ic_cdk::export::candid::{candid_method, CandidType, Deserialize, Int, Nat};
use ic_cdk::export::Principal;
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ledger_canister::BlockHeight;
use num_traits::cast::ToPrimitive;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet, VecDeque};
use std::ops::Not;
use types::*;
mod types {
    use super::*;
    #[derive(CandidType, Deserialize)]
    pub struct InitArgs {
        pub name: Option<String>,
        pub logo: Option<String>,
        pub symbol: Option<String>,
        pub decimals: Option<u8>,
        pub fee: Option<Nat>,
        pub fee_to: Option<Principal>,
        pub custodians: Option<HashSet<Principal>>,
        pub cap: Option<Principal>,
    }
    pub enum GenericValue {
        BoolContent(bool),
        TextContent(String),
        BlobContent(Vec<u8>),
        Principal(Principal),
        NatContent(Nat),
        Nat8Content(u8),
        Nat16Content(u16),
        Nat32Content(u32),
        Nat64Content(u64),
        IntContent(Int),
        Int8Content(i8),
        Int16Content(i16),
        Int32Content(i32),
        Int64Content(i64),
        NestedContent(Vec<(String, GenericValue)>),
    }
    #[derive(CandidType, Default)]
    pub struct Metadata {
        pub name: Option<String>,
        pub logo: Option<String>,
        pub symbol: Option<String>,
        pub decimals: Option<u8>,
        pub fee: Option<Nat>,
        pub fee_to: Option<Principal>,
        pub custodians: HashSet<Principal>,
        pub cap: Option<Principal>,
        pub created_at: u64,
        pub upgraded_at: u64,
    }
    pub enum TxError {
        InsufficientBalance,
        InsufficientAllowance,
        Unauthorized,
        LedgerTrap,
        AmountTooSmall,
        BlockUsed,
        ErrorOperationStyle,
        ErrorTo,
        Other,
    }
    pub struct TxEvent {
        pub time: u64,
        pub caller: Principal,
        pub operation: String,
        pub details: Vec<(String, GenericValue)>,
    }
}

mod ledger {
    use super::*;

    thread_local!(
        static LEDGER: RefCell<Ledger> = RefCell::new(Ledger::default());
    );

    pub fn with<T, F: FnOnce(&Ledger) -> T>(f: F) -> T {
        LEDGER.with(|ledger| f(&ledger.borrow()))
    }

    pub fn with_mut<T, F: FnOnce(&mut Ledger) -> T>(f: F) -> T {
        LEDGER.with(|ledger| f(&mut ledger.borrow_mut()))
    }

    #[derive(Default)]
    pub struct Ledger {
        metadata: Metadata,
        balances: HashMap<Principal, Nat>,
        allowances: HashMap<Principal, HashMap<Principal, Nat>>,
        used_blocks: HashSet<BlockHeight>,
        tx_records: VecDeque<TxEvent>,
    }

    impl Ledger {
        pub fn init_metadata(&mut self, default_custodian: Principal, args: Option<InitArgs>) {
            let metadata = self.metadata_mut();
            metadata.custodians.insert(default_custodian);
            if let Some(args) = args {
                metadata.name = args.name;
                metadata.logo = args.logo;
                metadata.symbol = args.symbol;
                metadata.decimals = args.decimals;
                metadata.fee = args.fee;
                metadata.fee_to = args.fee_to;
                metadata.cap = args.cap;
                if let Some(custodians) = args.custodians {
                    for custodians in custodians {
                        metadata.custodians.insert(custodians);
                    }
                }
            }
            metadata.created_at = time();
            metadata.upgraded_at = time();
        }

        pub fn metadata(&self) -> &Metadata {
            &self.metadata
        }

        pub fn metadata_mut(&mut self) -> &mut Metadata {
            &mut self.metadata
        }
    }
}

#[init]
#[candid_method(init)]
fn init(args: Option<InitArgs>) {
    ledger::with_mut(|ledger| ledger.init_metadata(caller(), args));
}

fn is_canister_custodian() -> Result<(), String> {
    ledger::with(|ledger| {
        ledger
            .metadata()
            .custodians
            .contains(&caller())
            .then(|| ())
            .ok_or_else(|| "Caller is not an custodian of canister".into())
    })
}

#[query(name = "metadata", manual_reply = true)]
#[candid_method(query, rename = "metadata")]
fn metadata() -> ManualReply<Metadata> {
    ledger::with(|ledger| ManualReply::one(ledger.metadata()))
}

#[query(name = "name", manual_reply = true)]
#[candid_method(query, rename = "name")]
fn name() -> ManualReply<Option<String>> {
    ledger::with(|ledger| ManualReply::one(ledger.metadata().name.as_ref()))
}

#[query(name = "logo", manual_reply = true)]
#[candid_method(query, rename = "logo")]
fn logo() -> ManualReply<Option<String>> {
    ledger::with(|ledger| ManualReply::one(ledger.metadata().logo.as_ref()))
}

#[query(name = "symbol", manual_reply = true)]
#[candid_method(query, rename = "symbol")]
fn symbol() -> ManualReply<Option<String>> {
    ledger::with(|ledger| ManualReply::one(ledger.metadata().symbol.as_ref()))
}

#[query(name = "decimals", manual_reply = true)]
#[candid_method(query, rename = "decimals")]
fn decimals() -> ManualReply<Option<u8>> {
    ledger::with(|ledger| ManualReply::one(ledger.metadata().decimals.as_ref()))
}

#[query(name = "fee", manual_reply = true)]
#[candid_method(query, rename = "fee")]
fn fee() -> ManualReply<Option<Nat>> {
    ledger::with(|ledger| ManualReply::one(ledger.metadata().fee.as_ref()))
}

#[query(name = "feeTo", manual_reply = true)]
#[candid_method(query, rename = "feeTo")]
fn fee_to() -> ManualReply<Option<Principal>> {
    ledger::with(|ledger| ManualReply::one(ledger.metadata().fee_to.as_ref()))
}

#[query(name = "custodians", manual_reply = true)]
#[candid_method(query, rename = "custodians")]
fn custodians() -> ManualReply<HashSet<Principal>> {
    ledger::with(|ledger| ManualReply::one(&ledger.metadata().custodians))
}

#[query(name = "cap", manual_reply = true)]
#[candid_method(query, rename = "cap")]
fn cap() -> ManualReply<Option<Principal>> {
    ledger::with(|ledger| ManualReply::one(&ledger.metadata().cap))
}

#[update(name = "setName", guard = "is_canister_custodian")]
#[candid_method(update, rename = "setName")]
fn set_name(name: String) {
    ledger::with_mut(|ledger| ledger.metadata_mut().name = Some(name))
}

#[update(name = "setLogo", guard = "is_canister_custodian")]
#[candid_method(update, rename = "setLogo")]
fn set_logo(logo: String) {
    ledger::with_mut(|ledger| ledger.metadata_mut().logo = Some(logo))
}

#[update(name = "setSymbol", guard = "is_canister_custodian")]
#[candid_method(update, rename = "setSymbol")]
fn set_symbol(symbol: String) {
    ledger::with_mut(|ledger| ledger.metadata_mut().symbol = Some(symbol))
}

#[update(name = "setDecimals", guard = "is_canister_custodian")]
#[candid_method(update, rename = "setDecimals")]
fn set_decimals(decimals: u8) {
    ledger::with_mut(|ledger| ledger.metadata_mut().decimals = Some(decimals))
}

#[update(name = "setFee", guard = "is_canister_custodian")]
#[candid_method(update, rename = "setFee")]
fn set_fee(fee: Nat) {
    ledger::with_mut(|ledger| ledger.metadata_mut().fee = Some(fee))
}

#[update(name = "setFeeTo", guard = "is_canister_custodian")]
#[candid_method(update, rename = "setFeeTo")]
fn set_fee_to(fee_to: Principal) {
    ledger::with_mut(|ledger| ledger.metadata_mut().fee_to = Some(fee_to))
}

#[update(name = "setCustodians", guard = "is_canister_custodian")]
#[candid_method(update, rename = "setCustodians")]
fn set_custodians(custodians: HashSet<Principal>) {
    ledger::with_mut(|ledger| ledger.metadata_mut().custodians = custodians)
}

/// useful for existing canister has cap root bucket associated already
#[update(name = "setCap", guard = "is_canister_custodian")]
#[candid_method(update, rename = "setCap")]
fn set_cap(cap: Principal) {
    ledger::with_mut(|ledger| ledger.metadata_mut().cap = Some(cap))
}

#[cfg(any(target_arch = "wasm32", test))]
fn main() {}

#[cfg(not(any(target_arch = "wasm32", test)))]
fn main() {
    ic_cdk::export::candid::export_service!();
    std::print!("{}", __export_service());
}
