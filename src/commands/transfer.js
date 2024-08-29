const TronWeb = require("tronweb")
const { sleep, estimateTransactionFee, fetchTransactionInfoFromTronGrid, calculateGasFee } = require("../utils")

const tronWeb = new TronWeb({
    fullHost: process.env.TRON_FULL_HOST,
    headers: { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY },
})

module.exports = (bot, pendingTransfers) => {
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

        if (!tronWeb.isAddress(fromAddress)) {
            bot.sendMessage(chatId, `Invalid from address: ${fromAddress}`)
            return
        }
        if (!tronWeb.isAddress(toAddress)) {
            bot.sendMessage(chatId, `Invalid to address: ${toAddress}`)
            return
        }

        const privateKey = process.env.FROM_ADDRESS_PRIVATE_KEY

        try {
            const { gasFee, transactionHash } = await estimateTransactionFee(tronWeb, fromAddress, toAddress, tronWeb.toSun(amount))
            const gasFeeInTRX = parseFloat(tronWeb.fromSun(gasFee))
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
            if (err.message === "Insufficient balance") {
                bot.sendMessage(chatId, `Insufficient balance. You need at least ${(amount).toFixed(6)} TRX to complete this transfer.`)
            } else {
                console.error("Error estimating transfer:", err)
                bot.sendMessage(chatId, `Failed to estimate the transfer. Reason: ${err.message}`)
            }
        }
    })
}

module.exports.confirmTransfer = async (bot, chatId, pendingTransfers) => {
    if (pendingTransfers[chatId]) {
        try {
            const { transactionHash, privateKey } = pendingTransfers[chatId]
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
            // Ensure pending transfer is always cleared
            if (pendingTransfers[chatId]) {
                console.log(`Cleaning up pending transfer for chatId ${chatId}`)
                delete pendingTransfers[chatId]
            } else {
                console.warn(`Pending transfer for chatId ${chatId} was already cleaned up.`)
            }
        }
    } else {
        bot.sendMessage(chatId, "No pending transfers to confirm.")
    }
}
