require("dotenv").config()
const TronWeb = require("tronweb")
const axios = require("axios")
const { sleep } = require("../utils")

const tronWeb = new TronWeb({
    fullHost: process.env.TRON_FULL_HOST,
    headers: { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY },
})

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

// New estimate transaction fee function
async function estimateTransactionFee(tronWeb, from, to, amount) {
    try {
        // Build the transaction
        const transaction = await tronWeb.transactionBuilder.sendTrx(to, amount, from)
        // Sign the transaction
        const unsignedTransaction = await tronWeb.trx.sign(transaction, process.env.FROM_ADDRESS_PRIVATE_KEY)
        // Broadcast the transaction
        const broadcastResult = await tronWeb.trx.broadcast(unsignedTransaction)
        if (!broadcastResult || !broadcastResult.result) {
            throw new Error(`Failed to broadcast transaction. Response: ${JSON.stringify(broadcastResult)}`)
        }

        const { txid } = broadcastResult
        if (!txid) {
            throw new Error("Failed to retrieve transaction hash (txid) from broadcast result.")
        }

        // Wait for the transaction info to be available
        await sleep(5000)

        // Fetch the transaction receipt from TronGrid
        const receipt = await fetchTransactionInfoFromTronGrid(txid)
        if (!receipt || !receipt.cost) {
            throw new Error(`Failed to fetch valid transaction info for txid ${txid}.`)
        }

        // Calculate the gas fee
        const gasFee = calculateGasFee(receipt.cost)
        return { gasFee, transactionHash: txid }
    } catch (error) {
        throw new Error(`Failed to estimate transaction fee: ${error.message}`)
    }
}

module.exports = (bot, pendingTransfers) => {
    // Handle /transfer command
    bot.onText(/\/transfer/, async msg => {
        const chatId = msg.chat.id
        const args = msg.text.trim().split(" ")

        if (args.length !== 4 || isNaN(args[3])) {
            bot.sendMessage(chatId, "Invalid /transfer command format. Usage: /transfer <from_address> <to_address> <amount>")
            return
        }

        const fromAddress = args[1]
        const toAddress = args[2]
        const amount = parseFloat(args[3])

        if (amount <= 0) {
            bot.sendMessage(chatId, "The transfer amount must be greater than 0.")
            return
        }

        const privateKey = process.env.FROM_ADDRESS_PRIVATE_KEY

        try {
            // Estimate the transaction fee by simulating a transaction
            const { gasFee, transactionHash } = await estimateTransactionFee(tronWeb, fromAddress, toAddress, tronWeb.toSun(amount))
            const gasFeeInTRX = parseFloat(tronWeb.fromSun(gasFee))
            // Check the balance and other conditions
            const balanceInSun = await tronWeb.trx.getBalance(fromAddress)
            const balanceInTRX = parseFloat(tronWeb.fromSun(balanceInSun))

            if (balanceInTRX < amount + gasFeeInTRX) {
                bot.sendMessage(chatId, `Insufficient balance. You need at least ${(amount + gasFeeInTRX).toFixed(6)} TRX to complete this transfer.`)
                return
            }

            pendingTransfers[chatId] = {
                fromAddress,
                toAddress,
                amount,
                gasFee: gasFeeInTRX,
                transactionHash,
                privateKey,
            }

            bot.sendMessage(chatId, `You are about to send ${amount.toFixed(6)} TRX from ${fromAddress} to ${toAddress}.\nEstimated Gas Fee: ${gasFeeInTRX.toFixed(6)} TRX\nTotal Estimated Cost: ${(amount + gasFeeInTRX).toFixed(6)} TRX.\n\nReply with "Yes" or "No" to confirm.`)
        } catch (err) {
            console.error("Error estimating transfer:", err)
            bot.sendMessage(chatId, `Failed to estimate the transfer. Reason: ${err.message}`)
        }
    })
}

module.exports.confirmTransfer = async (bot, chatId, pendingTransfers) => {
    if (pendingTransfers[chatId]) {
        try {
            const { transactionHash, privateKey } = pendingTransfers[chatId]

            // Check the result and send the receipt information to the user
            const receipt = await fetchTransactionInfoFromTronGrid(transactionHash)

            if (receipt) {
                const gasFee = calculateGasFee(receipt.cost)
                const actualGasFeeInTRX = tronWeb.fromSun(gasFee)

                bot.sendMessage(chatId, `Transfer successful!\nTransaction Hash: ${transactionHash}\nActual Gas Fee: ${actualGasFeeInTRX} TRX\n`)
            } else {
                bot.sendMessage(chatId, "Transfer successful but unable to retrieve fee information.")
            }
        } catch (err) {
            console.error("Error processing transfer:", err)
            bot.sendMessage(chatId, `Failed to complete the transfer. Reason: ${err.message}`)
        } finally {
            delete pendingTransfers[chatId]
        }
    } else {
        bot.sendMessage(chatId, "No pending transfers to confirm.")
    }
}
