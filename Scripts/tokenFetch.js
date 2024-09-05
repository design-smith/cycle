const axios = require("axios");
const fs = require("fs").promises;

async function fetchAndFormatTokens() {
  const url = "https://api.1inch.dev/swap/v6.0/1/tokens";
  const config = {
    headers: {
      "Authorization": "Bearer 2FjXFPBCFyqnx5n8O1dVUZmcskmdCzI9"
    },
    params: {}
  };

  try {
    const response = await axios.get(url, config);
    const tokens = response.data.tokens;

    const formattedTokens = Object.entries(tokens).reduce((acc, [address, token]) => {
      acc[token.symbol] = {
        symbol: token.symbol,
        address: address,
        chain: 'eth', // Assuming all tokens are on Ethereum
        decimals: token.decimals
      };
      return acc;
    }, {});

    // Save to JSON file
    await fs.writeFile('formattedTokens.json', JSON.stringify(formattedTokens, null, 2));
    console.log('Tokens have been fetched, formatted, and saved to formattedTokens.json');

    return formattedTokens;
  } catch (error) {
    console.error("Error fetching or saving tokens:", error.message);
  }
}

fetchAndFormatTokens();