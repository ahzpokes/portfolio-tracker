'use client';

import { useState } from 'react';
import { addHolding } from '@/lib/firestore';

interface FormData {
  ticker: string;
  nombreActions: number;
  prixAchatUsd: number;
  targetPercentage: number;
  category: 'Pilier' | 'Satellite' | 'Pari';
}

interface StockInfo {
  ticker: string;
  companyName: string;
  currentPrice: number;
  change?: number;
  changePercent?: number;
}

export default function AddStockForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState<FormData>({
    ticker: '',
    nombreActions: 0,
    prixAchatUsd: 0,
    targetPercentage: 0,
    category: 'Pilier'
  });

  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [validatingTicker, setValidatingTicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateTicker = async () => {
    if (formData.ticker.length < 1) {
      setError('Veuillez entrer un ticker');
      return;
    }

    setValidatingTicker(true);
    setError('');
    setStockInfo(null);

    try {
      const response = await fetch(`/api/stock/${formData.ticker.toUpperCase()}`);

      if (response.ok) {
        const data: StockInfo = await response.json();
        setStockInfo(data);

        setFormData(prev => ({
          ...prev,
          prixAchatUsd: data.currentPrice
        }));
      } else {
        setError('Ticker invalide ou introuvable');
      }
    } catch (err) {
      console.error('Erreur validation:', err);
      setError('Erreur lors de la vérification du ticker');
    } finally {
      setValidatingTicker(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: name === 'category'
        ? value as 'Pilier' | 'Satellite' | 'Pari'
        : name === 'ticker'
          ? value.toUpperCase()
          : parseFloat(value) || 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!formData.ticker) {
        setError('Veuillez entrer un ticker');
        setLoading(false);
        return;
      }

      if (formData.nombreActions <= 0) {
        setError('Le nombre d\'actions doit être supérieur à 0');
        setLoading(false);
        return;
      }

      if (formData.prixAchatUsd <= 0) {
        setError('Le prix d\'achat doit être supérieur à 0');
        setLoading(false);
        return;
      }

      if (formData.targetPercentage < 0 || formData.targetPercentage > 100) {
        setError('La proportion cible doit être entre 0 et 100%');
        setLoading(false);
        return;
      }

      await addHolding(formData);

      setFormData({
        ticker: '',
        nombreActions: 0,
        prixAchatUsd: 0,
        targetPercentage: 0,
        category: 'Pilier'
      });

      setStockInfo(null);
      setSuccess('Action ajoutée avec succès! 🎉');

      onSuccess();

      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Erreur ajout:', err);
      setError('Erreur lors de l\'ajout de l\'action. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
      <h2 className="text-xl font-semibold text-white mb-4">
        Ajouter une Position
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3 items-start">
          {/* Ticker + Bouton Vérifier */}
          <div className="flex gap-2">
            <input
              type="text"
              name="ticker"
              value={formData.ticker}
              onChange={handleChange}
              className="w-24 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase font-semibold text-white placeholder-slate-600"
              placeholder="AAPL"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={validateTicker}
              disabled={validatingTicker || !formData.ticker}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition font-medium text-sm disabled:opacity-50 whitespace-nowrap"
            >
              {validatingTicker ? '⏳' : '🔍'} Vérifier
            </button>
          </div>

          {/* Catégorie */}
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white font-medium"
            disabled={loading}
          >
            <option value="Pilier">Pilier</option>
            <option value="Satellite">Satellite</option>
            <option value="Pari">Pari</option>
          </select>

          {/* Nombre d'actions */}
          <input
            type="number"
            name="nombreActions"
            value={formData.nombreActions || ''}
            onChange={handleChange}
            className="w-24 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white font-medium placeholder-slate-600"
            placeholder="Qté"
            min="1"
            step="1"
            required
            disabled={loading}
          />

          {/* Prix d'achat */}
          <input
            type="number"
            name="prixAchatUsd"
            value={formData.prixAchatUsd || ''}
            onChange={handleChange}
            className="w-28 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white font-medium placeholder-slate-600"
            placeholder="Prix $"
            min="0.01"
            step="0.01"
            required
            disabled={loading}
          />

          {/* Proportion cible */}
          <input
            type="number"
            name="targetPercentage"
            value={formData.targetPercentage || ''}
            onChange={handleChange}
            className="w-24 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white font-medium placeholder-slate-600"
            placeholder="Cible %"
            min="0"
            max="100"
            step="0.1"
            required
            disabled={loading}
          />

          {/* Bouton Ajouter */}
          <button
            type="submit"
            disabled={loading || validatingTicker}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? '⏳ Ajout...' : '+ Ajouter'}
          </button>
        </div>

        {/* Info validation ticker */}
        {stockInfo && !validatingTicker && (
          <div className="px-4 py-2 bg-green-900/20 border border-green-900/50 rounded-lg flex items-center justify-between mt-4">
            <div>
              <p className="text-sm font-semibold text-green-400">
                ✓ {stockInfo.companyName}
              </p>
              <p className="text-xs text-green-500">
                Prix actuel: ${stockInfo.currentPrice?.toFixed(2) || 'N/A'}
                {stockInfo.changePercent !== undefined && (
                  <span className={`ml-2 ${stockInfo.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stockInfo.changePercent >= 0 ? '+' : ''}{stockInfo.changePercent.toFixed(2)}%
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Messages d'erreur/succès */}
        {error && (
          <div className="bg-red-900/20 border border-red-900/50 text-red-400 px-4 py-2 rounded-lg flex items-center text-sm mt-4">
            <span className="mr-2">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-900/50 text-green-400 px-4 py-2 rounded-lg flex items-center text-sm mt-4">
            <span className="mr-2">✅</span>
            <span>{success}</span>
          </div>
        )}
      </form>
    </div>
  );
}
