import {randomBytes} from 'crypto'
import * as secp256k1 from 'secp256k1'
import {ValidationError} from '../errors'
import {Identity} from './identity';
import * as  fs from 'fs';

/**
 * An entity is a full private/public key pair.
 *
 * @public
 * @class
 */
export class Entity extends Identity {

    constructor(private_key_bytes) {

        // construct or generate the private key if one is not specified
        if (private_key_bytes) {
            if (secp256k1.privateKeyVerify(private_key_bytes)) {
                const pubKey = new Buffer(secp256k1.publicKeyCreate(private_key_bytes, false).toString('hex').substring(2), 'hex')
                super(pubKey);
                this.pubKey = pubKey;
                this.privKey = private_key_bytes;

            } else {
                throw new ValidationError(
                    'Unable to load private key from input'
                )
            }
        } else {
            let privKey;
            let pubKey;
            do {
                privKey = randomBytes(32);
                pubKey = new Buffer(secp256k1.publicKeyCreate(privKey, false).toString('hex').substring(2), 'hex');
            } while (!secp256k1.privateKeyVerify(privKey))
            super(pubKey);
            this.pubKey = pubKey;
            this.privKey = privKey;
        }
    };

    // get the public key in a uncompressed format
    public_key() {
        return this.pubKey;
    }

    private_key() {
        return this.privKey
    };

    private_key_hex() {
        return this.privKey.toString('hex');
    };


    public_key_hex() {
        return this.pubKey.toString('hex')
    }

    // sign the message. returns sign obj
    sign(extMsgHash) {
        return secp256k1.sign(extMsgHash, this.privKey)
    }

    signature_hex(sigObj) {
        return sigObj.signature.toString('hex')
    }

    _to_json_object() {
        const base64 = this.privKey.toString('base64');
        return JSON.parse(`{"privateKey": "${base64}"}`);
    }

    static from_base64(private_key_base64) {
        const private_key_bytes = Buffer.from(private_key_base64, 'base64');
        return new Entity(private_key_bytes);
    }

    static _from_json_object(obj) {
        const json = JSON.stringify(obj);
        return Entity.from_base64(obj.privateKey);
    }

    static from_hex(private_key_hex) {
        const private_key_bytes = Buffer.from(private_key_hex, 'hex');
        return new Entity(private_key_bytes);
    }

    static loads(s) {
        const obj = JSON.parse(s);
        return Entity._from_json_object(obj);
    }

    static load(fp) {
        const obj = JSON.parse(fs.readFileSync(fp, 'utf8'));
        return Entity._from_json_object(obj);
    }
}
