import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Hash "mo:base/Hash";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Option "mo:base/Option";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Error "mo:base/Error";
import Utils "./utils";
import Cycles "mo:base/ExperimentalCycles";
import Prelude "mo:base/Prelude";
import TrieSet "mo:base/TrieSet";
import Buffer "mo:base/Buffer";

shared(msg) actor class Market(owner_: Principal, wicp_: Principal, ledgerProxy_: Principal) = this {
    
    type TxReceipt = Result.Result<Nat, {
        #InsufficientBalance;
        #InsufficientAllowance;
    }>;

    type Res = {
        #CreateSell: Nat;    // Nat: sellIndex
        #UpdateSellDiscount;
        #CancelSell;
        #CreateBuy: Nat;     // Nat: buyIndex
        #Claim;
    };

    type UpdateReceipt = Result.Result<Res, Text>;

    type TokenActor = actor {
        allowance: shared (owner: Principal, spender: Principal) -> async Nat;
        approve: shared (spender: Principal, value: Nat) -> async TxReceipt;
        balanceOf: (owner: Principal) -> async Nat;
        decimals: () -> async Nat8;
        name: () -> async Text;
        symbol: () -> async Text;
        totalSupply: () -> async Nat;
        transfer: shared (to: Principal, value: Nat) -> async TxReceipt;
        transferFrom: shared (from: Principal, to: Principal, value: Nat) -> async TxReceipt;
    };

    type LedgerProxy = actor {
        block_pb: (block_height: Nat64) -> async Block;
    };

    type OrderStatus = {
        #cancelled;
        #filled;
        #open;
        #expired;
    };
    
    type SellOrder = {
        id: Nat;
        owner: Principal;
        accountId: Text;
        amount: Nat; // amount of WICP to sell
        var amountRemain: Nat; // unfilled amount of this order
        var amountPending: Nat; // amount locked in pending buy orders
        var discount: Nat; // discount ratio, discount / 1e6
        var status: OrderStatus;
        createAt: Int;
    };

    type BuyOrder = {
        id: Nat;
        orderId: Nat; // sell order id
        seller: Principal;
        accountId: Text; // sell order's ICP receiving account
        buyer: Principal;
        amount: Nat;
        discount: Nat;
        amountICP: Nat; // = amount * discount
        createAt: Int;
        expireAt: Int;
        var status: OrderStatus; // only #open and #filled and #expired for buy orders
    };

    type SellOrderExt = {
        id: Nat;
        owner: Principal;
        accountId: Text;
        amount: Nat; // amount of WICP to sell
        amountRemain: Nat; // unfilled amount of this order
        amountPending: Nat; // amount locked for pending buys
        discount: Nat; // discount ratio, discount / 1e6
        status: OrderStatus;
        createAt: Int;
    };

    type BuyOrderExt = {
        id: Nat;
        orderId: Nat; // sell order id
        seller: Principal;
        accountId: Text; // sell order's ICP receiving account
        buyer: Principal;
        amount: Nat;
        discount: Nat;
        amountICP: Nat; // = amount * discount
        createAt: Int;
        expireAt: Int;
        status: OrderStatus; // only #open and #filled and #expired for buy orders
    };

    type UserOrders = {
        buys: [BuyOrderExt];
        sells: [SellOrderExt];
    };

    // Ledger types
    type TimeStamp = {
        timestamp_nanos: Nat64;
    };

    type HashOf = {
        inner : [Nat8];
    };

    type ICPTs = {
        e8s: Nat64;
    };

    type Transfer = {
        #Burn: { from: Text; amount: ICPTs; };
        #Mint: { to: Text; amount: ICPTs; };
        #Send: { to: Text; fee: ICPTs; from: Text; amount: ICPTs; };
    };

    type Transaction = {
        memo: Nat64;
        created_at_time : TimeStamp;
        transfer : Transfer;
    };

    type Block = {
        transaction : Transaction;
        timestamp : TimeStamp;
        parent_hash : ?HashOf;
    };

    private stable var _1e6 = 1_000_000;
    private stable var maxBuyAmount = 5; // max pending buy orders
    private stable var owner: Principal = owner_;
    private stable var wicp: TokenActor = actor(Principal.toText(wicp_));
    private stable var ledgerProxy: LedgerProxy = actor(Principal.toText(ledgerProxy_));
    private stable var expireDuration: Int = 900_000_000_000; // 15 mins
    private stable var fee: Nat = 100_0000; // 0.01 WICP fee for each sell order
    // states
    private stable var sellIndex: Nat = 0;
    private stable var buyIndex: Nat = 0;
    private var sellOrders = HashMap.HashMap<Nat, SellOrder>(0, Nat.equal, Hash.hash);
    private var buyOrders = HashMap.HashMap<Nat, BuyOrder>(0, Nat.equal, Hash.hash);
    // user pending buy orders
    private var buyAmounts = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
    private stable var openSellOrders: TrieSet.Set<Nat> = TrieSet.empty();
    private stable var openBuyOrders: TrieSet.Set<Nat> = TrieSet.empty();
    private stable var blocks: TrieSet.Set<Nat64> = TrieSet.empty();
    // for upgrade
    private stable var sellOrderEntries: [(Nat, SellOrder)] = [];
    private stable var buyOrderEntries: [(Nat, BuyOrder)] = [];
    private stable var buyAmountsEntries: [(Principal, Nat)] = [];

    private func _sellOrderToExt(s: SellOrder) : SellOrderExt {
        {
            id = s.id;
            owner = s.owner;
            accountId = s.accountId;
            amount = s.amount;
            amountRemain = s.amountRemain;
            amountPending = s.amountPending;
            discount = s.discount;
            status = s.status;
            createAt = s.createAt;
        }
    };

    private func _buyOrderToExt(b: BuyOrder) : BuyOrderExt {
        {
            id = b.id;
            orderId = b.orderId;
            seller = b.seller;
            accountId = b.accountId;
            buyer = b.buyer;
            amount = b.amount;
            discount = b.discount;
            amountICP = b.amountICP;
            createAt = b.createAt;
            expireAt = b.expireAt;
            status = b.status;
        }
    };

    private func _unwrap<T>(x : ?T) : T =
    switch x {
      case null { Prelude.unreachable() };
      case (?x_) { x_ };
    };

    // create a new WICP sell order
    public shared(msg) func createOrder(
        accountId: Text,
        amount: Nat,
        discount: Nat
    ): async UpdateReceipt {
        if (amount <= fee) {
            return #err("createOrder in [WICP Market]: amount should bigger the fee");
        };
        switch(await wicp.transferFrom(msg.caller, Principal.fromActor(this), amount)) {
            case(#ok(id)) { };
            case(#err(e)) { return #err("createOrder in [WICP Market]: wicp transferFrom error."); };
        };
        let _sellIndex = sellIndex;
        let order: SellOrder = {
            id = _sellIndex;
            owner = msg.caller;
            accountId = accountId;
            amount = amount - fee;
            var amountRemain = amount - fee;
            var amountPending = 0;
            var discount = discount;
            var status = #open;
            createAt = Time.now();
        };
        sellOrders.put(_sellIndex, order);
        openSellOrders := TrieSet.put(openSellOrders, _sellIndex, Hash.hash(_sellIndex), Nat.equal);
        sellIndex += 1;
        return #ok(#CreateSell(_sellIndex));
    };

    // update order discount
    public shared(msg) func updateDiscount(oid: Nat, newDiscount: Nat): async UpdateReceipt {
        if (Option.isNull(sellOrders.get(oid))) {
            return #err("updateDiscount in [WICP Market]: not find the oid in sellOrders");
        };
        var o = _unwrap(sellOrders.get(oid));
        if (o.owner != msg.caller) {
            return #err("updateDiscount in [WICP Market]: only the sellOrder's owner can update its discount.");
        };
        if (o.status != #open) {
            return #err("updateDiscount in [WICP Market]: the sellOrder is not in open.");
        };
        o.discount := newDiscount;
        sellOrders.put(o.id, o);
        return #ok(#UpdateSellDiscount);
    };

    // cancel order
    public shared(msg) func cancelOrder(oid: Nat): async UpdateReceipt {
        if (Option.isNull(sellOrders.get(oid))) {
            return #err("cancelOrder in [WICP Market]: not find the oid in sellOrders");
        };
        var o = _unwrap(sellOrders.get(oid));
        if (o.owner != msg.caller) {
            return #err("cancelOrder in [WICP Market]: only the sellOrder's owner can cancel order.");
        };
        if (o.status != #open) {
            return #err("cancelOrder in [WICP Market]: the sellOrder is not in open.");
        };      
        // must not have pending buys
        if (o.amountPending != 0) {
            return #err("cancelOrder in [WICP Market]: the amountPending is not 0.");
        };
        if (o.amountRemain <= 0) {
            return #err("cancelOrder in [WICP Market]: the amountRemain is <= 0.");
        };        
        // transfer amountRemain back to the seller
        switch(await wicp.transfer(msg.caller, o.amountRemain)) {
            case(#ok(id)) { };
            case(#err(e)) { return #err("cancelOrder in [WICP Market]: wicp transfer error."); };
        };
        o.status := #cancelled;
        sellOrders.put(oid, o);
        openSellOrders := TrieSet.delete(openSellOrders, oid, Hash.hash(oid), Nat.equal);
        return #ok(#CancelSell);
    };

    // buy WICP
    public shared(msg) func buy(orderId: Nat, amount: Nat): async UpdateReceipt {
        if (Option.isNull(sellOrders.get(orderId))) {
            return #err("buy in [WICP Market]: not find the oid in sellOrders");
        };        
        var o = _unwrap(sellOrders.get(orderId));
        if (o.status != #open) {
            return #err("buy in [WICP Market]: the sellOrder is not in open.");
        };  
        // amountRemain - amountPending >= amount
        if (o.amountRemain < o.amountPending + amount) {
            return #err("buy in [WICP Market]: the amount should be smaller or equal to amountRemain sub amountPending.");
        };
        let buyAmount = switch (buyAmounts.get(msg.caller)) {
            case (?amount) { amount; };
            case (_) { 0; };
        };
        if (buyAmount > maxBuyAmount) {
            return #err("buy in [WICP Market]: msg.caller has too many buy order amount.");
        };                   
        o.amountPending += amount;
        let pendingBuy: BuyOrder = {
            id = buyIndex;
            orderId = o.id;
            seller = o.owner;
            accountId = o.accountId;
            buyer = msg.caller;
            amount = amount;
            discount = o.discount;
            amountICP = amount * o.discount / _1e6; // = amount * discount
            createAt = Time.now();
            expireAt = Time.now() + expireDuration;
            var status = #open;
        };
        sellOrders.put(orderId, o);
        buyOrders.put(buyIndex, pendingBuy);
        openBuyOrders := TrieSet.put(openBuyOrders, buyIndex, Hash.hash(buyIndex), Nat.equal);
        buyAmounts.put(msg.caller, buyAmount + 1);
        buyIndex += 1;
        return #ok(#CreateBuy(pendingBuy.id));
    };

    private func _blockExist(block: Nat64): Bool {
        TrieSet.mem(blocks, block, Hash.hash(Nat64.toNat(block)), Nat64.equal)
    };

    // claim WICP after send ICP to the seller
    public shared(msg) func claim(buyId: Nat, blockHeight: Nat64): async UpdateReceipt {
        // verify: 
        // blockHeight not used &
        // ICP sender is the buyer & 
        // ICP receiver is the provided accountId &
        // ICP tx timestamp > order timestamp & 
        // ICP amount == amountICP &
        // caller is the buyer.
        if (Option.isNull(buyOrders.get(buyId))) {
            return #err("claim in [WICP Market]: not find the buyId in buyOrders");
        }; 
        if (_blockExist(blockHeight)) {
            return #err("claim in [WICP Market]: the blockHeight was used.");
        }; 
        blocks := TrieSet.put(blocks, blockHeight, Hash.hash(Nat64.toNat(blockHeight)), Nat64.equal);
        let block: Block = await ledgerProxy.block_pb(blockHeight);
        let pendingBuy = _unwrap(buyOrders.get(buyId));

        if (Nat64.toNat(block.timestamp.timestamp_nanos) <= Int.abs(pendingBuy.createAt)) {
            blocks := TrieSet.delete(blocks, blockHeight, Hash.hash(Nat64.toNat(blockHeight)), Nat64.equal);
            return #err("claim in [WICP Market]: the blockHeight was used.");
        };
        let tx = switch(block.transaction.transfer) {
            case(#Send(tx)) { tx };
            case(_) { 
                blocks := TrieSet.delete(blocks, blockHeight, Hash.hash(Nat64.toNat(blockHeight)), Nat64.equal);
                return #err("claim in [WICP Market]: tx in block is not Send type."); 
            };
        };
        if (msg.caller != pendingBuy.buyer) {
            blocks := TrieSet.delete(blocks, blockHeight, Hash.hash(Nat64.toNat(blockHeight)), Nat64.equal);
            return #err("claim in [WICP Market]: only order's buyer can claim.");
        };
        if (tx.to != pendingBuy.accountId or tx.from != Utils.principalToAccount(pendingBuy.buyer, null) or Nat64.toNat(tx.amount.e8s) != pendingBuy.amountICP) {
            blocks := TrieSet.delete(blocks, blockHeight, Hash.hash(Nat64.toNat(blockHeight)), Nat64.equal);
            return #err("claim in [WICP Market]: tx does not matched.");
        };
        switch(await wicp.transfer(msg.caller, pendingBuy.amount)) {
            case(#ok(id)) { };
            case(#err(e)) { 
                blocks := TrieSet.delete(blocks, blockHeight, Hash.hash(Nat64.toNat(blockHeight)), Nat64.equal);                
                return #err("claim in [WICP Market]: wicp does not matched.");
            };
        };
        pendingBuy.status := #filled;
        buyOrders.put(buyId, pendingBuy);
        openBuyOrders := TrieSet.delete(openBuyOrders, buyId, Hash.hash(buyId), Nat.equal);
        let buyAmount = switch (buyAmounts.get(pendingBuy.buyer)) {
            case (?amount) { amount; };
            case (_) { 0; };
        };
        if (buyAmount <= 1) {
            buyAmounts.delete(pendingBuy.buyer);
        } else {
            buyAmounts.put(pendingBuy.buyer, buyAmount - 1);
        };
        // update order info, check if the sell order is filled, if yes, remove it from openOrders
        var o = _unwrap(sellOrders.get(pendingBuy.orderId));
        o.amountPending -= pendingBuy.amount;
        o.amountRemain -= pendingBuy.amount;
        if(o.amountPending == 0 and o.amountRemain == 0) {
            o.status := #filled;
            openSellOrders := TrieSet.delete(openSellOrders, o.id, Hash.hash(o.id), Nat.equal);    
        };
        sellOrders.put(o.id, o);
        return #ok(#Claim);
    };

    // remove expired pending buy orders
    public func clearExpired() {
        for (bo in Array.vals(TrieSet.toArray(openBuyOrders))) {
            let buy = _unwrap(buyOrders.get(bo));
            if(Time.now() > buy.expireAt) {
                var o = _unwrap(sellOrders.get(buy.orderId));
                o.amountPending -= buy.amount;
                sellOrders.put(o.id, o);
                buy.status := #expired;
                buyOrders.put(bo, buy);
                openBuyOrders := TrieSet.delete(openBuyOrders, bo, Hash.hash(bo), Nat.equal);
                let buyAmount = switch (buyAmounts.get(buy.buyer)) {
                    case (?amount) { amount; };
                    case (_) { 0; };
                };
                if (buyAmount <= 1) {
                    buyAmounts.delete(buy.buyer);
                } else {
                    buyAmounts.put(buy.buyer, buyAmount - 1);
                };
            };
        };
    };

    // public query functions
    public query func getOpenSellOrders(): async [SellOrderExt] {
        Array.map(TrieSet.toArray(openSellOrders), func (i: Nat) : SellOrderExt {
            _sellOrderToExt(_unwrap(sellOrders.get(i)));
        });
    };

    public query func getUserOpenOrders(user: Principal): async UserOrders {
        let buys : Buffer.Buffer<BuyOrderExt> = Buffer.Buffer(TrieSet.size(openBuyOrders));

        for (bo in Array.vals(TrieSet.toArray(openBuyOrders))) {
            let order = _unwrap(buyOrders.get(bo));
            if (order.buyer == user) {
                buys.add(_buyOrderToExt(order));
            };
        };
        let sells : Buffer.Buffer<SellOrderExt> = Buffer.Buffer(TrieSet.size(openSellOrders));
        for (so in Array.vals(TrieSet.toArray(openSellOrders))) {
            let order = _unwrap(sellOrders.get(so));
            if (order.owner == user) {
               sells.add(_sellOrderToExt(order));
            };
        };
        { sells = sells.toArray(); buys = buys.toArray(); }
    };

    public query func getUserHistoryOrders(user: Principal): async UserOrders {
        let buys : Buffer.Buffer<BuyOrderExt> = Buffer.Buffer(buyOrders.size());
        
        for ((_, order) in buyOrders.entries()) {
            if (order.status != #open and order.buyer == user) {
               buys.add(_buyOrderToExt(order));
            };
        };
        let sells : Buffer.Buffer<SellOrderExt> = Buffer.Buffer(sellOrders.size());
        for ((_, order) in sellOrders.entries()) {
            if (order.status != #open and order.owner == user) {
               sells.add(_sellOrderToExt(order));
            };
        };
        { sells = sells.toArray(); buys = buys.toArray(); }
    };

    public query func getSellOrder(oid: Nat): async SellOrderExt {
        switch (sellOrders.get(oid)) {
            case (?order) {
                return _sellOrderToExt(order);
            };
            case _ {
                throw Error.reject("order not found")
            }
        }
    };

    public query func getBuyOrder(oid: Nat): async BuyOrderExt {
        switch (buyOrders.get(oid)) {
            case (?order) {
                return _buyOrderToExt(order);
            };
            case _ {
                throw Error.reject("order not found")
            }
        }
    };

    // upgrade functions
    system func preupgrade() {
        sellOrderEntries := Iter.toArray(sellOrders.entries());
        buyOrderEntries := Iter.toArray(buyOrders.entries());
        buyAmountsEntries := Iter.toArray(buyAmounts.entries());
    };

    system func postupgrade() {
        sellOrders := HashMap.fromIter<Nat, SellOrder>(sellOrderEntries.vals(), 1, Nat.equal, Hash.hash);
        buyOrders := HashMap.fromIter<Nat, BuyOrder>(buyOrderEntries.vals(), 1, Nat.equal, Hash.hash);
        buyAmounts := HashMap.fromIter<Principal, Nat>(buyAmountsEntries.vals(), 1, Principal.equal, Principal.hash);
        sellOrderEntries := [];
        buyOrderEntries := [];
        buyAmountsEntries := [];
    };
}