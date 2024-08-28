require("dotenv").config()
const TelegramBot = require("node-telegram-bot-api")
const { getHelpMessage } = require("./utils")

const bot = new TelegramBot(process.env.TELEGRAM_API_TOKEN, { polling: true })

// Global pendingTransfers object to track pending transfers
let pendingTransfers = {}

// Flags to prevent multiple registrations of the same command
let isGenerateRegistered = false
let isBalanceRegistered = false
let isTransferRegistered = false

console.log("Bot is running...")

// Define the valid commands
const validCommands = ["/start", "/help", "/generate", "/transfer", "/balance"]

// Confirmation handler for "Yes" or "No"
bot.on("message", msg => {
    const chatId = msg.chat.id
    const userResponse = msg.text.trim().toLowerCase()

    // Handle transfer confirmation exclusively
    if (pendingTransfers[chatId]) {
        if (userResponse === "yes") {
            const transferConfirmHandler = require("./commands/transfer").confirmTransfer
            transferConfirmHandler(bot, chatId, pendingTransfers)
        } else if (userResponse === "no") {
            bot.sendMessage(chatId, "Transfer canceled.")
            delete pendingTransfers[chatId] // Clear pending transfer
        } else {
            bot.sendMessage(chatId, 'Invalid response. Please reply with "Yes" or "No".')
        }
        return // Ignore all other input while waiting for confirmation
    }

    // If no pending transfer, process normal commands
    const msgText = msg.text.trim()
    const command = msgText.split(" ")[0]

    // Validate command if it starts with "/"
    if (msgText.startsWith("/")) {
        if (!validCommands.includes(command)) {
            bot.sendMessage(chatId, "Invalid command. Use /help to see available commands.")
        } else {
            const helpMessage = getHelpMessage()

            // Process valid commands
            switch (command) {
                case "/start":
                    bot.sendMessage(chatId, "Welcome to the Tron Wallet Bot!\n" + helpMessage)
                    break

                case "/help":
                    bot.sendMessage(chatId, helpMessage)
                    break

                case "/generate":
                    if (!isGenerateRegistered) {
                        const registerGenerateCommand = require("./commands/generate")
                        registerGenerateCommand(bot)
                        isGenerateRegistered = true // Mark as registered
                    }
                    break

                case "/balance":
                    if (!isBalanceRegistered) {
                        const registerBalanceCommand = require("./commands/balance")
                        registerBalanceCommand(bot)
                        isBalanceRegistered = true // Mark as registered
                    }
                    break

                case "/transfer":
                    if (!isTransferRegistered) {
                        const registerTransferCommand = require("./commands/transfer")
                        registerTransferCommand(bot, pendingTransfers)
                        isTransferRegistered = true // Mark as registered
                    }
                    break

                default:
                    bot.sendMessage(chatId, "Unknown command. Use /help to see available commands.")
                    break
            }
        }
    } else {
        bot.sendMessage(chatId, "Invalid command. Commands must start with a forward slash (/). Please use /help to see available commands.")
    }
})

// Handle polling errors
bot.on("polling_error", error => console.error("Polling Error:", error))
