import {Address} from '../../fetchai/ledger/crypto/address'
import {createHash} from 'crypto'
import * as bs58 from 'bs58';
import {ValidationError} from "../../fetchai/ledger/errors";

function _calc_digest(address_raw) {
    const hash_func = createHash('sha256');
    hash_func.update(address_raw);
    const digest = hash_func.digest();
    return digest;
}

function _calc_address(address_raw) {
    const digest = _calc_digest(address_raw);
    const bytes = _calc_digest(digest);
    const checksum = bytes.slice(0, 4);
    const buf = Buffer.concat([digest, checksum]);
    const display = bs58.encode(buf);
    return [digest, display];
}

describe(':Address', () => {

    test('test construction from string', () => {
        // generate a random 32 byte buffer
        const digest = _calc_digest(Buffer.from("rand"));
        const bs58_encoded = bs58.encode(digest);
        const [expected_address_bytes, expected_display] = _calc_address(bs58_encoded);
        const address = new Address(expected_display);
        expect(address.toBytes()).toMatchObject(expected_address_bytes);
        expect(address.toString()).toBe(expected_display);
    });

    test('test construction from bytes', () => {
        const digest = _calc_digest(Buffer.from("rand"));
        const bs58_encoded = bs58.encode(digest);
        const [expected_address_bytes,] = _calc_address(bs58_encoded);
        const address = new Address(expected_address_bytes);
        expect(address.toBytes()).toMatchObject(expected_address_bytes);
    });

    test('test construction from address', () => {
        const digest = _calc_digest(Buffer.from("rand"));
        const bs58_encoded = bs58.encode(digest);
        const [expected_address_bytes,] = _calc_address(bs58_encoded);
        const address1 = new Address(expected_address_bytes);
        const address2 = new Address(address1);
        expect(address2.toBytes()).toMatchObject(expected_address_bytes);
    });

    test('test invalid length bytes', () => {
        const digest = _calc_digest(Buffer.from("rand"));
        const invalid_address = Buffer.concat([digest, digest]);
        expect(() => {
            new Address(invalid_address);
        }).toThrow(ValidationError);
    });

    test('test invalid length string', () => {
        const invalid_string = Buffer.from("rand");
        const bs58_encoded = bs58.encode(invalid_string);
        expect(() => {
            new Address(bs58_encoded);
        }).toThrow(ValidationError);
    });

    test('test invalid type', () => {
        expect(() => {
            new Address(99);
        }).toThrow(ValidationError);
    });

    test('test hex display', () => {
        const digest = _calc_digest(Buffer.from("rand"));
        const bs58_encoded = bs58.encode(digest);
        const [expected_address_bytes,] = _calc_address(bs58_encoded);
        const address = new Address(expected_address_bytes);
        const address_bytes = address.toBytes();
        const hex_address = address_bytes.toString('hex');
        const actual = address.toHex();
        expect(actual).toBe(hex_address);
    });

    test('test invalid display', () => {
        const digest = _calc_digest(Buffer.from("rand"));
        const bs58_encoded = bs58.encode(digest);
        const [, expected_display] = _calc_address(bs58_encoded);
        const address = new Address(expected_display);
        const address_bytes = address.toBytes();
        const invalid_checksum = Buffer.from("1134");
        const display = Buffer.concat([address_bytes, invalid_checksum]);
        const bs58invalid = bs58.encode(display);
        expect(() => {
            new Address(Buffer.from(bs58invalid));
        }).toThrow(ValidationError);

    });
})
