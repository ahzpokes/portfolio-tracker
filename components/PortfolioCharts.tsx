'use client';

import { PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Holding {
  id: string;
  ticker: string;
  nombreActions: number;
  prixAchatUsd: number;
  category: 'Pilier' | 'Satellite' | 'Pari';
  sector?: string;
}

interface StockPrice {
  price: number;
}

interface PortfolioChartsProps {
  holdings: Holding[];
  stockPrices: Record<string, StockPrice>;
}

const COLORS = {
  Pilier: '#3b82f6',
  Satellite: '#10b981',
  Pari: '#ef4444'
};

export default function PortfolioCharts({ holdings, stockPrices }: PortfolioChartsProps) {
  // Données pour le Pie Chart (une section par action)
  const holdingsData = holdings.map(h => {
    const currentPrice = stockPrices[h.ticker]?.price || h.prixAchatUsd;
    const currentValue = h.nombreActions * currentPrice;

    return {
      name: h.ticker,
      value: parseFloat(currentValue.toFixed(2)),
      category: h.category,
      [h.ticker]: currentValue
    };
  }).sort((a, b) => {
    // Ordre de priorité des catégories
    const categoryOrder = { 'Pilier': 1, 'Satellite': 2, 'Pari': 3 };
    const orderA = categoryOrder[a.category] || 99;
    const orderB = categoryOrder[b.category] || 99;

    if (orderA !== orderB) {
      return orderA - orderB;
    }
    // Si même catégorie, trier par valeur décroissante
    return b.value - a.value;
  });

  const totalValue = holdingsData.reduce((sum, item) => sum + item.value, 0);

  const performanceData = holdings.map(h => {
    const currentPrice = stockPrices[h.ticker]?.price || h.prixAchatUsd;
    const currentValue = h.nombreActions * currentPrice;
    const investedValue = h.nombreActions * h.prixAchatUsd;
    const gainLoss = currentValue - investedValue;
    const gainLossPercent = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;

    return {
      ticker: h.ticker,
      performance: parseFloat(gainLossPercent.toFixed(2)),
      category: h.category
    };
  }).sort((a, b) => b.performance - a.performance);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percentage = totalValue > 0 ? (payload[0].value / totalValue * 100) : 0;

      return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-white">{payload[0].name}</p>
          <p className="text-sm text-slate-300">
            ${payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-400">
            {percentage.toFixed(1)}% du portfolio
          </p>
          <p className="text-xs font-medium" style={{ color: COLORS[payload[0].payload.category as keyof typeof COLORS] }}>
            {payload[0].payload.category}
          </p>
        </div>
      );
    }
    return null;
  };

  const PerformanceTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const isPositive = payload[0].value >= 0;
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-white">{payload[0].payload.ticker}</p>
          <p className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{payload[0].value.toFixed(2)}%
          </p>
          <p className="text-xs text-slate-400">{payload[0].payload.category}</p>
        </div>
      );
    }
    return null;
  };

  if (holdings.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-12 text-center">
        <p className="text-slate-400">Ajoutez des actions pour voir les graphiques 📊</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Répartition
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={holdingsData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry: any) => {
                const percentage = totalValue > 0 ? (entry.value / totalValue * 100) : 0;
                return percentage > 5 ? `${entry.name} ${percentage.toFixed(0)}%` : '';
              }}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {holdingsData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.category as keyof typeof COLORS]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.Pilier }} />
            <span className="text-sm text-slate-400">Pilier</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.Satellite }} />
            <span className="text-sm text-slate-400">Satellite</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.Pari }} />
            <span className="text-sm text-slate-400">Pari</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Performance par Action
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="ticker"
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              stroke="#475569"
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              stroke="#475569"
              label={{ value: '%', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
            />
            <Tooltip
              content={<PerformanceTooltip />}
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            />
            <Bar dataKey="performance" radius={[8, 8, 0, 0]}>
              {performanceData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.performance >= 0 ? '#10b981' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div >
  );
}
