const TelegramBot = require("node-telegram-bot-api")
const { telegramApiToken, tronFullHost } = require("./config")
const TronWeb = require("tronweb")

const bot = new TelegramBot(telegramApiToken, { polling: true })

bot.onText(/\/start/, msg => {
    const chatId = msg.chat.id
    bot.sendMessage(chatId, "Welcome to the Tron Wallet Bot! Use /help to see available commands.")
})

bot.onText(/\/help/, msg => {
    const chatId = msg.chat.id
    bot.sendMessage(chatId, "Available commands:\n/generate - Generate a new Tron address\n/transfer - Transfer TRX to another address\n/balance - Check your TRX balance")
})

bot.onText(/\/generate/, msg => {
    const chatId = msg.chat.id

    const tronWeb = new TronWeb({
        fullHost: tronFullHost,
    })

    const account = tronWeb.createAccount()
    account
        .then(newAccount => {
            bot.sendMessage(chatId, `New Tron Address Generated:\nAddress: ${newAccount.address.base58}\nPrivate Key: ${newAccount.privateKey}`)
        })
        .catch(err => {
            console.error("Error generating Tron address:", err)
            bot.sendMessage(chatId, "Failed to generate a new Tron address. Please check the log.")
        })
})

bot.on("message", msg => {
    const chatId = msg.chat.id
    if (!msg.text.startsWith("/")) {
        bot.sendMessage(chatId, "Invalid command. Use /help to see available commands.")
    }
})

console.log("Bot is running...")
