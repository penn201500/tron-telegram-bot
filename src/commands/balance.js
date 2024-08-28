require("dotenv").config()
const TronWeb = require("tronweb")
const tronFullHost = process.env.TRON_FULL_HOST

module.exports = bot => {
    bot.onText(/\/balance/, async msg => {
        const chatId = msg.chat.id
        const args = msg.text.trim().split(" ")

        // Ensure the /balance command has exactly one argument (the address)
        if (args.length !== 2) {
            bot.sendMessage(chatId, "Invalid command format. Usage: /balance <address>")
            return
        }

        const address = args[1].trim()

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
