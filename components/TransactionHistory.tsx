'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTransactions, Transaction } from '@/lib/firestore';
import { Skeleton } from '@/components/Skeleton';

export default function TransactionHistory() {
  const [showHistory, setShowHistory] = useState(false);

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: () => getTransactions(50),
    enabled: showHistory,
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ADD':
        return 'bg-green-900/50 text-green-200';
      case 'UPDATE':
        return 'bg-blue-900/50 text-blue-200';
      case 'DELETE':
        return 'bg-red-900/50 text-red-200';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ADD':
        return '➕ Ajout';
      case 'UPDATE':
        return '✏️ Modification';
      case 'DELETE':
        return '🗑️ Suppression';
      default:
        return type;
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800">
        <div className="flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-semibold text-white">
            Historique des Transactions
          </h2>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-blue-400 hover:text-blue-300 font-medium text-sm"
          >
            {showHistory ? 'Masquer' : 'Afficher'}
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-slate-950 rounded-lg">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-20 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-slate-400 py-8">
              Aucune transaction enregistrée
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => {
                const date = transaction.timestamp?.toDate?.() || new Date(transaction.date);

                return (
                  <div
                    key={transaction.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950 rounded-lg hover:bg-slate-800 transition"
                  >
                    <div className="flex items-start gap-3 mb-2 sm:mb-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(transaction.type)}`}>
                        {getTypeLabel(transaction.type)}
                      </span>
                      <div>
                        <p className="font-semibold text-white">{transaction.ticker}</p>
                        <p className="text-xs text-slate-400">
                          {date.toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="text-sm text-slate-300 ml-11 sm:ml-0">
                      {transaction.type === 'ADD' && (
                        <div>
                          <p>{transaction.details.nombreActions} actions @ ${transaction.details.prixAchatUsd}</p>
                          <p className="text-xs text-slate-400">Total: ${transaction.details.totalInvested?.toFixed(2)}</p>
                        </div>
                      )}
                      {transaction.type === 'DELETE' && (
                        <div>
                          <p className="text-red-400">
                            -{transaction.details.nombreActions} actions
                          </p>
                        </div>
                      )}
                      {transaction.type === 'UPDATE' && (
                        <div className="text-xs">
                          <p>Modifications effectuées</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
