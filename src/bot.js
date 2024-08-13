const TelegramBot = require("node-telegram-bot-api")
const { telegramApiToken, tronFullHost } = require("./config")
const TronWeb = require("tronweb")
const bip39 = require("bip39")
const hdkey = require("hdkey")

const bot = new TelegramBot(telegramApiToken, { polling: true })
const validCommands = ["/start", "/help", "/generate", "/transfer", "/balance"]

bot.onText(/\/start/, msg => {
    const chatId = msg.chat.id
    bot.sendMessage(chatId, "Welcome to the Tron Wallet Bot! Use /help to see available commands.")
})

bot.onText(/\/help/, msg => {
    const chatId = msg.chat.id
    bot.sendMessage(chatId, "Available commands:\n/generate - Generate a new Tron address\n/transfer - Transfer TRX to another address\n/balance - Check your TRX balance")
})

bot.onText(/\/generate/, async msg => {
    const chatId = msg.chat.id
    const args = msg.text.trim().split(" ")
    if (args.length !== 1) {
        bot.sendMessage(chatId, "The /generate command does not accept any arguments.")
        return
    }
    try {
        const mnemonic = bip39.generateMnemonic()
        const seed = await bip39.mnemonicToSeed(mnemonic)
        // derive a private key from the seed
        const root = hdkey.fromMasterSeed(seed)
        const priKey = root.privateKey.toString("hex")
        const tronWeb = new TronWeb({
            fullHost: tronFullHost,
            privateKey: priKey,
        })
        const account = await tronWeb.createAccount()
        bot.sendMessage(chatId, `New Tron Address Generated:\nAddress: ${account.address.base58}\nPrivate Key: ${account.privateKey}\nMnemonic: ${mnemonic}`)
    } catch (err) {
        console.error("Error generating Tron address:", err)
        bot.sendMessage(chatId, `Failed to generate a new Tron address. Error: ${err.message}`)
    }
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
