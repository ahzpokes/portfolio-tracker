import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import { onRequest } from "firebase-functions/v2/https";

admin.initializeApp();

// --- Shared Logic ---

async function updatePricesForTickers(tickers: Set<string>, apiKey: string) {
  const updates: string[] = [];
  const errors: any[] = [];

  // On prend la date d’hier (EOD US déjà disponible à 1h Paris)
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD

  for (const ticker of Array.from(tickers)) {
    try {
      const url = `https://api.tiingo.com/tiingo/daily/${ticker}/prices?token=${apiKey}&startDate=${dateStr}&endDate=${dateStr}`;
      const response = await fetch(url);

      if (!response.ok) {
        errors.push({ ticker, error: `HTTP ${response.status}` });
        continue;
      }

      const prices: any = await response.json();

      if (!Array.isArray(prices) || prices.length === 0) {
        errors.push({ ticker, error: "No EOD data returned" });
        continue;
      }

      const bar = prices[0]; // Tiingo renvoie un tableau de barres

      const close = typeof bar.close === "number" ? bar.close : parseFloat(bar.close ?? "0") || 0;
      const open = bar.open !== undefined ? (typeof bar.open === "number" ? bar.open : parseFloat(bar.open) || 0) : close;
      const high = bar.high !== undefined ? (typeof bar.high === "number" ? bar.high : parseFloat(bar.high) || 0) : close;
      const low = bar.low !== undefined ? (typeof bar.low === "number" ? bar.low : parseFloat(bar.low) || 0) : close;
      const volume = bar.volume !== undefined ? (typeof bar.volume === "number" ? bar.volume : parseInt(bar.volume) || 0) : 0;

      await admin
        .firestore()
        .collection("stockPrices")
        .doc(ticker)
        .set({
          ticker,
          price: close,
          open,
          high,
          low,
          volume,
          datetime: bar.date || new Date().toISOString(),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });

      updates.push(ticker);
      console.log(`✓ Tiingo EOD updated ${ticker}: $${close}`);
    } catch (err) {
      console.error(`Error updating ${ticker} from Tiingo:`, err);
      errors.push({ ticker, error: "Request failed" });
    }
  }

  return { updates, errors };
}

async function updatePortfolioHistory(holdingsSnapshot: FirebaseFirestore.QuerySnapshot) {
  let totalValue = 0;
  let totalInvested = 0;

  for (const doc of holdingsSnapshot.docs) {
    const holding = doc.data();
    const priceDoc = await admin
      .firestore()
      .collection("stockPrices")
      .doc(holding.ticker)
      .get();

    const currentPrice = priceDoc.exists
      ? priceDoc.data()?.price || holding.prixAchatUsd
      : holding.prixAchatUsd;

    totalValue += holding.nombreActions * currentPrice;
    totalInvested += holding.nombreActions * holding.prixAchatUsd;
  }

  const gainLoss = totalValue - totalInvested;
  const gainLossPercent = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0;

  await admin.firestore().collection("portfolioHistory").add({
    date: admin.firestore.FieldValue.serverTimestamp(),
    totalValue,
    totalInvested,
    gainLoss,
    gainLossPercent,
    holdingsCount: holdingsSnapshot.size,
  });

  return totalValue;
}

// --- Cloud Functions ---

export const updateStockPricesDailyV2 = onSchedule(
  {
    schedule: "0 1 * * 1-5", // 1h du matin Europe/Paris
    timeZone: "Europe/Paris",
    memory: "256MiB",
    timeoutSeconds: 540,
    region: "europe-west1",
  },
  async () => {
    console.log("Starting daily stock price update with Tiingo... (Europe V2)");

    const apiKey = process.env.TIINGO_API_KEY;
    if (!apiKey) {
      console.error("Tiingo API key not configured");
      return;
    }

    try {
      const holdingsSnapshot = await admin.firestore().collection("holdings").get();

      const tickers = new Set<string>();
      holdingsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.ticker) {
          tickers.add(data.ticker);
        }
      });

      if (tickers.size === 0) {
        console.log("No holdings to update");
        return;
      }

      console.log(`Updating ${tickers.size} tickers with Tiingo:`, Array.from(tickers));

      const { updates, errors } = await updatePricesForTickers(tickers, apiKey);

      const totalValue = await updatePortfolioHistory(holdingsSnapshot);

      console.log(
        `Tiingo update completed: ${updates.length} success, ${errors.length} errors`
      );
      console.log(`Portfolio snapshot saved: $${totalValue.toFixed(2)}`);
    } catch (error) {
      console.error("Error in daily Tiingo update:", error);
    }
  }
);

export const updatePricesManuallyV2 = onRequest(
  { cors: true, memory: "256MiB", timeoutSeconds: 540, region: "europe-west1" },
  async (req, res) => {
    console.log("Manual price update requested (Europe V2)");
    const apiKey = process.env.TIINGO_API_KEY;

    if (!apiKey) {
      res.status(500).json({ error: "Tiingo API key not configured" });
      return;
    }

    try {
      const holdingsSnapshot = await admin.firestore().collection("holdings").get();

      const tickers = new Set<string>();
      holdingsSnapshot.forEach((doc) => {
        if (doc.data().ticker) tickers.add(doc.data().ticker);
      });

      if (tickers.size === 0) {
        res.json({ message: "No holdings", updated: [], errors: [] });
        return;
      }

      const { updates, errors } = await updatePricesForTickers(tickers, apiKey);
      // Note: We don't save portfolio history here - only the daily scheduled function does

      res.json({ message: "Success", updated: updates, errors });
    } catch (error) {
      console.error("Error in manual Tiingo update:", error);
      res.status(500).json({ error: "Internal error" });
    }
  }
);

export const stockInfo = onRequest({ cors: true, region: "europe-west1" }, async (req, res) => {
  const ticker = req.query.ticker as string;

  if (!ticker) {
    res.status(400).json({ error: "Missing ticker" });
    return;
  }

  const apiKey = process.env.TIINGO_API_KEY;
  if (!apiKey) {
    console.error("TIINGO_API_KEY not set in env");
    res.status(500).json({ error: "Server API key not configured" });
    return;
  }

  try {
    const url = `https://api.tiingo.com/tiingo/daily/${encodeURIComponent(ticker)}?token=${apiKey}`;
    const tiingoRes = await fetch(url);

    if (!tiingoRes.ok) {
      const text = await tiingoRes.text();
      console.error("Tiingo metadata error:", tiingoRes.status, text);
      res.status(502).json({ error: "Tiingo error", status: tiingoRes.status });
      return;
    }

    const data = await tiingoRes.json();
    // data: { ticker, name, ... }

    res.status(200).json({
      ticker: data?.ticker ?? ticker,
      name: data?.name ?? ticker,
    });
  } catch (err) {
    console.error("Error in stockInfo:", err);
    res.status(500).json({ error: "Internal error" });
  }
});
