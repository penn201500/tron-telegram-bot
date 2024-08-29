const axios = require("axios")

function getHelpMessage() {
    return `
Available Commands:
/generate - Generate a new Tron wallet (address, private key, and mnemonic)
/transfer - Transfer TRX to another address. Usage: /transfer <from_address> <to_address> <amount>
/balance - Check the TRX balance of an address. Usage: /balance <address>
/info - Get the current TRX price in USD, EUR, and BTC. Usage: /info
/help - Show this help message
    `;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchTransactionInfoFromTronGrid(txid, retries = 3, delay = 10000) {
    const tronGridEndpoint = `${process.env.TRONSCAN_QUERY_API}${txid}`

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(tronGridEndpoint, {
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY,
                },
            })

            if (response.status !== 200 || !response.data || !response.data.contractRet) {
                throw new Error("No valid transaction info found on TronGrid")
            }

            console.log(`Transaction info fetched successfully on attempt ${attempt}`)
            return response.data
        } catch (error) {
            console.error(`Attempt ${attempt} - Error fetching transaction info: ${error.message}`)
            if (attempt < retries) {
                console.log(`Retrying in ${delay / 1000} seconds...`)
                await sleep(delay)
            } else {
                throw new Error("Failed to fetch transaction details from TronGrid after multiple attempts.")
            }
        }
    }
}

function calculateGasFee(cost) {
    const netFee = cost.net_fee || 0
    const memoFee = cost.memoFee || 0
    const accountCreateFee = cost.account_create_fee || 0
    const multiSignFee = cost.multi_sign_fee || 0

    const totalFee = netFee + memoFee + accountCreateFee + multiSignFee
    return totalFee
}

async function estimateTransactionFee(tronWeb, from, to, amount) {
    try {
        const transaction = await tronWeb.transactionBuilder.sendTrx(to, amount, from)
        const unsignedTransaction = await tronWeb.trx.sign(transaction, process.env.FROM_ADDRESS_PRIVATE_KEY)
        const broadcastResult = await tronWeb.trx.broadcast(unsignedTransaction)
        if (!broadcastResult || !broadcastResult.result) {
            throw new Error(`Failed to broadcast transaction. Response: ${JSON.stringify(broadcastResult)}`)
        }

        const { txid } = broadcastResult
        if (!txid) {
            throw new Error("Failed to retrieve transaction hash (txid) from broadcast result.")
        }

        await sleep(5000)

        const receipt = await fetchTransactionInfoFromTronGrid(txid)
        if (!receipt || !receipt.cost) {
            throw new Error(`Failed to fetch valid transaction info for txid ${txid}.`)
        }

        const gasFee = calculateGasFee(receipt.cost)
        return { gasFee, transactionHash: txid }
    } catch (error) {
        throw new Error(`Failed to estimate transaction fee: ${error.message}`)
    }
}

module.exports = { getHelpMessage, sleep, fetchTransactionInfoFromTronGrid, calculateGasFee, estimateTransactionFee }
