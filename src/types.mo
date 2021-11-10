/**
 * Module     : types.mo
 * Copyright  : 2021 DFinance Team
 * License    : Apache 2.0 with LLVM Exception
 * Maintainer : DFinance Team <hello@dfinance.ai>
 * Stability  : Experimental
 */

import Time "mo:base/Time";
import P "mo:base/Prelude";

module {
    /// Update call operations
    public type Operation = {
        #mint;
        #burn: Nat64;
        #transfer;
        #transferFrom;
        #approve;
    };
    public type TransactionStatus = {
        #succeeded;
        #inprogress;
        #failed;
    };
    /// Update call operation record fields
    public type TxRecord = {
        caller: ?Principal;
        op: Operation;
        index: Nat;
        from: Principal;
        to: Principal;
        amount: Nat;
        fee: Nat;
        timestamp: Time.Time;
        status: TransactionStatus;
    };

    public type ICPTs = {
        e8s: Nat64;
    };

    type TimeStamp = {
        timestamp_nanos: Nat64;
    };

    public type TransactionNotification = {
        to: Principal;
        to_subaccount: ?[Nat8];
        from: Principal;
        memo: Nat64;
        from_subaccount: ?[Nat8];
        amount: ICPTs;
        block_height: Nat64;
    };

    public type SendArgs = {
        memo: Nat64;
        amount: ICPTs;
        fee: ICPTs;
        from_subaccount: ?[Nat8];
        to: Text;
        created_at_time: ?TimeStamp;
    };

    public type LedgerActor = actor {
        send_dfx : (args: SendArgs) -> async Nat64;
    };

    public func unwrap<T>(x : ?T) : T =
        switch x {
            case null { P.unreachable() };
            case (?x_) { x_ };
        };
};