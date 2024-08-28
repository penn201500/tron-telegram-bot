function getHelpMessage() {
    return `
Available Commands:
/generate - Generate a new Tron wallet (address, private key, and mnemonic)
/transfer - Transfer TRX to another address. Usage: /transfer <from_address> <to_address> <amount>
/balance - Check the TRX balance of an address. Usage: /balance <address>
/help - Show this help message
    `
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = { getHelpMessage, sleep }
