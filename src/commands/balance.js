const TronWeb = require("tronweb")
const { tronFullHost } = require("../config")

module.exports = bot => {
    bot.onText(/\/balance (.+)/, async (msg, match) => {
        const chatId = msg.chat.id
        const address = match[1].trim()

        // Check if the address is valid
        if (!TronWeb.isAddress(address)) {
            bot.sendMessage(chatId, "Invalid address format. Please provide a valid Tron address.")
            return
        }

        try {
            // Initialize TronWeb instance
            const tronWeb = new TronWeb({
                fullHost: tronFullHost,
            })

            // Fetch the balance
            const balance = await tronWeb.trx.getBalance(address)

            // Send the balance in TRX (since balance is returned in SUN)
            bot.sendMessage(chatId, `Balance for address ${address} is ${tronWeb.fromSun(balance)} TRX.`)
        } catch (err) {
            console.error("Error fetching balance:", err)
            bot.sendMessage(chatId, `Failed to retrieve balance. Error: ${err.message}`)
        }
    })
}
