// Import required libraries
const fs = require('fs');
const axios = require('axios');
const { ethers, JsonRpcProvider } = require('ethers');
const { FlashbotsBundleProvider } = require('@flashbots/ethers-provider-bundle');
const ABI = require('../artifacts/contracts/Trident.sol/Trident.json');
const contractABI = ABI.abi;
const dotenv = require('dotenv');
dotenv.config();

// Setup provider and signer
const provider = new JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/OTNvTSVSqWA4LLcJlW9rBiDVG5o2gYW8');
const privateKey = process.env.PRIVATE_KEY;
const signer = new ethers.Wallet(privateKey, provider);
// Load token list
const tokenListRaw = fs.readFileSync('formattedTokens.json', 'utf8');
const tokenList = JSON.parse(tokenListRaw);

// Import functions
const {
  getRandomTokenSet,
  createAllTokenPairs,
  getPricesForPairs,
  getTxData,
} = require('./functions');

// Contract and token setup
const contractAddress = '0x2D4a6E547418aeFCC543bb536CE59fAc0a66733e';
const tokenSelect = tokenList.GURU;
const token = tokenSelect.address;
let amount = ethers.parseUnits('1000', tokenSelect.decimals);
const gasLimit = ethers.parseUnits("16000000", "wei");

async function initializeFlashbotsProvider() {
    return await FlashbotsBundleProvider.create(
        provider,
        signer,
        'https://builder0x69.io/',
        'mainnet'
    );
}

async function runcycleCycle() {
    const tokenSet = getRandomTokenSet();
    const tokenPairs = createAllTokenPairs(tokenSet);
    const weights = await getPricesForPairs(tokenPairs);

    const cycleSwaps = tokenSet;
    console.log("We are swapping ", cycleSwaps)
    
    if (cycleSwaps.length > 0) {
        fs.appendFileSync('results.txt', `cycle Swaps: ${JSON.stringify(cycleSwaps)}\n`);
        
        const firstOpportunity = cycleSwaps[0];
        console.log("First opportunity", firstOpportunity);
        const routing = Array.isArray(firstOpportunity) ? firstOpportunity.map(token => token.address) : [firstOpportunity.address];

        let txData = [];
        let initialDstAmount = amount;
        let finalDstAmount = null;
        const routes = [];

        if (token != routing[0]) {
            let firstSwapData = await getTxData(
                [token, routing[0]],
                amount,
                contractAddress
            );
            txData.push(firstSwapData);
            routes.push(token);
        }

        for (let i = 0; i < routing.length - 1; i++) {
            let pairData = await getTxData([routing[i], routing[i + 1]], amount, contractAddress);
            txData.push(pairData);
            amount = pairData.dstAmount;
            routes.push(routing[i]);
            console.log("Next swap done");
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        routes.push(routing[routing.length - 1]);

        if (routing[routing.length - 1] != token) {
            let lastSwapData = await getTxData(
                [routing[routing.length - 1], token],
                amount,
                contractAddress
            );
            finalDstAmount = lastSwapData.dstAmount;
            txData.push(lastSwapData);
            routes.push(token);
        }

        const txDataArray = txData.map((data) => `0x${data.tx.data.slice(10)}`);

        // Connect to the smart contract
        const contract = new ethers.Contract(
            contractAddress,
            contractABI,
            signer
        );

        // Flashbots integration
        const flashbotsProvider = await initializeFlashbotsProvider();

        // Create a Flashbots bundle
        const signedBundle = await flashbotsProvider.signBundle([
            {
                signer: signer,
                transaction: {
                    to: contractAddress,
                    data: contract.interface.encodeFunctionData('requestFlashLoan', [
                        token,
                        initialDstAmount,
                        routes,
                        txDataArray
                    ]),
                    gasLimit: gasLimit,
                    maxPriorityFeePerGas: ethers.parseUnits("55", "gwei"),
                    maxFeePerGas: ethers.parseUnits("55", "gwei"),
                },
            },
        ]);

        const blockNumber = await provider.getBlockNumber();
        console.log("Simulating transaction...");
        const simulation = await flashbotsProvider.simulate(signedBundle, blockNumber + 1);

        if ("error" in simulation) {
            console.error(`Simulation Error: ${simulation.error.message}`);
            return;
        }

        console.log("Simulation successful. Sending transaction...");
        const response = await flashbotsProvider.sendRawBundle(signedBundle, blockNumber + 1);
        
        if ("error" in response) {
            console.error(`Error sending Flashbots transaction: ${response.error.message}`);
        } else {
            console.log("Transaction successfully sent to Flashbots!");
        }

        // Record results
        let results = {
            'token': token,
            'routing': routing,
            'txDataArray': txDataArray,
            'initialDstAmount': initialDstAmount.toString(),
            'Final Amount': finalDstAmount ? finalDstAmount.toString() : 'N/A',
        };
        fs.appendFileSync('results.txt', `${JSON.stringify(results)}\n`);
    } else {
        console.log('No cycle Swaps found.');
    }
}

// Run the cycle detection
(async () => {
    try {
        await runcycleCycle();
    } catch (error) {
        console.error('Error during cycle detection:', error);
        fs.appendFileSync('errors.txt', `${error}\n`);
    }
})();