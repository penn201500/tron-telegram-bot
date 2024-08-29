const axios = require("axios")

const fetchTrxPrice = async () => {
    try {
        const response = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd,eur,btc")
        return response.data.tron
    } catch (error) {
        console.error("Error fetching TRX prices:", error)
        throw error // Re-throw the error so the calling function knows something went wrong
    }
}

module.exports = bot => {
    bot.onText(/\/info/, async msg => {
        const chatId = msg.chat.id

        try {
            const prices = await fetchTrxPrice()
            const message = `
TRX Prices:
- USD: $${prices.usd}
- EUR: €${prices.eur}
- BTC: ${prices.btc} BTC
            `
            bot.sendMessage(chatId, message)
        } catch (error) {
            bot.sendMessage(chatId, "Sorry, I couldn't fetch the TRX prices right now. Please try again later.")
        }
    })
}
