import {Transaction} from "../../../fetchai/ledger/transaction";
import {BitVector} from "../../../fetchai/ledger/bitvector";
import {Entity} from "../../../fetchai/ledger/crypto/entity";
import {Identity} from "../../../fetchai/ledger/crypto/identity";
import {encode_transaction, decode_transaction} from "../../../fetchai/ledger/serialization/transaction.js";
import * as bytearray from '../../../fetchai/ledger/serialization/bytearray'
import {createHash} from 'crypto'
import {ValidationError} from "../../../fetchai/ledger/errors";
import  {BN} from "bn.js";

const _PRIVATE_KEYS = [
    '1411d53f88e736eac7872430dbe5b55ac28c17a3e648c388e0bd1b161ab04427',
    '3436c184890d498b25bc2b5cb0afb6bad67379ebd778eae1de40b6e0f0763825',
    '4a56a19355f934174f6388b3c80598abb151af79c23d5a7af45a13357fb71253',
    'f9d67ec139eb7a1cb1f627357995847392035c1e633e8530de5ab5d04c6e9c33',
    '80f0e1c69e5f1216f32647c20d744c358e0894ebc855998159017a5acda208ba',
];

const [ENTITIES, IDENTITIES] = function () {
    const ENTITIES = [];
    const IDENTITIES = [];
    let pk;
    for (let i = 0; i < _PRIVATE_KEYS.length; i++) {
        ENTITIES.push(Entity.from_hex(_PRIVATE_KEYS[i]));
        pk = ENTITIES[i].public_key();
        IDENTITIES.push(new Identity(pk));
    }

    return [ENTITIES, IDENTITIES];
}()

const _calculate_integer_stream_size = (len) => {
    if (len < 0x80) {
        return 1;
    } else if (len < 0x100) {
        return 2;
    } else if (len < 0x1000) {
        return 4;
    } else {
        return 8;
    }
}

const EXPECTED_SIGNATURE_BYTE_LEN = 64;
const EXPECTED_SIGNATURE_LENGTH_FIELD_LEN = _calculate_integer_stream_size(EXPECTED_SIGNATURE_BYTE_LEN);
const EXPECTED_SERIAL_SIGNATURE_LENGTH = EXPECTED_SIGNATURE_BYTE_LEN + EXPECTED_SIGNATURE_LENGTH_FIELD_LEN;

describe(':Transaction', () => {

    test('test simple decode transaction ', () => {

        const EXPECTED_PAYLOAD = "a12400532398dd883d1990f7dad3fde6a53a53347afc2680a04748f7f15ad03cadc4d44235130ac5aab442e39f9aa27118956695229212dd2f1ab5b714e9f6bd581511c101000000000418c2a33af8bd2cba7fa714a840a308a217aa4483880b1ef14b4fdffe08ab956e3f4b921cec33be7c258cfd7025a2b9a942770e5b17758bcc4961bbdc75a0251c"
        const payload = new Transaction();
        payload.from_address(IDENTITIES[0])
        payload.add_transfer(IDENTITIES[1], new BN(256));
        payload.add_signer(IDENTITIES[0].public_key_hex());
        const transaction_bytes = encode_transaction(payload, [ENTITIES[0]])
        assertIsExpectedTx(payload, transaction_bytes, EXPECTED_PAYLOAD)
        const [success, tx] = decode_transaction(transaction_bytes)
        expect(success).toBe(true)
        assertTxAreEqual(payload, tx)
    })


    test('test multiple transfers ', () => {
        const EXPECTED_PAYLOAD = "a12600532398dd883d1990f7dad3fde6a53a53347afc2680a04748f7f15ad03cadc4d4014235130ac5aab442e39f9aa27118956695229212dd2f1ab5b714e9f6bd581511c1010020f478c7f74b50c187bf9a8836f382bd62977baeeaf19625608e7e912aa60098c10200da2e9c3191e3768d1c59ea43f6318367ed9b21e6974f46a60d0dd8976740af6dc2000186a00000000418c2a33af8bd2cba7fa714a840a308a217aa4483880b1ef14b4fdffe08ab956e3f4b921cec33be7c258cfd7025a2b9a942770e5b17758bcc4961bbdc75a0251c"
        const payload = new Transaction();
        payload.from_address(IDENTITIES[0]);
        payload.add_transfer(IDENTITIES[1], new BN(256));
        payload.add_transfer(IDENTITIES[2], new BN(512));
        payload.add_transfer(IDENTITIES[3], new BN(100000));
        payload.add_signer(IDENTITIES[0].public_key_hex());
        const transaction_bytes = encode_transaction(payload, [ENTITIES[0]])

        assertIsExpectedTx(payload, transaction_bytes, EXPECTED_PAYLOAD);
        const [success, tx] = decode_transaction(transaction_bytes);
        expect(success).toBe(true)
        assertTxAreEqual(payload, tx)

    });
})


/*
* REQUIRES 8 BYTE SUPPORT! Then remove "skip" and get running.
*/

test('test synergetic_data_submission', () => {
    const EXPECTED_PAYLOAD = "a120c0532398dd883d1990f7dad3fde6a53a53347afc2680a04748f7f15ad03cadc4d4c1271001c3000000e8d4a5100080da2e9c3191e3768d1c59ea43f6318367ed9b21e6974f46a60d0dd8976740af6de6672a9d98da667e5dc25b2bca8acf9644a7ac0797f01cb5968abf39de011df204646174610f7b2276616c7565223a20313233347d0418c2a33af8bd2cba7fa714a840a308a217aa4483880b1ef14b4fdffe08ab956e3f4b921cec33be7c258cfd7025a2b9a942770e5b17758bcc4961bbdc75a0251c"
    const payload = new Transaction();
    payload.from_address(IDENTITIES[0]);
    payload.valid_until(10000);
    payload.target_contract(IDENTITIES[3], IDENTITIES[4], new BitVector());
    payload.charge_rate(new BN(1));
    payload.charge_limit(new BN(1000000000000));
    payload.action('data');
    payload.synergetic_data_submission(true);
    payload.data('{"value": 1234}');
    payload.add_signer(IDENTITIES[0].public_key_hex());
    const transaction_bytes = encode_transaction(payload, [ENTITIES[0]])
    assertIsExpectedTx(payload, transaction_bytes, EXPECTED_PAYLOAD);
    // attempt to decode a transaction from the generated bytes
    const [success, tx] = decode_transaction(transaction_bytes);
    expect(success).toBe(true)
    assertTxAreEqual(payload, tx)
});

test('test chain code', () => {
    const EXPECTED_PAYLOAD = "a12080532398dd883d1990f7dad3fde6a53a53347afc2680a04748f7f15ad03cadc4d400c103e8c2000f4240800b666f6f2e6261722e62617a066c61756e636802676f0418c2a33af8bd2cba7fa714a840a308a217aa4483880b1ef14b4fdffe08ab956e3f4b921cec33be7c258cfd7025a2b9a942770e5b17758bcc4961bbdc75a0251c"
    const payload = new Transaction();
    payload.from_address(IDENTITIES[0]);
    payload.add_signer(IDENTITIES[0].public_key_hex());
    payload.charge_rate(new BN(1000));
    payload.charge_limit(new BN(1000000));
    payload.target_chain_code('foo.bar.baz', new BitVector())
    payload.action('launch');
    payload.data('go');

    const transaction_bytes = encode_transaction(payload, [ENTITIES[0]])
    assertIsExpectedTx(payload, transaction_bytes, EXPECTED_PAYLOAD)
    const [success, tx] = decode_transaction(transaction_bytes)
    expect(success).toBe(true)
    debugger;
    assertTxAreEqual(payload, tx)
})

test('test smart contract', () => {
    const EXPECTED_PAYLOAD = "a12040532398dd883d1990f7dad3fde6a53a53347afc2680a04748f7f15ad03cadc4d400c103e8c2000f424080da2e9c3191e3768d1c59ea43f6318367ed9b21e6974f46a60d0dd8976740af6de6672a9d98da667e5dc25b2bca8acf9644a7ac0797f01cb5968abf39de011df2066c61756e636802676f0418c2a33af8bd2cba7fa714a840a308a217aa4483880b1ef14b4fdffe08ab956e3f4b921cec33be7c258cfd7025a2b9a942770e5b17758bcc4961bbdc75a0251c"
    const payload = new Transaction()
    payload.from_address(IDENTITIES[0])
    payload.add_signer(IDENTITIES[0].public_key_hex())
    payload.charge_rate(new BN(1000))
    payload.charge_limit(new BN(1000000))
    payload.target_contract(IDENTITIES[3], IDENTITIES[4], new BitVector())
    payload.action('launch');
    payload.data('go');
    const transaction_bytes = encode_transaction(payload, [ENTITIES[0]])
    assertIsExpectedTx(payload, transaction_bytes, EXPECTED_PAYLOAD)
    const [success, tx] = decode_transaction(transaction_bytes)
    expect(success).toBe(true)
    assertTxAreEqual(payload, tx)
});


test('test validity ranges', () => {
    const EXPECTED_PAYLOAD = "a12700532398dd883d1990f7dad3fde6a53a53347afc2680a04748f7f15ad03cadc4d4024235130ac5aab442e39f9aa27118956695229212dd2f1ab5b714e9f6bd581511c103e820f478c7f74b50c187bf9a8836f382bd62977baeeaf19625608e7e912aa60098c103e8da2e9c3191e3768d1c59ea43f6318367ed9b21e6974f46a60d0dd8976740af6dc103e8e6672a9d98da667e5dc25b2bca8acf9644a7ac0797f01cb5968abf39de011df2c103e864c0c8c103e8c2000f42400418c2a33af8bd2cba7fa714a840a308a217aa4483880b1ef14b4fdffe08ab956e3f4b921cec33be7c258cfd7025a2b9a942770e5b17758bcc4961bbdc75a0251c"
    const payload = new Transaction()
    payload.from_address(IDENTITIES[0])
    payload.add_transfer(IDENTITIES[1], new BN(1000))
    payload.add_transfer(IDENTITIES[2], new BN(1000))
    payload.add_transfer(IDENTITIES[3], new BN(1000))
    payload.add_transfer(IDENTITIES[4], new BN(1000))
    payload.add_signer(IDENTITIES[0].public_key_hex())
    payload.charge_rate(new BN(1000))
    payload.charge_limit(new BN(1000000))
    payload.valid_from(100)
    payload.valid_until(200)
    const transaction_bytes = encode_transaction(payload, [ENTITIES[0]])
    assertIsExpectedTx(payload, transaction_bytes, EXPECTED_PAYLOAD)
    const [success, tx] = decode_transaction(transaction_bytes)
    expect(success).toBe(true)
    assertTxAreEqual(payload, tx)
});

test('test contract with 2bit shard mask', () => {
    const EXPECTED_PAYLOAD = "a12180532398dd883d1990f7dad3fde6a53a53347afc2680a04748f7f15ad03cadc4d464c0c8c103e8c2000f4240010b666f6f2e6261722e62617a066c61756e6368000418c2a33af8bd2cba7fa714a840a308a217aa4483880b1ef14b4fdffe08ab956e3f4b921cec33be7c258cfd7025a2b9a942770e5b17758bcc4961bbdc75a0251c"
    const mask = new BitVector(2)
    mask.set(0, 1)
    const payload = new Transaction()
    payload.from_address(IDENTITIES[0])
    payload.add_signer(IDENTITIES[0].public_key_hex())
    payload.charge_rate(new BN(1000))
    payload.charge_limit(new BN(1000000))
    payload.valid_from(100)
    payload.valid_until(200)
    payload.target_chain_code('foo.bar.baz', mask)
    payload.action('launch');
    const transaction_bytes = encode_transaction(payload, [ENTITIES[0]])
    assertIsExpectedTx(payload, transaction_bytes, EXPECTED_PAYLOAD)
    const [success, tx] = decode_transaction(transaction_bytes)
    expect(success).toBe(true)
    assertTxAreEqual(payload, tx)
});


test('test contract with 4bit shard mask', () => {
    const EXPECTED_PAYLOAD = "a12180532398dd883d1990f7dad3fde6a53a53347afc2680a04748f7f15ad03cadc4d464c0c8c103e8c2000f42401c0b666f6f2e6261722e62617a066c61756e6368000418c2a33af8bd2cba7fa714a840a308a217aa4483880b1ef14b4fdffe08ab956e3f4b921cec33be7c258cfd7025a2b9a942770e5b17758bcc4961bbdc75a0251c"
    const mask = new BitVector(4)
    mask.set(3, 1)
    mask.set(2, 1)
    const payload = new Transaction()
    payload.from_address(IDENTITIES[0])
    payload.add_signer(IDENTITIES[0].public_key_hex())
    payload.charge_rate(new BN(1000))
    payload.charge_limit(new BN(1000000))
    payload.valid_from(100)
    payload.valid_until(200)
    payload.target_chain_code('foo.bar.baz', mask)
    payload.action('launch');
    const transaction_bytes = encode_transaction(payload, [ENTITIES[0]])
    assertIsExpectedTx(payload, transaction_bytes, EXPECTED_PAYLOAD)
    const [success, tx] = decode_transaction(transaction_bytes)
    expect(success).toBe(true)
    assertTxAreEqual(payload, tx)
});


test('test contract with large shard mask', () => {
    const EXPECTED_PAYLOAD = "a12180532398dd883d1990f7dad3fde6a53a53347afc2680a04748f7f15ad03cadc4d464c0c8c103e8c2000f424041eaab0b666f6f2e6261722e62617a066c61756e6368000418c2a33af8bd2cba7fa714a840a308a217aa4483880b1ef14b4fdffe08ab956e3f4b921cec33be7c258cfd7025a2b9a942770e5b17758bcc4961bbdc75a0251c"
    const mask = new BitVector(16)
    mask.set(15, 1)
    mask.set(14, 1)
    mask.set(13, 1)
    mask.set(11, 1)
    mask.set(9, 1)
    mask.set(7, 1)
    mask.set(5, 1)
    mask.set(3, 1)
    mask.set(1, 1)
    mask.set(0, 1)

    const payload = new Transaction()
    payload.from_address(IDENTITIES[0])
    payload.add_signer(IDENTITIES[0].public_key_hex())
    payload.charge_rate(new BN(1000))
    payload.charge_limit(new BN(1000000))
    payload.valid_from(100)
    payload.valid_until(200)
    payload.target_chain_code('foo.bar.baz', mask)
    payload.action('launch');
    const transaction_bytes = encode_transaction(payload, [ENTITIES[0]])
    assertIsExpectedTx(payload, transaction_bytes, EXPECTED_PAYLOAD)
    // attempt to decode a transaction from the generated bytes
    const [success, tx] = decode_transaction(transaction_bytes)
    expect(success).toBe(true)
    assertTxAreEqual(payload, tx)
});


test('test invalid magic', () => {
    const invalid = Buffer.from([0x00])
    expect(() => {
        decode_transaction(invalid);
    }).toThrow(ValidationError)
});

test('test invalid version', () => {
    const invalid = Buffer.from([0xA1, 0xEF, 0xFF])
    expect(() => {
        decode_transaction(invalid);
    }).toThrow(ValidationError)
});

function assertIsExpectedTx(payload, transaction_bytes, expected_hex_payload) {

    const len = Object.keys(payload.signers()).length;
    // a payload needs at least one signee
    expect(len).toBeGreaterThan(0);
    // calculate the serial length of the signatures (so that we can extract the payload)
    const signatures_serial_length = EXPECTED_SERIAL_SIGNATURE_LENGTH * len
    expect(Buffer.byteLength(transaction_bytes)).toBeGreaterThan(signatures_serial_length)
    const expected_payload_end = Buffer.byteLength(transaction_bytes) - signatures_serial_length;
    const payload_bytes = transaction_bytes.slice(0, expected_payload_end);
    expect(expected_hex_payload).toBe(payload_bytes.toString('hex'));

    const payload_bytes_hash = createHash('sha256')
        .update(payload_bytes.toString('hex'), 'utf8')
        .digest()

    // loop through and verify all the signatures
    const buffer = transaction_bytes.slice(expected_payload_end);
    const container = {buffer: buffer};

    let identity;
    for (let signee of Object.keys(payload._signers)) {
        let signature = bytearray.decode(container);
        // validate the signature is correct for the payload
        identity = new Identity(Buffer.from(signee, 'hex'));
        expect(identity.verify(payload_bytes_hash, signature)).toBe(true)
    }
}

function assertTxAreEqual(reference, other) {
    expect(reference).toBeInstanceOf(Transaction);
    expect(other).toBeInstanceOf(Transaction);
    expect(reference.from_address()).toMatchObject(other.from_address());
    expect(reference.transfers()).toMatchObject(other.transfers());
    expect(reference.valid_from()).toBe(other.valid_from());
    expect(reference.valid_from()).toBe(other.valid_from());
	    expect(reference.charge_rate().cmp(other.charge_rate())).toBe(0);
	    expect(reference.charge_limit().cmp(other.charge_limit())).toBe(0);
    if (typeof reference.contract_digest() === 'string') {
        expect(reference.contract_digest()).toBe(other.contract_digest());
    } else {
        expect(reference.contract_digest()).toMatchObject(other.contract_digest());
    }

    if (typeof reference.contract_address() === 'string') {
        expect(reference.contract_address()).toBe(other.contract_address());
    } else {
        expect(reference.contract_address()).toMatchObject(other.contract_address());
    }
    expect(reference.chain_code()).toBe(other.chain_code());
    expect(reference.action()).toBe(other.action());
    expect(reference.shard_mask()).toMatchObject(other.shard_mask());
    expect(reference.data()).toBe(other.data());
    expect(reference.signers()).toMatchObject(other.signers());
}
