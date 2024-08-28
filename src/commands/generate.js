const TronWeb = require("tronweb")
const bip39 = require("bip39")
const hdkey = require("hdkey")
const { tronFullHost } = require("../config")

module.exports = bot => {
    bot.onText(/\/generate$/, async msg => {
        const chatId = msg.chat.id
        const args = msg.text.trim().split(" ")

        if (args.length !== 1) {
            bot.sendMessage(chatId, "The /generate command does not accept any arguments.")
            return
        }

        try {
            const mnemonic = bip39.generateMnemonic()
            const seed = await bip39.mnemonicToSeed(mnemonic)

            // Derive a private key from the seed
            const root = hdkey.fromMasterSeed(seed)
            const priKey = root.privateKey.toString("hex")

            const tronWeb = new TronWeb({
                fullHost: tronFullHost,
                privateKey: priKey,
            })

            const account = await tronWeb.createAccount()
            bot.sendMessage(chatId, `New Tron Wallet Generated:\nAddress: ${account.address.base58}\nPrivate Key: ${account.privateKey}\nMnemonic: ${mnemonic}`)
        } catch (err) {
            console.error("Error generating Tron address:", err)
            bot.sendMessage(chatId, `Failed to generate a new Tron wallet. Error: ${err.message}`)
        }
    })
}
