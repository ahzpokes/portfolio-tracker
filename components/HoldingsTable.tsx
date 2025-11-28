'use client';

import { RefreshCw, Edit2, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

interface Holding {
  id: string;
  ticker: string;
  companyName?: string;
  nombreActions: number;
  prixAchatUsd: number;
  targetPercentage: number;
  category: 'Pilier' | 'Satellite' | 'Pari';
  dateAchat: any;
}

interface StockPrice {
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: any;
}

interface HoldingsTableProps {
  holdings: Holding[];                            // holdings déjà triés (Pilier, Satellite, Pari + perf)
  stockPrices: Record<string, StockPrice>;
  totalCurrent: number;
  deletingId: string | null;
  onEdit: (holding: Holding) => void;
  onDelete: (id: string, ticker: string) => void;
}

export default function HoldingsTable({
  holdings,
  stockPrices,
  totalCurrent,
  deletingId,
  onEdit,
  onDelete,
}: HoldingsTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 sm:mb-8">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Positions</h2>
      </div>

      {/* TABLEAU DESKTOP */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                Ticker
              </th>
              <th className="px-6 py-3 text-left min-w-[200px] text-xs font-medium text-slate-600 uppercase tracking-wider">
                Nom Complet
              </th>
              <th className="px-6 py-3 text-left w-[90px] text-xs font-medium text-slate-600 uppercase tracking-wider">
                Catégorie
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                Actions
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                Prix Achat
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                Prix Actuel
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                Valeur
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                Gain/Perte
              </th>
              <th className="px-6 py-3 text-right min-w-[110px] text-xs font-medium text-slate-600 uppercase tracking-wider">
                % Portfolio
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {holdings.map((holding) => {
              const currentPrice = stockPrices[holding.ticker]?.price || holding.prixAchatUsd;
              const currentValue = holding.nombreActions * currentPrice;
              const investedValue = holding.nombreActions * holding.prixAchatUsd;
              const gainLoss = currentValue - investedValue;
              const gainLossPercent = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;
              const currentPercentage =
                totalCurrent > 0 ? (currentValue / totalCurrent) * 100 : 0;
              const tolerance = holding.targetPercentage * 0.2;
              const isOnTarget =
                Math.abs(currentPercentage - holding.targetPercentage) <= tolerance;

              return (
                <tr key={holding.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-semibold text-slate-900">{holding.ticker}</td>
                  <td className="px-6 py-4 text-slate-900 truncate">
                    {holding.companyName || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        holding.category === 'Pilier'
                          ? 'bg-blue-100 text-blue-800'
                          : holding.category === 'Satellite'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                      style={{ width: '90px', display: 'inline-block', textAlign: 'center' }}
                    >
                      {holding.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-slate-900">
                    {holding.nombreActions}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-slate-900">
                    ${holding.prixAchatUsd.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                    ${currentPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                    $
                    {currentValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div
                      className={`text-sm font-semibold ${
                        gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {gainLoss >= 0 ? '+' : ''}
                      ${gainLoss.toFixed(2)}
                      <div className="text-xs">
                        ({gainLoss >= 0 ? '+' : ''}
                        {gainLossPercent.toFixed(2)}%)
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right" style={{ minWidth: '110px' }}>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {currentPercentage.toFixed(1)}%
                      </span>
                      <span className="text-xs text-slate-500">
                        / {holding.targetPercentage}%
                      </span>
                      {isOnTarget ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEdit(holding)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition"
                        title="Modifier"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(holding.id, holding.ticker)}
                        disabled={deletingId === holding.id}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition disabled:opacity-50"
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
      <div className="lg:hidden divide-y divide-slate-200">
        {holdings.map((holding) => {
          const currentPrice = stockPrices[holding.ticker]?.price || holding.prixAchatUsd;
          const currentValue = holding.nombreActions * currentPrice;
          const investedValue = holding.nombreActions * holding.prixAchatUsd;
          const gainLoss = currentValue - investedValue;
          const gainLossPercent = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;
          const currentPercentage =
            totalCurrent > 0 ? (currentValue / totalCurrent) * 100 : 0;
          const tolerance = holding.targetPercentage * 0.2;
          const isOnTarget =
            Math.abs(currentPercentage - holding.targetPercentage) <= tolerance;

          return (
            <div key={holding.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{holding.ticker}</h3>
                  <p className="text-sm text-slate-700">{holding.companyName || '-'}</p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                      holding.category === 'Pilier'
                        ? 'bg-blue-100 text-blue-800'
                        : holding.category === 'Satellite'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {holding.category}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(holding)}
                    className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(holding.id, holding.ticker)}
                    disabled={deletingId === holding.id}
                    className="text-red-600 hover:bg-red-50 p-2 rounded-lg disabled:opacity-50"
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
                  <p className="font-semibold text-slate-900">{holding.nombreActions}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Prix Actuel</p>
                  <p className="font-semibold text-slate-900">${currentPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Valeur</p>
                  <p className="font-semibold text-slate-900">${currentValue.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Gain/Perte</p>
                  <p
                    className={`font-semibold ${
                      gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(0)} (
                    {gainLoss >= 0 ? '+' : ''}
                    {gainLossPercent.toFixed(1)}%)
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 text-xs">% Portfolio</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {currentPercentage.toFixed(1)}% / {holding.targetPercentage}%
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
          {/* Le bouton d’ajout reste dans la page, donc pas ici */}
        </div>
      )}
    </div>
  );
}
