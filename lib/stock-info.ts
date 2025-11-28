export async function getStockInfo(ticker: string) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_TIINGO_API_KEY;

    if (!apiKey) {
      console.error("Tiingo API key not configured");
      return {
        name: ticker,
        sector: "N/A",
      };
    }

    const response = await fetch(
      `https://api.tiingo.com/tiingo/daily/${ticker}?token=${apiKey}`
    );

    if (!response.ok) {
      console.error("Tiingo metadata HTTP error:", response.status);
      return {
        name: ticker,
        sector: "N/A",
      };
    }

    const data = await response.json();
    // data contient typiquement: { ticker, name, exchangeCode, description, ... } [web:229][web:235]

    return {
      name: data?.name || ticker,
      // Tiingo fundamentals API peut fournir sector/industry, mais c’est sur un produit séparé payant. [web:212][web:236]
      sector: data?.sector || "N/A",
    };
  } catch (error) {
    console.error("Error fetching stock info from Tiingo:", error);
    return {
      name: ticker,
      sector: "N/A",
    };
  }
}
