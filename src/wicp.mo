/**
 * Module     : wicp.mo
 * Copyright  : 2021 DFinance Team
 * License    : Apache 2.0 with LLVM Exception
 * Maintainer : DFinance Team <hello@dfinance.ai>
 * Stability  : Experimental
 */

import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Types "./types";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Option "mo:base/Option";
import Order "mo:base/Order";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Result "mo:base/Result";
import Debug "mo:base/Debug";
import ExperimentalCycles "mo:base/ExperimentalCycles";

shared(msg) actor class WICP(
    _logo: Text,
    _owner: Principal
    ) = this {
    type Operation = Types.Operation;
    type TransactionStatus = Types.TransactionStatus;
    type TxRecord = Types.TxRecord;
    type TransactionNotification = Types.TransactionNotification;
    type ICPTs = Types.ICPTs;
    type SendArgs = Types.SendArgs;
    type LedgerActor = Types.LedgerActor;
    type Metadata = {
        logo : Text;
        name : Text;
        symbol : Text;
        decimals : Nat8;
        totalSupply : Nat;
        owner : Principal;
        fee : Nat;
    };
    // returns tx index or error msg
    type TxReceipt = Result.Result<Nat, {
        #AmountTooSmall;
        #LedgerTrap;
        #Unauthorized;
        #InsufficientBalance;
        #InsufficientAllowance;
    }>;

    private stable let LEDGER : Principal = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    private stable let WICPMEMO : Nat64 = 0x50434957; // 0x"WICP"
    private stable let WITHDRAWMEMO : Nat64 = 0x57444857;  // 0x"WHDW"
    private stable let MINE8S : Nat64 = 10000; // 0.0001 ICP
    private stable let ICPFEE : Nat64 = 10000; // 0.0001 ICP
    private stable var THRESHOLD : Nat64 = 0; //1000000; // 0.01 ICP

    private stable var owner_ : Principal = _owner;
    private stable var logo_ : Text = _logo;
    private stable var name_ : Text = "Wrapped ICP";
    private stable var decimals_ : Nat8 = 8;
    private stable var symbol_ : Text = "WICP";
    private stable var totalSupply_ : Nat = 0;
    private stable var blackhole : Principal = Principal.fromText("aaaaa-aa");
    private stable var feeTo : Principal = owner_;
    private stable var fee : Nat = 10000; // 0.0001 WICP
    private stable var balanceEntries : [(Principal, Nat)] = [];
    private stable var allowanceEntries : [(Principal, [(Principal, Nat)])] = [];
    private var balances = HashMap.HashMap<Principal, Nat>(1, Principal.equal, Principal.hash);
    private var allowances = HashMap.HashMap<Principal, HashMap.HashMap<Principal, Nat>>(1, Principal.equal, Principal.hash);
    balances.put(owner_, totalSupply_);
    private stable let genesis : TxRecord = {
        caller = ?owner_;
        op = #mint;
        index = 0;
        from = blackhole;
        to = owner_;
        amount = totalSupply_;
        fee = 0;
        timestamp = Time.now();
        status = #succeeded;
    };
    private stable var ops : [TxRecord] = [genesis];

    private stable var pendingBurn : [TxRecord] = [];

    private func addRecord(
        caller: ?Principal, op: Operation, from: Principal, to: Principal, amount: Nat,
        fee: Nat, timestamp: Time.Time, status: TransactionStatus
    ): Nat {
        let index = ops.size();
        let o : TxRecord = {
            caller = caller;
            op = op;
            index = index;
            from = from;
            to = to;
            amount = amount;
            fee = fee;
            timestamp = timestamp;
            status = status;
        };
        ops := Array.append(ops, [o]);
        return index;
    };

    private func _chargeFee(from: Principal, fee: Nat) {
        if(fee > 0) {
            _transfer(from, feeTo, fee);
        };
    };

    private func _transfer(from: Principal, to: Principal, value: Nat) {
        let from_balance = _balanceOf(from);
        let from_balance_new : Nat = from_balance - value;
        if (from_balance_new != 0) { balances.put(from, from_balance_new); }
        else { balances.delete(from); };

        let to_balance = _balanceOf(to);
        let to_balance_new : Nat = to_balance + value;
        if (to_balance_new != 0) { balances.put(to, to_balance_new); };
    };

    private func _balanceOf(who: Principal) : Nat {
        switch (balances.get(who)) {
            case (?balance) { return balance; };
            case (_) { return 0; };
        }
    };

    private func _allowance(owner: Principal, spender: Principal) : Nat {
        switch(allowances.get(owner)) {
            case (?allowance_owner) {
                switch(allowance_owner.get(spender)) {
                    case (?allowance) { return allowance; };
                    case (_) { return 0; };
                }
            };
            case (_) { return 0; };
        }
    };

    public shared(msg) func setThresh(newValue: Nat64) {
        assert(msg.caller == owner_);
        THRESHOLD := newValue;
    };

    /*
    *   Core interfaces: 
    *       update calls: 
    *           transfer/transferFrom/approve
    *       query calls: 
    *           logo/name/symbol/decimal/totalSupply/balanceOf/allowance/getMetadata
    *           historySize/getTransaction/getTransactions
    */

    /// Transfers value amount of tokens to Principal to.
    public shared(msg) func transfer(to: Principal, value: Nat) : async TxReceipt {
        if (_balanceOf(msg.caller) < value + fee) {
            return #err(#InsufficientBalance);
        };
        _chargeFee(msg.caller, fee);
        _transfer(msg.caller, to, value);
        let txid = addRecord(null, #transfer, msg.caller, to, value, fee, Time.now(), #succeeded);
        return #ok(txid);
    };

    /// Transfers value amount of tokens from Principal from to Principal to.
    public shared(msg) func transferFrom(from: Principal, to: Principal, value: Nat) : async TxReceipt {
        if (value < fee or _balanceOf(from) < value + fee) {
            return #err(#InsufficientBalance);
        };
        let allowed : Nat = _allowance(from, msg.caller);
        if (allowed < value + fee) { return #err(#InsufficientAllowance); };
        _chargeFee(from, fee);
        _transfer(from, to, value);
        let allowed_new : Nat = allowed - value - fee;
        if (allowed_new != 0) {
            let allowance_from = Types.unwrap(allowances.get(from));
            allowance_from.put(msg.caller, allowed_new);
            allowances.put(from, allowance_from);
        } else {
            if (allowed != 0) {
                let allowance_from = Types.unwrap(allowances.get(from));
                allowance_from.delete(msg.caller);
                if (allowance_from.size() == 0) { allowances.delete(from); }
                else { allowances.put(from, allowance_from); };
            };
        };
        let txid = addRecord(?msg.caller, #transferFrom, from, to, value, fee, Time.now(), #succeeded);
        return #ok(txid);
    };

    /// Allows spender to withdraw from your account multiple times, up to the value amount. 
    /// If this function is called again it overwrites the current allowance with value.
    public shared(msg) func approve(spender: Principal, value: Nat) : async TxReceipt {
        if(_balanceOf(msg.caller) < fee) { return #err(#InsufficientBalance); };
        _chargeFee(msg.caller, fee);
        let v = value + fee;
        if (value == 0 and Option.isSome(allowances.get(msg.caller))) {
            let allowance_caller = Types.unwrap(allowances.get(msg.caller));
            allowance_caller.delete(spender);
            if (allowance_caller.size() == 0) { allowances.delete(msg.caller); }
            else { allowances.put(msg.caller, allowance_caller); };
        } else if (value != 0 and Option.isNull(allowances.get(msg.caller))) {
            var temp = HashMap.HashMap<Principal, Nat>(1, Principal.equal, Principal.hash);
            temp.put(spender, v);
            allowances.put(msg.caller, temp);
        } else if (value != 0 and Option.isSome(allowances.get(msg.caller))) {
            let allowance_caller = Types.unwrap(allowances.get(msg.caller));
            allowance_caller.put(spender, v);
            allowances.put(msg.caller, allowance_caller);
        };
        let txid = addRecord(null, #approve, msg.caller, spender, v, fee, Time.now(), #succeeded);
        return #ok(txid);
    };

    public shared(msg) func transaction_notification(tn: TransactionNotification) : async TxReceipt {
        if (msg.caller != LEDGER) {
            return #err(#Unauthorized);
        };
        if (tn.amount.e8s < THRESHOLD) {
            return #err(#AmountTooSmall);
        };
        // check if receiver is this canister
        if(tn.to != Principal.fromActor(this)) {
            return #err(#Unauthorized);
        };
        let user: Principal = tn.from;
        let value = Nat64.toNat(tn.amount.e8s);
        switch(balances.get(user)) {
            case(?balance) {
                balances.put(user, balance + value);
            };
            case(_) {
                balances.put(user, value);
            };
        };
        totalSupply_ += value;
        let txid = addRecord(?msg.caller, #mint, blackhole, user, value, 0, Time.now(), #succeeded);
        return #ok(txid);
    };

    public shared(msg) func withdraw(value: Nat64, to: Text) : async TxReceipt {
        // check before await, ensure executing success after await.
        if (value < THRESHOLD) {
            return #err(#AmountTooSmall);
        };
        let balance_caller = _balanceOf(msg.caller);
        let value_nat = Nat64.toNat(value);
        if (balance_caller < value_nat or totalSupply_ < value_nat) { 
            return #err(#InsufficientBalance);
        };
        let ledger : LedgerActor = actor(Principal.toText(LEDGER));
        let icpts : ICPTs = {
            e8s = value - ICPFEE;
        };
        let fee : ICPTs = {
            e8s = ICPFEE;
        };
        let args : SendArgs = {
            memo = WITHDRAWMEMO;
            amount = icpts;
            fee = fee;
            from_subaccount = null;
            to = to;
            created_at_time = null;
        };
        // sub balance first to avoid multiple withdraw attack
        if(balance_caller == value_nat) { 
            balances.delete(msg.caller);
        } else { 
            balances.put(msg.caller, balance_caller - value_nat);
        };
        totalSupply_ -= value_nat;

        try {
            let result = await ledger.send_dfx(args);
            let txid = addRecord(null, #burn(result), msg.caller, blackhole, value_nat, 0, Time.now(), #succeeded);
            return #ok(txid);
        } catch (e) {
            balances.put(msg.caller, balance_caller);
            return #err(#LedgerTrap);
        };
    };

    public query func logo() : async Text {
        return logo_;
    };

    public query func name() : async Text {
        return name_;
    };

    public query func symbol() : async Text {
        return symbol_;
    };

    public query func decimals() : async Nat8 {
        return decimals_;
    };

    public query func totalSupply() : async Nat {
        return totalSupply_;
    };

    public query func balanceOf(who: Principal) : async Nat {
        return _balanceOf(who);
    };

    public query func allowance(owner: Principal, spender: Principal) : async Nat {
        return _allowance(owner, spender);
    };

    public query func getMetadata() : async Metadata {
        return {
            logo = logo_;
            name = name_;
            symbol = symbol_;
            decimals = decimals_;
            totalSupply = totalSupply_;
            owner = owner_;
            fee = fee;
        };
    };

    /// Get transaction history size
    public query func historySize() : async Nat {
        return ops.size();
    };

    /// Get transaction by index.
    public query func getTransaction(index: Nat) : async TxRecord {
        return ops[index];
    };

    /// Get history
    public query func getTransactions(start: Nat, limit: Nat) : async [TxRecord] {
        var ret: [TxRecord] = [];
        var i = start;
        while(i < start + limit and i < ops.size()) {
            ret := Array.append(ret, [ops[i]]);
            i += 1;
        };
        return ret;
    };

    /*
    *   Optional interfaces:
    *       setLogo/setFee/setFeeTo/setOwner
    *       getUserTransactionsAmount/getUserTransactions
    *       getTokenInfo/getHolders/getUserApprovals
    */
    public shared(msg) func setLogo(logo: Text) : async Bool {
        assert(msg.caller == owner_);
        logo_ := logo;
        return true;
    };

    public shared(msg) func setFeeTo(to: Principal) : async Bool {
        assert(msg.caller == owner_);
        feeTo := to;
        return true;
    };

    public shared(msg) func setFee(_fee: Nat) : async Bool {
        assert(msg.caller == owner_);
        fee := _fee;
        return true;
    };

    public shared(msg) func setOwner(_owner: Principal) : async Bool {
        assert(msg.caller == owner_);
        owner_ := _owner;
        return true;
    };

    public query func getUserTransactionAmount(a: Principal) : async Nat {
        var res: Nat = 0;
        for (i in ops.vals()) {
            if (i.caller == ?a or i.from == a or i.to == a) {
                res += 1;
            };
        };
        return res;
    };

    public query func getUserTransactions(a: Principal, start: Nat, limit: Nat) : async [TxRecord] {
        var res: [TxRecord] = [];
        var index: Nat = 0;
        for (i in ops.vals()) {
            if (i.caller == ?a or i.from == a or i.to == a) {
                if(index >= start and index < start + limit) {
                    res := Array.append<TxRecord>(res, [i]);
                };
                index += 1;
            };
        };
        return res;
    };

    public type TokenInfo = {
        metadata: Metadata;
        feeTo: Principal;
        // status info
        historySize: Nat;
        deployTime: Time.Time;
        holderNumber: Nat;
        cycles: Nat;
    };
    public query func getTokenInfo(): async TokenInfo {
        {
            metadata = {
                logo = logo_;
                name = name_;
                symbol = symbol_;
                decimals = decimals_;
                totalSupply = totalSupply_;
                owner = owner_;
                fee = fee;
            };
            feeTo = feeTo;
            historySize = ops.size();
            deployTime = genesis.timestamp;
            holderNumber = balances.size();
            cycles = ExperimentalCycles.balance();
        }
    };

    public query func getHolders(start: Nat, limit: Nat) : async [(Principal, Nat)] {
        let temp =  Iter.toArray(balances.entries());
        func order (a: (Principal, Nat), b: (Principal, Nat)) : Order.Order {
            return Nat.compare(b.1, a.1);
        };
        let sorted = Array.sort(temp, order);
        let limit_: Nat = if(start + limit > temp.size()) {
            temp.size() - start
        } else {
            limit
        };
        let res = Array.init<(Principal, Nat)>(limit_, (owner_, 0));
        for (i in Iter.range(0, limit_ - 1)) {
            res[i] := sorted[i+start];
        };
        return Array.freeze(res);
    };

    public query func getAllowanceSize() : async Nat {
        var size : Nat = 0;
        for ((k, v) in allowances.entries()) {
            size += v.size();
        };
        return size;   
    };

    public query func getUserApprovals(who : Principal) : async [(Principal, Nat)] {
        var size : Nat = 0;
        if (Option.isSome(allowances.get(who))) {
            let allowance_who = Option.unwrap(allowances.get(who));
            return Iter.toArray(allowance_who.entries());
        } else {
            return [];
        };
    };

    /*
    * upgrade functions
    */
    system func preupgrade() {
        balanceEntries := Iter.toArray(balances.entries());
        var size : Nat = allowances.size();
        var temp : [var (Principal, [(Principal, Nat)])] = Array.init<(Principal, [(Principal, Nat)])>(size, (owner_, []));
        size := 0;
        for ((k, v) in allowances.entries()) {
            temp[size] := (k, Iter.toArray(v.entries()));
            size += 1;
        };
        allowanceEntries := Array.freeze(temp);
    };

    system func postupgrade() {
        balances := HashMap.fromIter<Principal, Nat>(balanceEntries.vals(), 1, Principal.equal, Principal.hash);
        balanceEntries := [];
        for ((k, v) in allowanceEntries.vals()) {
            let allowed_temp = HashMap.fromIter<Principal, Nat>(v.vals(), 1, Principal.equal, Principal.hash);
            allowances.put(k, allowed_temp);
        };
        allowanceEntries := [];
    };
};
