use dfn_core::api::call_with_cleanup;
use dfn_protobuf::protobuf;
use ic_cdk::api::call::{call, ManualReply};
use ic_cdk::api::{caller, canister_balance128, id, time, trap};
use ic_cdk::export::candid::{candid_method, CandidType, Deserialize, Int, Nat};
use ic_cdk::export::Principal;
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_nns_constants::LEDGER_CANISTER_ID;
use ic_types::{CanisterId, PrincipalId};
use ledger_canister::{
    account_identifier::{AccountIdentifier, Subaccount},
    tokens::Tokens,
    tokens::DEFAULT_TRANSFER_FEE,
    AccountBalanceArgs, BlockHeight, BlockRes, Memo, Operation, SendArgs,
};
use num_traits::cast::ToPrimitive;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
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
    #[derive(CandidType, Deserialize)]
    pub enum GenericValue {
        BoolContent(bool),
        TextContent(String),
        BlobContent(Vec<u8>),
        Principal(Principal),
        Nat8Content(u8),
        Nat16Content(u16),
        Nat32Content(u32),
        Nat64Content(u64),
        NatContent(Nat),
        Int8Content(i8),
        Int16Content(i16),
        Int32Content(i32),
        Int64Content(i64),
        IntContent(Int),
        FloatContent(f64), // motoko only support f64
        NestedContent(Vec<(String, GenericValue)>),
    }
    #[derive(CandidType, Default, Deserialize)]
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
    #[derive(CandidType)]
    pub struct Stats {
        pub total_transactions: Nat,
        pub total_supply: Nat,
        pub cycles: Nat,
        pub icps: Nat,
        pub total_unique_holders: Nat,
    }
    #[derive(CandidType)]
    pub enum TokenError {
        InsufficientBalance,
        InsufficientAllowance,
        Unauthorized,
        ErrorTo,
        TxNotFound,
        BlockUsed,
        BlockError,
        ErrorOperationStyle,
        AmountTooSmall,
        LedgerTrap,
        Other(String),
    }
    #[derive(CandidType, Deserialize)]
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

    pub const THRESHOLD: Tokens = Tokens::from_e8s(0); // 0;

    pub fn with<T, F: FnOnce(&Ledger) -> T>(f: F) -> T {
        LEDGER.with(|ledger| f(&ledger.borrow()))
    }

    pub fn with_mut<T, F: FnOnce(&mut Ledger) -> T>(f: F) -> T {
        LEDGER.with(|ledger| f(&mut ledger.borrow_mut()))
    }

    pub async fn get_block_info(
        block_height: BlockHeight,
    ) -> Result<(AccountIdentifier, AccountIdentifier, Tokens), TokenError> {
        let BlockRes(block_response) =
            call_with_cleanup(LEDGER_CANISTER_ID, "block_pb", protobuf, block_height)
                .await
                .map_err(|_| TokenError::BlockError)?;

        let block = match block_response.ok_or(TokenError::BlockError)? {
            Ok(encode_block) => encode_block,
            Err(e) => {
                let storage =
                    Principal::from_text(e.to_string()).map_err(|_| TokenError::BlockError)?;
                let storage_canister = CanisterId::new(PrincipalId::from(storage))
                    .map_err(|_| TokenError::BlockError)?;
                let BlockRes(block_response) =
                    call_with_cleanup(storage_canister, "get_block_pb", protobuf, block_height)
                        .await
                        .map_err(|_| TokenError::BlockError)?;
                block_response
                    .ok_or(TokenError::BlockError)?
                    .map_err(|_| TokenError::BlockError)?
            }
        }
        .decode()
        .map_err(|_| TokenError::BlockError)?;

        match block.transaction.operation {
            Operation::Transfer {
                from,
                to,
                amount,
                fee: _,
            } => Ok((from, to, amount)),
            _ => Err(TokenError::ErrorOperationStyle),
        }
    }

    #[derive(CandidType, Default, Deserialize)]
    pub struct Ledger {
        metadata: Metadata,
        balances: HashMap<Principal, Nat>,
        allowances: HashMap<Principal, HashMap<Principal, Nat>>,
        used_blocks: HashSet<BlockHeight>,
        tx_records: Vec<TxEvent>,
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

        pub fn actual_fee(&self) -> Nat {
            self.metadata.fee.clone().unwrap_or_else(|| Nat::from(0))
        }

        pub fn tx_count(&self) -> usize {
            self.tx_records.len()
        }

        pub fn balances_count(&self) -> usize {
            self.balances.len()
        }

        pub fn total_supply(&self) -> Nat {
            self.balances
                .iter()
                .map(|(_, v)| v.clone())
                .reduce(|accumulator, v| accumulator + v)
                .unwrap_or_else(|| Nat::from(0))
        }

        pub fn balance_of(&self, owner: &Principal) -> Nat {
            self.balances
                .get(owner)
                .cloned()
                .unwrap_or_else(|| Nat::from(0))
        }

        pub fn allowance(&self, owner: &Principal, spender: &Principal) -> Nat {
            self.allowances
                .get(owner)
                .unwrap_or(&HashMap::new())
                .get(spender)
                .cloned()
                .unwrap_or_else(|| Nat::from(0))
        }

        pub fn get_tx(&self, tx_id: usize) -> Option<&TxEvent> {
            self.tx_records.get(tx_id)
        }

        pub fn is_block_used(&self, block_height: &BlockHeight) -> bool {
            self.used_blocks.contains(block_height)
        }

        pub fn is_enough_balance_to_spend(&self, who: &Principal, amount: Nat) -> bool {
            self.balance_of(who) >= amount
        }

        pub fn is_enough_allowance_to_spend(
            &self,
            owner: &Principal,
            spender: &Principal,
            amount: Nat,
        ) -> bool {
            self.allowance(owner, spender) >= amount
        }

        pub fn grant_allowance(&mut self, from: &Principal, to: &Principal, amount: Nat) {
            amount
                .eq(&self.actual_fee())
                .then(|| {
                    self.allowances
                        .get_mut(from)
                        .map(|allowance_sub_entries| {
                            // delete sub-entry
                            allowance_sub_entries.remove(to);
                            allowance_sub_entries.len().eq(&0)
                        })
                        .map(|should_delete_entry| {
                            // delete entry
                            should_delete_entry.then(|| self.allowances.remove(from))
                        });
                })
                .unwrap_or_else(|| {
                    self.allowances
                        .entry(*from)
                        .or_default()
                        .insert(*to, amount);
                })
        }

        pub fn transfer(&mut self, from: &Principal, to: &Principal, amount: Nat) {
            self.is_enough_balance_to_spend(from, amount.clone())
                .then(|| ())
                .expect("TokenError::InsufficientBalance"); // guarding state
            self.balances
                .insert(*from, self.balance_of(from) - amount.clone());
            self.balance_of(from)
                .eq(&0)
                .then(|| self.balances.remove(from));
            self.balances.insert(*to, self.balance_of(to) + amount);
        }

        pub fn charge_fee(&mut self, charge_to: &Principal) {
            if let Some(fee_to) = self.metadata.fee_to {
                self.transfer(charge_to, &fee_to, self.actual_fee());
            }
        }

        pub fn set_block_used(&mut self, block_height: BlockHeight) {
            self.is_block_used(&block_height)
                .not()
                .then(|| ())
                .expect("TokenError::BlockUsed");
            self.used_blocks.insert(block_height);
        }

        pub fn revert_block_used(&mut self, block_height: &BlockHeight) {
            self.used_blocks.remove(block_height);
        }

        pub fn mint(&mut self, to: Principal, amount: Nat) {
            self.balances.insert(to, self.balance_of(&to) + amount);
        }

        pub fn withdraw(&mut self, to: Principal, amount: Nat) {
            self.is_enough_balance_to_spend(&to, amount.clone())
                .then(|| ())
                .expect("TokenError::InsufficientBalance"); // guarding state
            self.balances.insert(to, self.balance_of(&to) - amount);
        }

        pub fn add_tx(
            &mut self,
            caller: Principal,
            operation: String,
            details: Vec<(String, GenericValue)>,
        ) -> usize {
            self.tx_records.push(TxEvent {
                time: time(),
                caller,
                operation,
                details,
            });
            self.tx_count()
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

// ====================================================================================================
// metadata
// ====================================================================================================
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

// ==============================================================================================
// stats
// ==============================================================================================
#[query(name = "totalTransactions", guard = "is_canister_custodian")]
#[candid_method(query, rename = "totalTransactions")]
fn total_transactions() -> Nat {
    ledger::with(|ledger| Nat::from(ledger.tx_count()))
}

#[query(name = "totalSupply", guard = "is_canister_custodian")]
#[candid_method(query, rename = "totalSupply")]
fn total_supply() -> Nat {
    ledger::with(|ledger| ledger.total_supply())
}

#[query(name = "cycles", guard = "is_canister_custodian")]
#[candid_method(query, rename = "cycles")]
fn cycles() -> Nat {
    Nat::from(canister_balance128())
}

#[query(name = "totalUniqueHolders", guard = "is_canister_custodian")]
#[candid_method(query, rename = "totalUniqueHolders")]
fn total_unique_holders() -> Nat {
    ledger::with(|ledger| Nat::from(ledger.balances_count()))
}

#[query(name = "icps", guard = "is_canister_custodian")]
#[candid_method(query, rename = "icps")]
async fn icps() -> Nat {
    let tokens = call::<_, (Tokens,)>(
        Principal::from(CanisterId::get(LEDGER_CANISTER_ID)),
        "account_balance",
        (AccountBalanceArgs {
            account: AccountIdentifier::new(PrincipalId::from(id()), None),
        },),
    )
    .await
    .unwrap_or((Tokens::ZERO,))
    .0;
    Nat::from(tokens.get_e8s())
}

#[query(name = "stats", guard = "is_canister_custodian")]
#[candid_method(query, rename = "stats")]
async fn stats() -> Stats {
    Stats {
        total_transactions: total_transactions(),
        total_supply: total_supply(),
        cycles: cycles(),
        icps: icps().await,
        total_unique_holders: total_unique_holders(),
    }
}

// ==================================================================================================
// balance
// ==================================================================================================
#[query(name = "balanceOf")]
#[candid_method(query, rename = "balanceOf")]
fn balance_of(owner: Principal) -> Nat {
    ledger::with(|ledger| ledger.balance_of(&owner))
}

#[query(name = "allowance")]
#[candid_method(query, rename = "allowance")]
fn allowance(owner: Principal, spender: Principal) -> Nat {
    ledger::with(|ledger| ledger.allowance(&owner, &spender))
}

// ==================================================================================================
// transaction history
// ==================================================================================================
#[query(name = "transaction", manual_reply = true)]
#[candid_method(query, rename = "transaction")]
fn transaction(index: Nat) -> ManualReply<Option<TxEvent>> {
    ledger::with(|ledger| {
        ManualReply::one(
            index
                .0
                .to_usize()
                .ok_or_else(|| TokenError::Other("failed to cast usize from nat".into()))
                .and_then(|index| ledger.get_tx(index - 1).ok_or(TokenError::TxNotFound)),
        )
    })
}

// ==================================================================================================
// block used
// ==================================================================================================
#[query(name = "isBlockUsed")]
#[candid_method(query, rename = "isBlockUsed")]
fn is_block_used(block_height: BlockHeight) -> bool {
    ledger::with(|ledger| ledger.is_block_used(&block_height))
}

// ==================================================================================================
// backup
// ==================================================================================================
#[query(name = "backup", manual_reply = true, guard = "is_canister_custodian")] // prevent spam
#[candid_method(query, rename = "backup")]
fn backup() -> ManualReply<ledger::Ledger> {
    ledger::with(|ledger| ManualReply::one(ledger))
}

// ==================================================================================================
// core api
// ==================================================================================================
#[update(name = "approve")]
#[candid_method(update, rename = "approve")]
fn approve(spender: Principal, amount: Nat) -> Result<Nat, TokenError> {
    ledger::with_mut(|ledger| {
        let owner = caller();
        ledger
            .is_enough_balance_to_spend(&owner, ledger.actual_fee())
            .then(|| ())
            .ok_or(TokenError::InsufficientBalance)?;
        ledger.charge_fee(&owner);
        // for the sake of predictable amount that will be spent for the owner.
        // so the owner can be sure of the amount that the sender can spend.
        // the owner will see the `amount + fee` as the actual allowance being granted.
        // spender will see the `amount + fee` as allowance with fee included.
        ledger.grant_allowance(&owner, &spender, amount.clone() + ledger.actual_fee());
        Ok(Nat::from(ledger.add_tx(
            owner,
            "approve".into(),
            vec![
                ("owner".into(), GenericValue::Principal(owner)),
                ("spender".into(), GenericValue::Principal(spender)),
                (
                    "amount".into(),
                    GenericValue::NatContent(amount + ledger.actual_fee()),
                ),
                ("fee".into(), GenericValue::NatContent(ledger.actual_fee())),
            ],
        )))
    })
}

#[update(name = "transferFrom")]
#[candid_method(update, rename = "transferFrom")]
fn transfer_from(from: Principal, to: Principal, amount: Nat) -> Result<Nat, TokenError> {
    ledger::with_mut(|ledger| {
        let spender = caller();
        ledger
            .is_enough_allowance_to_spend(&from, &spender, amount.clone() + ledger.actual_fee())
            .then(|| ())
            .ok_or(TokenError::InsufficientAllowance)?;
        ledger
            .is_enough_balance_to_spend(&from, amount.clone() + ledger.actual_fee())
            .then(|| ())
            .ok_or(TokenError::InsufficientBalance)?;
        ledger.charge_fee(&from);
        ledger.transfer(&from, &to, amount.clone());
        ledger.grant_allowance(
            &from,
            &spender,
            ledger.allowance(&from, &spender) - amount.clone(),
        );
        Ok(Nat::from(ledger.add_tx(
            spender,
            "transferFrom".into(),
            vec![
                ("from".into(), GenericValue::Principal(from)),
                ("to".into(), GenericValue::Principal(to)),
                ("amount".into(), GenericValue::NatContent(amount)),
                ("fee".into(), GenericValue::NatContent(ledger.actual_fee())),
            ],
        )))
    })
}

#[update(name = "transfer")]
#[candid_method(update, rename = "transfer")]
fn transfer(to: Principal, amount: Nat) -> Result<Nat, TokenError> {
    ledger::with_mut(|ledger| {
        let from = caller();
        ledger
            .is_enough_balance_to_spend(&from, amount.clone() + ledger.actual_fee())
            .then(|| ())
            .ok_or(TokenError::InsufficientBalance)?;
        ledger.charge_fee(&from);
        ledger.transfer(&from, &to, amount.clone());
        Ok(Nat::from(ledger.add_tx(
            from,
            "transfer".into(),
            vec![
                ("from".into(), GenericValue::Principal(from)),
                ("to".into(), GenericValue::Principal(to)),
                ("amount".into(), GenericValue::NatContent(amount)),
                ("fee".into(), GenericValue::NatContent(ledger.actual_fee())),
            ],
        )))
    })
}

#[update(name = "mint")]
#[candid_method(update, rename = "mint")]
async fn mint(
    sub_account: Option<Subaccount>,
    block_height: BlockHeight,
) -> Result<Nat, TokenError> {
    is_block_used(block_height)
        .not()
        .then(|| ())
        .ok_or(TokenError::BlockUsed)?;
    let (from, to, amount) = ledger::get_block_info(block_height).await?;
    ledger::with_mut(|ledger| {
        ledger
            .is_block_used(&block_height)
            .not()
            .then(|| ())
            .ok_or(TokenError::BlockUsed)?;
        ledger.set_block_used(block_height);
        let caller = caller();
        let caller_account = AccountIdentifier::new(PrincipalId::from(caller), sub_account);
        let wicp_account = AccountIdentifier::new(PrincipalId::from(id()), None);
        caller_account.eq(&from).then(|| ()).ok_or_else(|| {
            ledger.revert_block_used(&block_height);
            TokenError::Unauthorized
        })?;
        wicp_account.eq(&to).then(|| ()).ok_or_else(|| {
            ledger.revert_block_used(&block_height);
            TokenError::ErrorTo
        })?;
        amount.ge(&ledger::THRESHOLD).then(|| ()).ok_or_else(|| {
            ledger.revert_block_used(&block_height);
            TokenError::AmountTooSmall
        })?;
        ledger.mint(caller, Nat::from(amount.get_e8s()));
        Ok(Nat::from(ledger.add_tx(
            caller,
            "mint".into(),
            vec![
                ("to".into(), GenericValue::Principal(caller)),
                (
                    "amount".into(),
                    GenericValue::NatContent(Nat::from(amount.get_e8s())),
                ),
            ],
        )))
    })
}

#[update(name = "withdraw")]
#[candid_method(update, rename = "withdraw")]
async fn withdraw(amount: Nat, to: String) -> Result<Nat, TokenError> {
    let amount_e8s = amount
        .0
        .to_u64()
        .ok_or_else(|| TokenError::Other("failed to cast usize from nat".into()))?;
    Tokens::from_e8s(amount_e8s)
        .ge(&ledger::THRESHOLD)
        .then(|| ())
        .ok_or(TokenError::AmountTooSmall)?;
    let caller = caller();
    balance_of(caller)
        .ge(&amount)
        .then(|| ())
        .ok_or(TokenError::InsufficientBalance)?;
    total_supply()
        .ge(&amount)
        .then(|| ())
        .ok_or(TokenError::InsufficientBalance)?;
    let args = SendArgs {
        memo: Memo(0),
        amount: (Tokens::from_e8s(amount_e8s) - DEFAULT_TRANSFER_FEE).unwrap(),
        fee: DEFAULT_TRANSFER_FEE,
        from_subaccount: None,
        to: AccountIdentifier::from_hex(&to).unwrap(),
        created_at_time: None,
    };
    ledger::with_mut(|ledger| ledger.withdraw(caller, amount.clone()));
    call::<_, (BlockHeight,)>(
        Principal::from(CanisterId::get(LEDGER_CANISTER_ID)),
        "send_dfx",
        (args,),
    )
    .await
    .map_err(|_| {
        ledger::with_mut(|ledger| ledger.mint(caller, amount.clone()));
        TokenError::LedgerTrap
    })
    .map(|_| {
        ledger::with_mut(|ledger| {
            Nat::from(ledger.add_tx(
                caller,
                "burn".into(),
                vec![
                    ("to".into(), GenericValue::Principal(caller)),
                    ("amount".into(), GenericValue::NatContent(amount)),
                ],
            ))
        })
    })
}

// ==================================================================================================
// upgrade
// ==================================================================================================
/// NOTE:
/// If you plan to store gigabytes of state and upgrade the code,
/// Using stable memory as the main storage is a good option to consider
#[pre_upgrade]
fn pre_upgrade() {
    ledger::with(|ledger| {
        if let Err(err) = ic_cdk::storage::stable_save::<(&ledger::Ledger,)>((ledger,)) {
            trap(&format!(
                "An error occurred when saving to stable memory (pre_upgrade): {:?}",
                err
            ));
        };
    })
}

#[post_upgrade]
fn post_upgrade() {
    ledger::with_mut(
        |ledger| match ic_cdk::storage::stable_restore::<(ledger::Ledger,)>() {
            Ok((ledger_store,)) => {
                *ledger = ledger_store;
                ledger.metadata_mut().upgraded_at = time();
            }
            Err(err) => {
                trap(&format!(
                    "An error occurred when loading from stable memory (post_upgrade): {:?}",
                    err
                ));
            }
        },
    )
}
#[cfg(any(target_arch = "wasm32", test))]
fn main() {}

#[cfg(not(any(target_arch = "wasm32", test)))]
fn main() {
    ic_cdk::export::candid::export_service!();
    std::print!("{}", __export_service());
}
