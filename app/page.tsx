'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { usePrivacy } from '@/lib/privacy-context';
import { getHoldings, getStockPrices, deleteHolding, Holding, StockPrice as FirestoreStockPrice } from '@/lib/firestore';
import { PrivateAmount } from '@/components/PrivateAmount';
import { Skeleton } from '@/components/Skeleton';
import AddStockForm from '@/components/AddStockForm';
import EditStockModal from '@/components/EditStockModal';
import PortfolioCharts from '@/components/PortfolioCharts';
import PerformanceChart from '@/components/PerformanceChart';
import TransactionHistory from '@/components/TransactionHistory';
import {
  RefreshCw,
  LogOut,
  Plus,
  X,
  Briefcase,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Satellite,
  Dices,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';

interface StockPrice {
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: any;
}

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isPrivate, togglePrivacy } = usePrivacy();

  const [updating, setUpdating] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);

  const { data: holdings = [], isLoading: holdingsLoading } = useQuery<Holding[]>({
    queryKey: ['holdings'],
    queryFn: getHoldings,
    enabled: !!user,
  });

  const { data: stockPrices = {}, isLoading: pricesLoading } = useQuery<Record<string, FirestoreStockPrice>>({
    queryKey: ['stockPrices'],
    queryFn: getStockPrices,
    enabled: !!user,
  });

  const loading = holdingsLoading || pricesLoading;

  const lastUpdate = (() => {
    const dates = Object.values(stockPrices).map((p: any) => p.lastUpdated?.toDate?.() || new Date(0));
    if (dates.length > 0) {
      return new Date(Math.max(...dates.map(d => d.getTime())));
    }
    return null;
  })();

  const updatePrices = async () => {
    setUpdating(true);
    try {
      const response = await fetch('https://europe-west1-portfolio-2dd72.cloudfunctions.net/updatePricesManuallyV2', {
        method: 'GET'
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Prix mis à jour:', result);
        await queryClient.invalidateQueries({ queryKey: ['holdings'] });
        await queryClient.invalidateQueries({ queryKey: ['stockPrices'] });
        await queryClient.invalidateQueries({ queryKey: ['portfolioHistory'] });
      } else {
        console.error('Erreur mise à jour prix');
        alert('Erreur lors de la mise à jour des prix');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string, ticker: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer ${ticker} de votre portefeuille ?`)) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteHolding(id);
      await queryClient.invalidateQueries({ queryKey: ['holdings'] });
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Vérification...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="bg-slate-900 border-b border-slate-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                <Skeleton className="h-4 w-20 mb-4" />
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 p-4 border-b border-slate-800">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-32 flex-1" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalInvested = holdings.reduce(
    (sum, h) => sum + (h.nombreActions * h.prixAchatUsd),
    0
  );

  const totalCurrent = holdings.reduce((sum, h) => {
    const currentPrice = stockPrices[h.ticker]?.price || h.prixAchatUsd;
    return sum + (h.nombreActions * currentPrice);
  }, 0);

  const totalGainLoss = totalCurrent - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  const getCategoryStats = (category: string) => {
    const categoryHoldings = holdings.filter(h => h.category === category);
    const categoryValue = categoryHoldings.reduce((sum, h) => {
      const currentPrice = stockPrices[h.ticker]?.price || h.prixAchatUsd;
      return sum + (h.nombreActions * currentPrice);
    }, 0);
    const percentage = totalCurrent > 0 ? (categoryValue / totalCurrent) * 100 : 0;
    const targetPercentage = categoryHoldings.reduce(
      (sum, h) => sum + h.targetPercentage,
      0
    );

    return { categoryValue, percentage, targetPercentage, count: categoryHoldings.length };
  };

  const pilierStats = getCategoryStats('Pilier');
  const satelliteStats = getCategoryStats('Satellite');
  const pariStats = getCategoryStats('Pari');

  // Nouveau : regroupement par catégorie + tri par performance décroissante
  const groupedHoldings: Holding[] = ['Pilier', 'Satellite', 'Pari']
    .map((cat) => {
      const inCategory = holdings.filter(h => h.category === cat);
      return inCategory.sort((a, b) => {
        const priceA = stockPrices[a.ticker]?.price || a.prixAchatUsd;
        const priceB = stockPrices[b.ticker]?.price || b.prixAchatUsd;
        const perfA = a.prixAchatUsd > 0 ? (priceA - a.prixAchatUsd) / a.prixAchatUsd : 0;
        const perfB = b.prixAchatUsd > 0 ? (priceB - b.prixAchatUsd) / b.prixAchatUsd : 0;
        return perfB - perfA; // décroissant
      });
    })
    .flat();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="bg-slate-900 border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Portfolio Tracker</h1>
              <p className="text-slate-400 mt-1 text-sm sm:text-base">Gérez votre portefeuille d&apos;investissement</p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={updatePrices}
                disabled={updating}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-3 sm:px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm disabled:opacity-50"
                title="Mettre à jour manuellement les prix"
              >
                <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={togglePrivacy}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-3 sm:px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm"
                title={isPrivate ? "Afficher les montants" : "Masquer les montants"}
              >
                {isPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={signOut}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-3 sm:px-4 py-2 rounded-lg transition text-sm"
                title="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition flex items-center gap-2 shadow-sm text-sm sm:text-base"
              >
                {showForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                <span className="hidden sm:inline">{showForm ? 'Fermer' : 'Ajouter'}</span>
              </button>
            </div>
          </div>

          {lastUpdate && (
            <p className="text-xs text-slate-500 mt-2">
              Dernière mise à jour: {lastUpdate.toLocaleString('fr-FR')}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {showForm && (
          <div className="mb-6 sm:mb-8">
            <AddStockForm onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['holdings'] });
              setShowForm(false);
            }} />
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="col-span-2 lg:col-span-1 bg-slate-900 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-medium text-slate-400">Valeur Actuelle</p>
              <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">
              <PrivateAmount>${totalCurrent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</PrivateAmount>
            </p>
            <p className="text-xs text-slate-500 mt-1">{holdings.length} positions</p>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-slate-900 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-medium text-slate-400">Gain/Perte</p>
              {totalGainLoss >= 0 ?
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" /> :
                <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
              }
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              <PrivateAmount>{totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</PrivateAmount>
            </p>
            <p className={`text-xs mt-1 font-medium ${totalGainLossPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              <PrivateAmount>{totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%</PrivateAmount>
            </p>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-medium text-blue-400">Pilier</p>
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{pilierStats.percentage.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-1">{pilierStats.count} pos.</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-medium text-green-400">Satellite</p>
              <Satellite className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{satelliteStats.percentage.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-1">{satelliteStats.count} pos.</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-medium text-red-400">Pari</p>
              <Dices className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{pariStats.percentage.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-1">{pariStats.count} pos.</p>
          </div>
        </div>

        <PortfolioCharts holdings={holdings} stockPrices={stockPrices} />

        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden mb-6 sm:mb-8">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800">
            <h2 className="text-lg sm:text-xl font-semibold text-white">Positions</h2>
          </div>

          {/* TABLEAU DESKTOP */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-slate-950 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider min-w-[160px] max-w-[220px]">
                    Nom Complet
                  </th>
                  <th className="px-3 py-2 w-20 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Ticker
                  </th>
                  <th className="px-2 py-2 w-24 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-2 py-2 w-20 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Qté
                  </th>
                  <th className="px-2 py-2 w-24 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Prix Achat
                  </th>
                  <th className="px-2 py-2 w-24 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Prix Actuel
                  </th>
                  <th className="px-2 py-2 w-28 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Valeur
                  </th>
                  <th className="px-2 py-2 w-28 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Gain/Perte
                  </th>
                  <th className="px-2 py-2 min-w-[120px] text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    % Portefeuille
                  </th>
                  <th className="px-2 py-2 w-24 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {groupedHoldings.map((holding) => {
                  const currentPrice = stockPrices[holding.ticker]?.price || holding.prixAchatUsd;
                  const currentValue = holding.nombreActions * currentPrice;
                  const investedValue = holding.nombreActions * holding.prixAchatUsd;
                  const gainLoss = currentValue - investedValue;
                  const gainLossPercent = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;
                  const currentPercentage = totalCurrent > 0 ? (currentValue / totalCurrent) * 100 : 0;
                  const tolerance = holding.targetPercentage * 0.20;
                  const isOnTarget = Math.abs(currentPercentage - holding.targetPercentage) <= tolerance;

                  return (
                    <tr key={holding.id} className="hover:bg-slate-800 transition">
                      {/* Nom complet */}
                      <td className="px-4 py-2 font-bold text-white">
                        {holding.companyName || '-'}
                      </td>

                      {/* Ticker */}
                      <td className="px-4 py-2 text-slate-400 text-sm">
                        {holding.ticker}
                      </td>

                      {/* Catégorie */}
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${holding.category === 'Pilier' ? 'bg-blue-900/50 text-blue-200' :
                            holding.category === 'Satellite' ? 'bg-green-900/50 text-green-200' :
                              'bg-red-900/50 text-red-200'
                            }`}
                        >
                          {holding.category}
                        </span>
                      </td>

                      {/* Quantité */}
                      <td className="px-3 py-2 text-right text-sm text-slate-300 whitespace-nowrap">
                        {holding.nombreActions}
                      </td>

                      {/* Prix achat */}
                      <td className="px-3 py-2 text-right text-sm text-slate-300 whitespace-nowrap">
                        <PrivateAmount>${holding.prixAchatUsd.toFixed(2)}</PrivateAmount>
                      </td>

                      {/* Prix actuel */}
                      <td className="px-3 py-2 text-right text-sm font-medium text-slate-200 whitespace-nowrap">
                        <PrivateAmount>${currentPrice.toFixed(2)}</PrivateAmount>
                      </td>

                      {/* Valeur */}
                      <td className="px-3 py-2 text-right text-sm font-medium text-slate-200 whitespace-nowrap">
                        <PrivateAmount>${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</PrivateAmount>
                      </td>

                      {/* Gain / Perte */}
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <div className={`text-sm font-semibold ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          <PrivateAmount>{gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)}</PrivateAmount>
                          <div className="text-xs">
                            <PrivateAmount>({gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)</PrivateAmount>
                          </div>
                        </div>
                      </td>

                      {/* % Portefeuille */}
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm text-slate-300 font-medium">
                            <PrivateAmount>{currentPercentage.toFixed(1)}%</PrivateAmount>
                          </span>
                          <span className="text-xs text-slate-500">
                            / <PrivateAmount>{holding.targetPercentage}%</PrivateAmount>
                          </span>
                          {isOnTarget ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </td>

                      {/* Boutons */}
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setEditingHolding(holding)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 p-2 rounded-lg transition"
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(holding.id, holding.ticker)}
                            disabled={deletingId === holding.id}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2 rounded-lg transition disabled:opacity-50"
                            title="Supprimer"
                          >
                            {deletingId === holding.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>


            </table>
          </div>

          {/* CARDS MOBILE RESPONSIVE */}
          <div className="lg:hidden divide-y divide-slate-800">
            {groupedHoldings.map((holding) => {
              const currentPrice = stockPrices[holding.ticker]?.price || holding.prixAchatUsd;
              const currentValue = holding.nombreActions * currentPrice;
              const investedValue = holding.nombreActions * holding.prixAchatUsd;
              const gainLoss = currentValue - investedValue;
              const gainLossPercent = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;
              const currentPercentage = totalCurrent > 0 ? (currentValue / totalCurrent) * 100 : 0;
              const tolerance = holding.targetPercentage * 0.20;
              const isOnTarget = Math.abs(currentPercentage - holding.targetPercentage) <= tolerance;

              return (
                <div key={holding.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{holding.companyName || holding.ticker}</h3>
                      <p className="text-sm text-slate-400">{holding.ticker}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${holding.category === 'Pilier' ? 'bg-blue-900/50 text-blue-200' :
                        holding.category === 'Satellite' ? 'bg-green-900/50 text-green-200' :
                          'bg-red-900/50 text-red-200'
                        }`}>
                        {holding.category}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingHolding(holding)}
                        className="text-blue-400 hover:bg-blue-900/30 p-2 rounded-lg"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(holding.id, holding.ticker)}
                        disabled={deletingId === holding.id}
                        className="text-red-400 hover:bg-red-900/30 p-2 rounded-lg disabled:opacity-50"
                      >
                        {deletingId === holding.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs">Quantité</p>
                      <p className="font-semibold text-slate-200">{holding.nombreActions}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Prix Actuel</p>
                      <p className="font-semibold text-slate-200"><PrivateAmount>${currentPrice.toFixed(2)}</PrivateAmount></p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Valeur</p>
                      <p className="font-semibold text-slate-200"><PrivateAmount>${currentValue.toFixed(0)}</PrivateAmount></p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Gain/Perte</p>
                      <p className={`font-semibold ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        <PrivateAmount>{gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(0)} ({gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%)</PrivateAmount>
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-500 text-xs">% Portfolio</p>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-200">
                          <PrivateAmount>{currentPercentage.toFixed(1)}% / {holding.targetPercentage}%</PrivateAmount>
                        </p>
                        {isOnTarget ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {holdings.length === 0 && (
            <div className="text-center py-12 px-4">
              <p className="text-slate-500 text-sm">Aucune position dans votre portefeuille</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Ajouter votre première action →
              </button>
            </div>
          )}
        </div>

        <div className="mb-6 sm:mb-8">
          <PerformanceChart />
        </div>

        <TransactionHistory />
      </div>

      {editingHolding && (
        <EditStockModal
          holding={editingHolding}
          onClose={() => setEditingHolding(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['holdings'] });
            setEditingHolding(null);
          }}
        />
      )}
    </div>
  );
}
