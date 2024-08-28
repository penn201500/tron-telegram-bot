const TelegramBot = require("node-telegram-bot-api")
const { telegramApiToken } = require("./config")

const bot = new TelegramBot(telegramApiToken, { polling: true })

const registerGenerateCommand = require("./commands/generate")
const registerHelpCommand = require("./commands/help")

registerGenerateCommand(bot)
registerHelpCommand(bot)

bot.onText(/\/start/, msg => {
    const chatId = msg.chat.id
    bot.sendMessage(chatId, "Welcome to the Tron Wallet Bot! Use /help to see available commands.")
})

bot.on("message", msg => {
    const chatId = msg.chat.id
    const msgText = msg.text.trim()
    const command = msgText.split(" ")[0]
    if (msgText.startsWith("/") && !validCommands.includes(command)) {
        bot.sendMessage(chatId, "Invalid command. Use /help to see available commands.")
    } else if (!msgText.startsWith("/")) {
        bot.sendMessage(chatId, "Invalid command. Commands must start with a forward slash (/). Please use /help to see available commands.")
    }
})

console.log("Bot is running...")
