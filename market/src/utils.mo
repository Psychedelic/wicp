/// Utils module for Account Identifier and Principal
import Array "mo:base/Array";
import Principal "mo:base/Principal";
import Char "mo:base/Char";
import Blob "mo:base/Blob";
import Nat8 "mo:base/Nat8";
import SHA224 "./sha224";
import CRC32 "./crc32";
import Text "mo:base/Text";

module {
    private let symbols = [
        '0', '1', '2', '3', '4', '5', '6', '7',
        '8', '9', 'a', 'b', 'c', 'd', 'e', 'f',
    ];
    private let base : Nat8 = 0x10;

    /// Account Identitier type.   
    public type AccountIdentifier = {
        hash: [Nat8];
    };

    /// Convert bytes array to hex string.       
    /// E.g `[255,255]` to "ffff"
    public func encode(array : [Nat8]) : Text {
        Array.foldLeft<Nat8, Text>(array, "", func (accum, u8) {
            accum # nat8ToText(u8);
        });
    };

    /// Convert a byte to hex string.
    /// E.g `255` to "ff"
    func nat8ToText(u8: Nat8) : Text {
        let c1 = symbols[Nat8.toNat((u8/base))];
        let c2 = symbols[Nat8.toNat((u8%base))];
        return Char.toText(c1) # Char.toText(c2);
    };

    /// Return the account identifier's Text of the Principal.
    public func principalToAccount(p : Principal, sa : ?[Nat8]) : Text {
        let digest = SHA224.Digest();
        digest.write([10, 97, 99, 99, 111, 117, 110, 116, 45, 105, 100]:[Nat8]); // b"\x0Aaccount-id"
        let blob = Principal.toBlob(p);
        digest.write(Blob.toArray(blob));
        let _sa = switch (sa) {
            case (?v) { v; };
            case _ { Array.freeze<Nat8>(Array.init<Nat8>(32, 0 : Nat8)); };
        };
        digest.write(_sa); // sub account
        let hash_bytes = digest.sum();
        
        let a: AccountIdentifier = {hash=hash_bytes;};
        let crc = CRC32.crc32(a.hash);
        let aid_bytes = Array.append<Nat8>(crc, a.hash);
        return encode(aid_bytes);
    };
};