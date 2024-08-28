require("dotenv").config()
const TronWeb = require("tronweb")
const axios = require("axios")

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
                await new Promise(resolve => setTimeout(resolve, delay))
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
    return netFee + memoFee + accountCreateFee + multiSignFee
}

module.exports = (bot, pendingTransfers) => {
    // Handle /transfer command
    bot.onText(/\/transfer/, async msg => {
        const chatId = msg.chat.id
        const args = msg.text.trim().split(" ")

        // Ensure the /transfer command has the correct number of arguments
        if (args.length !== 4 || isNaN(args[3])) {
            bot.sendMessage(chatId, "Invalid /transfer command format. Usage: /transfer <from_address> <to_address> <amount>")
            return
        }

        const fromAddress = args[1]
        const toAddress = args[2]
        const amount = parseFloat(args[3])

        // Check if the amount is a positive number
        if (amount <= 0) {
            bot.sendMessage(chatId, "The transfer amount must be greater than 0.")
            return
        }

        const privateKey = process.env.FROM_ADDRESS_PRIVATE_KEY

        try {
            const balanceInSun = await tronWeb.trx.getBalance(fromAddress)
            const balanceInTRX = parseFloat(tronWeb.fromSun(balanceInSun))
            const amountInSun = tronWeb.toSun(amount)

            const transactionObject = await tronWeb.transactionBuilder.sendTrx(toAddress, amountInSun, fromAddress)

            const receiverInfo = await tronWeb.trx.getAccount(toAddress)
            let activationFee = 0
            if (!receiverInfo.address || receiverInfo.address.length === 0) {
                activationFee = 1 // Set account activation fee to 1 TRX if inactive
            }

            const totalCostInTRX = parseFloat(amount) + activationFee

            if (balanceInTRX < totalCostInTRX) {
                bot.sendMessage(chatId, `Insufficient balance. You need at least ${totalCostInTRX.toFixed(6)} TRX to complete this transfer (including activation fees).`)
                return
            }

            pendingTransfers[chatId] = {
                fromAddress,
                toAddress,
                amount,
                activationFee,
                totalCostInTRX,
                transactionObject,
                privateKey,
            }

            bot.sendMessage(chatId, `You are about to send ${amount.toFixed(6)} TRX from ${fromAddress} to ${toAddress}.\nPossible Activation Fee: ${activationFee.toFixed(6)} TRX\nTotal Estimated Cost: ${totalCostInTRX.toFixed(6)} TRX.\n\nReply with "Yes" or "No" to confirm.`)
        } catch (err) {
            console.error("Error estimating transfer:", err)
            bot.sendMessage(chatId, `Failed to estimate the transfer. Reason: ${err.message}`)
        }
    })
}

module.exports.confirmTransfer = async (bot, chatId, pendingTransfers) => {
    if (pendingTransfers[chatId]) {
        try {
            const { transactionObject, privateKey } = pendingTransfers[chatId]
            // Process transaction
            const signedTransaction = await tronWeb.trx.sign(transactionObject, privateKey)
            const receipt = await tronWeb.trx.sendRawTransaction(signedTransaction)

            if (receipt.result) {
                const transactionHash = receipt.txid

                // Retry fetching transaction info from TronGrid up to 5 times
                const transactionInfo = await fetchTransactionInfoFromTronGrid(transactionHash)

                if (transactionInfo) {
                    const gasFee = calculateGasFee(transactionInfo.cost)
                    const actualGasFeeInTRX = tronWeb.fromSun(gasFee)

                    bot.sendMessage(chatId, `Transfer successful!\nTransaction Hash: ${transactionHash}\nActual Gas Fee: ${actualGasFeeInTRX} TRX\n`)
                } else {
                    bot.sendMessage(chatId, "Transfer successful but unable to retrieve fee information.")
                }
            } else {
                bot.sendMessage(chatId, "Failed to complete the transfer.")
            }
        } catch (err) {
            console.error("Error processing transfer:", err)
            bot.sendMessage(chatId, `Failed to complete the transfer. Reason: ${err.message}`)
        } finally {
            delete pendingTransfers[chatId] // Clear pending transfer
        }
    } else {
        bot.sendMessage(chatId, "No pending transfers to confirm.")
    }
}
