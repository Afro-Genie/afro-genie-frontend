import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tokenApi, type StoreItem, type StorePurchase } from '../services/tokenService';

const StorePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [purchases, setPurchases] = useState<StorePurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const purchasedIds = new Set(purchases.map((p) => p.item.id));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [storeItems, myPurchases] = await Promise.all([
        tokenApi.getStoreItems(),
        user ? tokenApi.getMyPurchases().catch(() => []) : Promise.resolve<StorePurchase[]>([]),
      ]);
      setItems(storeItems);
      setPurchases(myPurchases);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load store' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePurchase = async (itemId: string) => {
    if (!user) {
      navigate('/');
      return;
    }
    setPurchaseLoading(itemId);
    setMessage(null);
    try {
      const result = await tokenApi.purchaseItem(itemId);
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
        fetchData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Purchase failed' });
    } finally {
      setPurchaseLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Token Store</h1>
          <p className="text-gray-400">Spend your tokens on exclusive items and features</p>
        </div>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-700/50' : 'bg-red-900/50 text-red-300 border border-red-700/50'
          }`}>
            {message.text}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🏪</p>
            <p className="text-gray-400">Store is empty. Check back later!</p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const owned = purchasedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`relative bg-gray-800/50 border rounded-xl p-6 ${
                    owned ? 'border-green-700/50 opacity-75' : 'border-gray-700/50 hover:border-amber-500/30'
                  } transition-all`}
                >
                  {owned && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-green-900/60 text-green-300 text-xs font-medium rounded-full">
                      Owned
                    </div>
                  )}
                  <div className="text-3xl mb-3">
                    {item.category === 'cosmetic' ? '🎨' : item.category === 'feature' ? '⚡' : '🏷️'}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400 font-bold">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                      {item.tokenCost}
                    </div>
                    <button
                      onClick={() => handlePurchase(item.id)}
                      disabled={owned || purchaseLoading === item.id || !user}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        owned
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50'
                      }`}
                    >
                      {purchaseLoading === item.id ? 'Buying...' : owned ? 'Owned' : 'Buy'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {purchases.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-white mb-4">Your Purchases</h2>
            <div className="space-y-2">
              {purchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
                  <div>
                    <p className="text-sm text-white">{p.item.name}</p>
                    <p className="text-xs text-gray-500">{p.item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-amber-400 font-medium">-{p.spentAmount}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StorePage;
