module.exports = bot => {
    bot.onText(/\/help$/, msg => {
        const chatId = msg.chat.id
        const helpMessage = `
Available Commands:
/generate - Generate a new Tron wallet (address, private key, and mnemonic)
/transfer - Transfer TRX to another address. Usage: /transfer <from_address> <to_address> <amount>
/balance - Check the TRX balance of an address. Usage: /balance <address>
/help - Show this help message
        `
        bot.sendMessage(chatId, helpMessage)
    })
}
