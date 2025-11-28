import { db } from './firebase';

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
  getDoc,
  orderBy,
  limit as firestoreLimit,
} from 'firebase/firestore';

// ============ EXPORTED TYPES ============

export interface Holding {
  id: string;
  ticker: string;
  nombreActions: number;
  prixAchatUsd: number;
  targetPercentage: number;
  category: 'Pilier' | 'Satellite' | 'Pari';
  companyName?: string;
  sector?: string;
  dateAchat?: Timestamp;
}

export interface HoldingData {
  ticker: string;
  nombreActions: number;
  prixAchatUsd: number;
  targetPercentage: number;
  category: 'Pilier' | 'Satellite' | 'Pari';
  companyName?: string;
  sector?: string;
}

export interface StockPrice {
  price: number;
  lastUpdate?: Timestamp;
}

export interface Transaction {
  id: string;
  type: 'ADD' | 'UPDATE' | 'DELETE';
  ticker: string;
  details: any;
  timestamp: Timestamp;
  date: string;
}

export interface PortfolioHistory {
  id: string;
  date: Timestamp;
  totalValue: number;
  totalInvested: number;
  gainLossPercent: number;
}

// ============ HELPER FUNCTIONS ============

// Fonction pour récupérer le nom complet via Cloud Function
async function fetchStockMetadata(ticker: string): Promise<{ name: string }> {
  try {
    const response = await fetch(`https://europe-west1-portfolio-2dd72.cloudfunctions.net/stockInfo?ticker=${ticker}`);

    if (!response.ok) {
      console.warn("stock-info API error for", ticker, response.status);
      return { name: ticker };
    }

    const data = await response.json();
    return {
      name: data.name || ticker,
    };
  } catch (error) {
    console.error("Erreur récupération metadata stock via /api/stock-info:", error);
    return { name: ticker };
  }
}

// Logger de transactions
async function logTransaction(
  type: 'ADD' | 'UPDATE' | 'DELETE',
  ticker: string,
  details: any
): Promise<void> {
  try {
    const safeDetails = {
      ...details,
      companyName: details?.companyName ?? 'N/A',
    };

    await addDoc(collection(db, 'transactions'), {
      type,
      ticker,
      details: safeDetails,
      timestamp: Timestamp.now(),
      date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erreur log transaction:', error);
  }
}

export async function addHolding(holdingData: HoldingData): Promise<string> {
  try {
    const metadata = await fetchStockMetadata(holdingData.ticker);

    const docRef = await addDoc(collection(db, "holdings"), {
      ticker: holdingData.ticker,
      nombreActions: holdingData.nombreActions,
      prixAchatUsd: holdingData.prixAchatUsd,
      targetPercentage: holdingData.targetPercentage,
      category: holdingData.category,
      companyName: metadata.name,
      dateAchat: Timestamp.now(),
    });

    await logTransaction("ADD", holdingData.ticker, {
      ...holdingData,
      companyName: metadata.name,
      totalInvested: holdingData.nombreActions * holdingData.prixAchatUsd,
    });

    console.log("Action ajoutée avec l'ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Erreur lors de l'ajout:", error);
    throw error;
  }
}


export async function getHoldings(): Promise<Holding[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'holdings'));
    const holdings: Holding[] = [];

    querySnapshot.forEach((snap) => {
      holdings.push({
        id: snap.id,
        ...snap.data(),
      } as Holding);
    });

    console.log(`${holdings.length} actions récupérées`);
    return holdings;
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    throw error;
  }
}

export async function getHoldingsByCategory(
  category: 'Pilier' | 'Satellite' | 'Pari'
): Promise<Holding[]> {
  try {
    const q = query(collection(db, 'holdings'), where('category', '==', category));
    const querySnapshot = await getDocs(q);
    const holdings: Holding[] = [];

    querySnapshot.forEach((snap) => {
      holdings.push({
        id: snap.id,
        ...snap.data(),
      } as Holding);
    });

    console.log(`${holdings.length} actions dans la catégorie ${category}`);
    return holdings;
  } catch (error) {
    console.error('Erreur lors du filtrage:', error);
    throw error;
  }
}

export async function deleteHolding(holdingId: string): Promise<boolean> {
  try {
    // Récupérer les infos avant suppression pour le log
    const docRef = doc(db, 'holdings', holdingId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data: any = docSnap.data();

      await deleteDoc(docRef);

      // Logger la transaction
      await logTransaction('DELETE', data.ticker, {
        nombreActions: data.nombreActions,
        prixAchatUsd: data.prixAchatUsd,
        category: data.category,
        totalInvested: data.nombreActions * data.prixAchatUsd,
        companyName: data.companyName,
      });

      console.log('Action supprimée:', holdingId);
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    throw error;
  }
}

export async function updateHolding(
  holdingId: string,
  updatedData: Partial<HoldingData>
): Promise<boolean> {
  try {
    // Récupérer les anciennes données pour le log
    const docRef = doc(db, 'holdings', holdingId);
    const docSnap = await getDoc(docRef);

    const oldData: any = docSnap.exists() ? docSnap.data() : {};

    await updateDoc(docRef, updatedData as any);

    // Logger la transaction
    await logTransaction('UPDATE', oldData.ticker, {
      before: {
        nombreActions: oldData.nombreActions,
        prixAchatUsd: oldData.prixAchatUsd,
        category: oldData.category,
        targetPercentage: oldData.targetPercentage,
        companyName: oldData.companyName,
      },
      after: updatedData,
    });

    console.log('Action mise à jour:', holdingId);
    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    throw error;
  }
}

export async function getStockPrices(): Promise<Record<string, StockPrice>> {
  try {
    const querySnapshot = await getDocs(collection(db, 'stockPrices'));
    const prices: Record<string, StockPrice> = {};

    querySnapshot.forEach((snap) => {
      prices[snap.id] = snap.data() as StockPrice;
    });

    return prices;
  } catch (error) {
    console.error('Erreur récupération prix:', error);
    throw error;
  }
}

export async function getStockPrice(ticker: string): Promise<StockPrice | null> {
  try {
    const docRef = doc(db, 'stockPrices', ticker);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as StockPrice;
    }
    return null;
  } catch (error) {
    console.error('Erreur récupération prix:', error);
    return null;
  }
}

export async function getTransactions(limitCount: number = 50): Promise<Transaction[]> {
  try {
    const q = query(
      collection(db, 'transactions'),
      orderBy('timestamp', 'desc'),
      firestoreLimit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const transactions: Transaction[] = [];

    querySnapshot.forEach((snap) => {
      transactions.push({
        id: snap.id,
        ...snap.data(),
      } as Transaction);
    });

    return transactions;
  } catch (error) {
    console.error('Erreur récupération transactions:', error);
    throw error;
  }
}

export async function getPortfolioHistory(limitCount: number = 30): Promise<PortfolioHistory[]> {
  try {
    const q = query(
      collection(db, 'portfolioHistory'),
      orderBy('date', 'desc'),
      firestoreLimit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const history: PortfolioHistory[] = [];

    querySnapshot.forEach((snap) => {
      history.push({
        id: snap.id,
        ...snap.data(),
      } as PortfolioHistory);
    });

    return history.reverse();
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    throw error;
  }
}
