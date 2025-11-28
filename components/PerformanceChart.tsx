'use client';

import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getPortfolioHistory, PortfolioHistory } from '@/lib/firestore';
import { Skeleton } from '@/components/Skeleton';

export default function PerformanceChart() {
  const { data: rawHistory = [], isLoading } = useQuery<PortfolioHistory[]>({
    queryKey: ['portfolioHistory'],
    queryFn: () => getPortfolioHistory(30),
  });

  const historyData = rawHistory.map(h => ({
    date: h.date?.toDate?.() || new Date(),
    totalValue: h.totalValue || 0,
    totalInvested: h.totalInvested || 0,
    gainLossPercent: h.gainLossPercent || 0,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold text-white">
            {new Date(payload[0].payload.date).toLocaleDateString('fr-FR')}
          </p>
          <p className="text-sm text-slate-300">
            Valeur: ${payload[0].value.toLocaleString()}
          </p>
          {payload[1] && (
            <p className="text-sm text-slate-400">
              Investi: ${payload[1].value.toLocaleString()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (historyData.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Performance Globale
        </h3>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-slate-400 mb-2">📊 Pas encore d'historique</p>
          <p className="text-sm text-slate-500">
            L'historique sera enregistré lors de la prochaine mise à jour automatique (1h du matin)
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Ou cliquez sur "🔄 Actualiser" pour enregistrer un point maintenant
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
        <h3 className="text-lg font-semibold text-white">
          Performance Globale
        </h3>
        <p className="text-xs text-slate-400">
          Derniers {historyData.length} jours
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={historyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            stroke="#475569"
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            stroke="#475569"
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="totalValue"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 3 }}
            name="Valeur actuelle"
          />
          <Line
            type="monotone"
            dataKey="totalInvested"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: '#94a3b8', r: 3 }}
            name="Montant investi"
          />
        </LineChart>
      </ResponsiveContainer>

      {historyData.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-400">Premier point</p>
            <p className="text-sm font-semibold text-white">
              ${historyData[0].totalValue.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Dernier point</p>
            <p className="text-sm font-semibold text-white">
              ${historyData[historyData.length - 1].totalValue.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Évolution</p>
            <p className={`text-sm font-semibold ${historyData[historyData.length - 1].totalValue >= historyData[0].totalValue
              ? 'text-green-500'
              : 'text-red-500'
              }`}>
              {(((historyData[historyData.length - 1].totalValue - historyData[0].totalValue) / historyData[0].totalValue) * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
