const { getHelpMessage } = require("../utils")

module.exports = bot => {
    bot.onText(/\/help$/, msg => {
        const chatId = msg.chat.id
        const helpMessage = getHelpMessage()
        bot.sendMessage(chatId, helpMessage)
    })
}
