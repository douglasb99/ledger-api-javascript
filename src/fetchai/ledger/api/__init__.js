import * as semver from "semver";
import {__compatible__} from "../__init__";
import {ApiError} from '../errors/apiError'
import {ContractsApi} from "./contracts";
import {IncompatibleLedgerVersionError} from "../errors";
import {RunTimeError} from '../errors/runTimeError'
import {ServerApi} from "./server";
import {TokenApi} from './token'
import {TransactionApi} from "./tx";

export class LedgerApi {

    //TODO add third param , network = false
    constructor(host = false, port = false) {
        this.tokens = new TokenApi(host, port)
        this.contracts = new ContractsApi(host, port)
        this.tx = new TransactionApi(host, port)
    }


    /*
	* this does not block event loop, but waits sync for return of executed
	* digest using a timeout, wrapped in a promise that resolves when we get executed status in response, or
    * rejects if timeouts.
    *
    * timeout paramater has units seconds
	 */
    async sync(txs, timeout = false) {
        const limit = (timeout === false) ? 120000 : timeout * 1000
        if (!Array.isArray(txs) || !txs.length) {
            throw new TypeError('Unknown argument type')
        }
        const asyncTimerPromise = new Promise((resolve) => {
            const start = Date.now()
            let loop = async () => {
                if (txs.length === 0) return resolve(true)
                let res
                for (let i = 0; i < txs.length; i++) {
                    try {
                        res = await this._poll(txs[i].txs[0])
                    } catch (e) {
                        if (!(e instanceof ApiError)) {
                            throw e
                        }
                    }
                    // we expect failed requests to return null, or throw an ApiError
                    if (res === true) {
                        txs.splice(i, 1)
                        i--
                    }
                }
                let elapsed_time = Date.now() - start

                if (elapsed_time >= limit) {
                    throw new RunTimeError('Timeout exceeded waiting for txs')
                }
                setTimeout(loop, 100)
            }
            loop()
        })
        return asyncTimerPromise
    }

    async _poll(digest) {
        let status = await this.tx.status(digest)

        if (/Executed|Submitted/.test(status)) {
            console.log("EXECUTED")
        }

        return /Executed|Submitted/.test(status)
    }

    static async from_network_name(host, port) {
        const server = new ServerApi(host, port)
        const server_version = await server.version();
        if (!semver.satisfies(semver.coerce(server_version), __compatible__.join(' '))) {
            throw new IncompatibleLedgerVersionError(`Ledger version running on server is not compatible with this API  \n
                                                 Server version: ${server_version} \nExpected version: ${__compatible__.join(',')}`)
        }
        return true;
    }
}
