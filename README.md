# Cycle Project

This repository contains the Cycle project, a blockchain-based application using Ethereum.

## Prerequisites

- Node.js and npm installed
- Git installed
- A 1inch account with an API key

## Setup Instructions

1. Clone the repository:
   ```
   git clone https://github.com/design-smith/cycle.git
   cd cycle
   ```

2. Install dependencies:
   ```
   npm i
   ```

3. Create a `.env` file in the root directory and add the following variables:
   ```
   MAINNET=your_mainnet_alchemy_url
   TESTNET=your_testnet_alchemy_url
   PRIVATE_KEY=your_wallet_private_key
   WALLET=your_wallet_address
   ALCHEMY_API_KEY=your_alchemy_api_key
   ETHERSCAN_API_KEY=your_etherscan_api_key
   1INCH_API=your_1inch_api_key
   ```
   Replace the placeholders with your actual values.

4. Compile the smart contracts:
   ```
   npx hardhat compile
   ```

5. Install OpenZeppelin with SafeMath:
   ```
   npm install @openzeppelin/contracts
   ```

## Important Notes
- Ensure you have a 1inch account and API key to use this project.
- If you encounter issues with SafeMath, you may need to manually add it or use a version of OpenZeppelin that includes it.