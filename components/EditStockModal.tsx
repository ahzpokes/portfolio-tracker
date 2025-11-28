'use client';

import { useState, useEffect } from 'react';
import { updateHolding } from '@/lib/firestore';

interface EditStockModalProps {
  holding: {
    id: string;
    ticker: string;
    nombreActions: number;
    prixAchatUsd: number;
    targetPercentage: number;
    category: 'Pilier' | 'Satellite' | 'Pari';
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditStockModal({ holding, onClose, onSuccess }: EditStockModalProps) {
  const [formData, setFormData] = useState({
    nombreActions: holding.nombreActions,
    prixAchatUsd: holding.prixAchatUsd,
    targetPercentage: holding.targetPercentage,
    category: holding.category
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: name === 'category' ? value : parseFloat(value) || 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
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

      await updateHolding(holding.id, formData);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Erreur modification:', err);
      setError('Erreur lors de la modification. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">
            Modifier {holding.ticker}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Catégorie
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white font-medium"
              disabled={loading}
            >
              <option value="Pilier">📊 Pilier</option>
              <option value="Satellite">🛰️ Satellite</option>
              <option value="Pari">🎲 Pari</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Nombre d'actions
            </label>
            <input
              type="number"
              name="nombreActions"
              value={formData.nombreActions || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white font-medium"
              min="1"
              step="1"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Prix d'achat (USD)
            </label>
            <input
              type="number"
              name="prixAchatUsd"
              value={formData.prixAchatUsd || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white font-medium"
              min="0.01"
              step="0.01"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Proportion cible (%)
            </label>
            <input
              type="number"
              name="targetPercentage"
              value={formData.targetPercentage || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white font-medium"
              min="0"
              max="100"
              step="0.1"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-900/50 text-red-400 px-4 py-2 rounded-lg flex items-center text-sm">
              <span className="mr-2">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition font-medium"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50"
            >
              {loading ? '⏳ Modification...' : '✓ Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
