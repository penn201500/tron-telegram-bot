const TronWeb = require("tronweb")
const { tronFullHost } = require("../config")

const tronWeb = new TronWeb({
    fullHost: tronFullHost,
})

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

        const privateKey = process.env.FROM_ADDRESS_PRIVATE_KEY // Securely store/retrieve

        try {
            // Fetch sender's balance
            const balanceInSun = await tronWeb.trx.getBalance(fromAddress)
            const balanceInTRX = parseFloat(tronWeb.fromSun(balanceInSun))

            const amountInSun = amount * 1e6 // Convert to SUN

            // Build transaction
            const transactionObject = await tronWeb.transactionBuilder.sendTrx(toAddress, amountInSun, fromAddress)

            // Estimate gas fee and bandwidth consumption
            const transactionInfo = await tronWeb.trx.getTransactionInfo(transactionObject.txID)
            const energyUsed = transactionInfo.receipt ? transactionInfo.receipt.energy_usage_total : 0
            const bandwidthUsed = transactionInfo.receipt ? transactionInfo.receipt.net_usage : 0

            const estimatedGasFeeInTRX = parseFloat(tronWeb.fromSun(energyUsed * 280))
            const bandwidthCostInTRX = parseFloat(tronWeb.fromSun(bandwidthUsed)) // TRX cost for bandwidth usage

            // Check if receiver's account is active
            const receiverInfo = await tronWeb.trx.getAccount(toAddress)
            const isReceiverActive = receiverInfo.address && receiverInfo.address.length > 0

            let activationFee = 0
            if (!isReceiverActive) {
                activationFee = 1 // Add estimated 1 TRX for account activation if inactive
            }

            const totalCostInTRX = parseFloat(amount) + estimatedGasFeeInTRX + activationFee + bandwidthCostInTRX

            if (balanceInTRX < totalCostInTRX) {
                bot.sendMessage(chatId, `Insufficient balance. You need at least ${totalCostInTRX.toFixed(6)} TRX to complete this transfer (including gas, activation, and bandwidth fees).`)
                return
            }

            // Store pending transfer details
            pendingTransfers[chatId] = {
                fromAddress,
                toAddress,
                amount,
                estimatedGasFeeInTRX,
                bandwidthCostInTRX,
                activationFee,
                totalCostInTRX,
                transactionObject,
                privateKey,
            }

            // Confirmation message
            bot.sendMessage(
                chatId,
                `You are about to send ${amount.toFixed(6)} TRX from ${fromAddress} to ${toAddress}.\nEstimated Gas Fee: ${estimatedGasFeeInTRX.toFixed(6)} TRX\nBandwidth Fee: ${bandwidthCostInTRX.toFixed(6)} TRX\nPossible Activation Fee: ${activationFee.toFixed(
                    6
                )} TRX\nTotal Estimated Cost: ${totalCostInTRX.toFixed(6)} TRX\n\nDo you want to proceed? Reply with "Yes" or "No".`
            )
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
                const transactionInfo = await tronWeb.trx.getTransactionInfo(receipt.txid)
                const actualEnergyUsed = transactionInfo.receipt ? transactionInfo.receipt.energy_usage_total : 0
                const actualBandwidthUsed = transactionInfo.receipt ? transactionInfo.receipt.net_usage : 0

                const actualGasFeeInTRX = parseFloat(tronWeb.fromSun(actualEnergyUsed * 280))
                const actualBandwidthCostInTRX = parseFloat(tronWeb.fromSun(actualBandwidthUsed))

                bot.sendMessage(chatId, `Transfer successful!\nTransaction Hash: ${receipt.txid}\nActual Gas Fee: ${actualGasFeeInTRX.toFixed(6)} TRX\nActual Bandwidth Fee: ${actualBandwidthCostInTRX.toFixed(6)} TRX`)
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
