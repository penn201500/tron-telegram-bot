const TelegramBot = require("node-telegram-bot-api")
const { telegramApiToken } = require("./config")
const { getHelpMessage } = require("./utils")

const bot = new TelegramBot(telegramApiToken, { polling: true })

const registerGenerateCommand = require("./commands/generate")
const registerHelpCommand = require("./commands/help")
const registerBalanceCommand = require("./commands/balance")
const registerTransferCommand = require("./commands/transfer")

// Global pendingTransfers object to track pending transfers
let pendingTransfers = {}

registerGenerateCommand(bot)
registerHelpCommand(bot)
registerBalanceCommand(bot)
registerTransferCommand(bot, pendingTransfers)

console.log("Bot is running...")

// Define the valid commands
const validCommands = ["/start", "/help", "/generate", "/transfer", "/balance"]

// Confirmation handler for "Yes" or "No"
bot.on("message", msg => {
    const chatId = msg.chat.id
    const userResponse = msg.text.trim().toLowerCase()

    // If there's a pending transfer, handle the confirmation
    if (pendingTransfers[chatId]) {
        if (userResponse === "yes") {
            // The confirmation logic for transfers is handled in transfer.js
            const transferConfirmHandler = require("./commands/transfer").confirmTransfer
            transferConfirmHandler(bot, chatId, pendingTransfers)
        } else if (userResponse === "no") {
            bot.sendMessage(chatId, "Transfer canceled.")
            delete pendingTransfers[chatId] // Clear pending transfer
        } else {
            // If it's not "yes" or "no", give the user a hint to respond with either
            bot.sendMessage(chatId, 'Invalid response. Please reply with "Yes" or "No".')
        }
        return
    }

    const msgText = msg.text.trim()
    const command = msgText.split(" ")[0]

    // Validate command if it starts with "/"
    if (msgText.startsWith("/") && !validCommands.includes(command)) {
        bot.sendMessage(chatId, "Invalid command. Use /help to see available commands.")
    } else if (!msgText.startsWith("/")) {
        bot.sendMessage(chatId, "Invalid command. Commands must start with a forward slash (/). Please use /help to see available commands.")
    }
})

// Handle the /start command
bot.onText(/\/start/, msg => {
    const chatId = msg.chat.id
    const helpMessage = getHelpMessage() // Assumes getHelpMessage is a function that provides help info
    bot.sendMessage(chatId, "Welcome to the Tron Wallet Bot!\n" + helpMessage)
})

bot.on("polling_error", error => console.error("Polling Error:", error))
