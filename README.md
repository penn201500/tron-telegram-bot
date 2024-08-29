# Tron Wallet Telegram Bot

This is a Telegram bot built to interact with the Tron blockchain. The bot allows users to generate wallets, transfer TRX, check balances, and get current TRX prices. It uses the TronWeb API for blockchain interactions and the CoinGecko API for fetching TRX prices.

## Features

- **Generate Wallet**: Create a new Tron wallet, including an address, private key, and mnemonic phrase.
- **Transfer TRX**: Transfer TRX from one address to another.
- **Check Balance**: Check the TRX balance of a specified Tron address.
- **Get TRX Prices**: Get the current TRX prices in USD, EUR, BTC pair.

## Setup

### Prerequisites

- Node.js(v20.16.0)
- A Telegram bot token from BotFather

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/penn201500/tron-telegram-bot
    cd tron-telegram-bot
    ```

2. Install the dependencies:

    ```bash
    npm install
    ```

3. Set up environment variables:
    - Create a `.env` file in the root directory.
    - Add your Telegram bot token and other vars:

      ```txt
      TELEGRAM_API_TOKEN=your-telegram-bot-token
      TRON_FULL_HOST=https://api.shasta.trongrid.io
      FROM_ADDRESS_PRIVATE_KEY=your-private-key-to-transfer-trx-out
      TRONSCAN_QUERY_API=https://shastapi.tronscan.org/api/transaction-info?hash=
      TRONGRID_API_KEY=your-trongrid-api-key
      ```

      - **Note**: For production environments, the `TRON_FULL_HOST` and `TRONSCAN_QUERY_API` should not be set to Shasta (which is a testnet). Instead, use the appropriate production URLs:

      ```txt
      TRON_FULL_HOST=https://api.trongrid.io
      TRONSCAN_QUERY_API=https://apilist.tronscan.org/api/transaction-info?hash=
      ```

4. Run the bot:

    ```bash
    npm run start
    ```

## Commands

Here is a list of commands that the bot supports:

- `/start` - Start the bot and get a welcome message.
- `/help` - Get a list of available commands.
- `/generate` - Generate a new Tron wallet (address, private key, and mnemonic).
- `/transfer <from_address> <to_address> <amount>` - Transfer TRX to another address.
- `/balance <address>` - Check the TRX balance of an address.
- `/info` - Get the current TRX price in USD, EUR, BTC, and pair.

## Example Usage

1. **Generate Wallet**:
   - Command: `/generate`
   - Response: The bot will generate and return a new Tron wallet with an address, private key, and mnemonic.

2. **Check Balance**:
   - Command: `/balance TEHZ4ajuqgJR4tb9WQGNEupmHAHxxpXCCU`
   - Response: The bot will return the current balance of the provided address.

3. **Transfer TRX**:
   - Command: `/transfer <from_address> <to_address> <amount>`
   - Response: The bot will ask for confirmation to execute the transfer. You must reply with "Yes" or "No."

4. **Get TRX Prices**:
   - Command: `/info`
   - Response: The bot will return the current TRX prices in USD, EUR, BTC, and pair.

## Error Handling

- If the bot detects a transfer confirmation pending, it will ignore all other commands and prompt the user to reply with "Yes" or "No."
- Invalid commands or incorrect usage will prompt an error message with guidance.

## Contribution

Contributions are welcome! Please feel free to submit a pull request or open an issue on GitHub.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
