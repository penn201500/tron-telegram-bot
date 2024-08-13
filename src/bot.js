const TelegramBot = require("node-telegram-bot-api")
const { telegramApiToken } = require("./config")

const bot = new TelegramBot(telegramApiToken, { polling: true })

bot.onText(/\/start/, msg => {
    const chatId = msg.chat.id
    bot.sendMessage(chatId, "Welcome to the Tron Wallet Bot! Use /help to see available commands.")
})

bot.onText(/\/help/, msg => {
    const chatId = msg.chat.id
    bot.sendMessage(chatId, "Available commands:\n/generate - Generate a new Tron address\n/transfer - Transfer TRX to another address\n/balance - Check your TRX balance")
})

console.log("Bot is running...")
