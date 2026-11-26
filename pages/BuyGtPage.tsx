import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  tokenApi,
  type GtBundle,
  type GtPurchase,
  type PassCatalogEntry,
  type PremiumPass,
} from '../services/tokenService';

const naira = (kobo: number): string =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(kobo / 100);

const statusStyles: Record<string, string> = {
  COMPLETED: 'bg-green-900/50 text-green-300',
  PENDING: 'bg-amber-900/50 text-amber-300',
  PROCESSING: 'bg-amber-900/50 text-amber-300',
  FAILED: 'bg-red-900/50 text-red-300',
  REFUNDED: 'bg-gray-700/50 text-gray-400',
};

const BuyGtPage: React.FC = () => {
  const { user, balance, refreshBalance } = useAuth();
  const navigate = useNavigate();

  const [bundles, setBundles] = useState<GtBundle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<GtPurchase[]>([]);
  const [passes, setPasses] = useState<PassCatalogEntry[]>([]);
  const [activePass, setActivePass] = useState<PremiumPass | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'initializing' | 'awaiting' | 'verifying'>('idle');
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [passLoading, setPassLoading] = useState<string | null>(null);

  const pollRef = useRef<number | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      const result = await tokenApi.getGtPurchaseHistory(1, 20);
      setPurchases(result.purchases);
    } catch {
      // non-fatal
    }
  }, [user]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bundleList, passCatalog] = await Promise.all([
        tokenApi.getGtBundles(),
        tokenApi.getPassCatalog().catch(() => [] as PassCatalogEntry[]),
      ]);
      setBundles(bundleList);
      setPasses(passCatalog);
      if (bundleList.length > 0) setSelectedId((prev) => prev ?? bundleList[0].id);

      if (user) {
        await Promise.all([
          loadHistory(),
          tokenApi.getActivePass().then(setActivePass).catch(() => null),
        ]);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load GT bundles' });
    } finally {
      setLoading(false);
    }
  }, [user, loadHistory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const completePurchase = useCallback(
    async (reference: string) => {
      stopPolling();
      setStatus('verifying');
      try {
        const result = await tokenApi.verifyGtPurchase(reference);
        if (result.success) {
          setMessage({
            type: 'success',
            text: `${result.gtCredited} GT credited! New balance: ${result.newBalance ?? balance ?? 0} GT`,
          });
          await refreshBalance();
          await loadHistory();
        } else {
          setMessage({ type: 'error', text: `Payment was not successful (${result.status}).` });
        }
      } catch (err: any) {
        setMessage({ type: 'error', text: err?.message || 'Could not verify payment' });
      } finally {
        setStatus('idle');
        setPendingRef(null);
      }
    },
    [balance, loadHistory, refreshBalance, stopPolling],
  );

  const pollForCompletion = useCallback(
    (reference: string) => {
      stopPolling();
      let attempts = 0;
      pollRef.current = window.setInterval(async () => {
        attempts += 1;
        try {
          const result = await tokenApi.getGtPurchaseHistory(1, 20);
          setPurchases(result.purchases);
          const match = result.purchases.find((p) => p.id === reference);
          if (match?.status === 'COMPLETED') {
            stopPolling();
            setStatus('idle');
            setPendingRef(null);
            setMessage({ type: 'success', text: `${match.gtAmount} GT credited to your wallet!` });
            await refreshBalance();
          }
        } catch {
          // keep polling
        }
        if (attempts >= 30) {
          stopPolling();
          setStatus('idle');
        }
      }, 4000);
    },
    [refreshBalance, stopPolling],
  );

  const handleBuy = async () => {
    if (!user) {
      navigate('/');
      return;
    }
    if (!selectedId) return;

    setStatus('initializing');
    setMessage(null);
    try {
      const init = await tokenApi.initializeGtPurchase(selectedId);
      setPendingRef(init.reference);

      const popup = window.open(init.authorization_url, '_blank', 'noopener,noreferrer');
      if (!popup) {
        window.location.href = init.authorization_url;
        return;
      }

      setStatus('awaiting');
      setMessage({
        type: 'info',
        text: 'Complete the payment in the new tab. This page will update automatically.',
      });
      pollForCompletion(init.reference);
    } catch (err: any) {
      setStatus('idle');
      setMessage({ type: 'error', text: err?.message || 'Could not start checkout' });
    }
  };

  const handleBuyPass = async (passType: string) => {
    if (!user) {
      navigate('/');
      return;
    }
    setPassLoading(passType);
    setMessage(null);
    try {
      const result = await tokenApi.purchasePass(passType as any);
      const creditsSuffix =
        typeof result.translationCredits === 'number'
          ? ` Translation credits remaining: ${result.translationCredits}`
          : '';
      setMessage({ type: 'success', text: `${result.label} activated!${creditsSuffix}` });
      await refreshBalance();
      const fresh = await tokenApi.getActivePass().catch(() => null);
      setActivePass(fresh);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Could not purchase pass' });
    } finally {
      setPassLoading(null);
    }
  };

  const selected = bundles.find((b) => b.id === selectedId) || null;
  const totalGt = selected
    ? selected.gtAmount + Math.floor((selected.gtAmount * selected.bonusPercent) / 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Buy GT</h1>
          <p className="text-gray-400">
            Top up your Genie Tokens. Current balance:{' '}
            <span className="text-amber-400 font-semibold">{balance ?? 0} GT</span>
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                : message.type === 'error'
                ? 'bg-red-900/50 text-red-300 border border-red-700/50'
                : 'bg-blue-900/40 text-blue-200 border border-blue-700/50'
            }`}
          >
            {message.text}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && bundles.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🪙</p>
            <p className="text-gray-400">GT bundles are not available right now.</p>
          </div>
        )}

        {!loading && bundles.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {bundles.map((bundle) => {
                const total = bundle.gtAmount + Math.floor((bundle.gtAmount * bundle.bonusPercent) / 100);
                const isSelected = bundle.id === selectedId;
                return (
                  <button
                    key={bundle.id}
                    onClick={() => setSelectedId(bundle.id)}
                    className={`relative text-left bg-gray-800/50 border rounded-xl p-5 transition-all ${
                      isSelected
                        ? 'border-amber-500 ring-1 ring-amber-500/40'
                        : 'border-gray-700/50 hover:border-amber-500/30'
                    }`}
                  >
                    {bundle.badge && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 bg-amber-600/90 text-white text-[10px] font-bold rounded-full">
                        {bundle.badge}
                      </span>
                    )}
                    <p className="text-sm text-gray-400 mb-1">{bundle.name}</p>
                    <p className="text-2xl font-bold text-white">{total.toLocaleString()} GT</p>
                    {bundle.bonusPercent > 0 && (
                      <p className="text-xs text-green-400 mt-1">+{bundle.bonusPercent}% bonus</p>
                    )}
                    <p className="text-amber-400 font-semibold mt-3">{naira(bundle.priceKobo)}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col items-center">
              <button
                onClick={handleBuy}
                disabled={!selected || status !== 'idle'}
                className="w-full max-w-sm px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {status === 'initializing'
                  ? 'Starting checkout...'
                  : status === 'awaiting'
                  ? 'Waiting for payment...'
                  : status === 'verifying'
                  ? 'Verifying...'
                  : selected
                  ? `Buy ${totalGt.toLocaleString()} GT for ${naira(selected.priceKobo)}`
                  : 'Select a bundle'}
              </button>

              {status === 'awaiting' && pendingRef && (
                <button
                  onClick={() => completePurchase(pendingRef)}
                  className="mt-3 text-sm text-amber-400 hover:text-amber-300 underline"
                >
                  I&apos;ve completed the payment — verify now
                </button>
              )}
            </div>
          </>
        )}

        {passes.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-white mb-1">Premium Passes</h2>
            <p className="text-sm text-gray-400 mb-4">
              Spend GT on time-boxed perks and translation credits.
              {activePass && (
                <span className="text-green-400">
                  {' '}
                  Active: {activePass.type.replace(/_/g, ' ')} (expires{' '}
                  {new Date(activePass.expiresAt).toLocaleDateString()})
                </span>
              )}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {passes.map((pass) => (
                <div
                  key={pass.type}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 flex flex-col"
                >
                  <p className="text-white font-semibold">{pass.label}</p>
                  <p className="text-amber-400 font-bold mt-1">{pass.gtCost} GT</p>
                  <button
                    onClick={() => handleBuyPass(pass.type)}
                    disabled={passLoading === pass.type || !user}
                    className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
                  >
                    {passLoading === pass.type ? 'Buying...' : 'Buy with GT'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {user && purchases.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-white mb-4">Purchase History</h2>
            <div className="space-y-2">
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg"
                >
                  <div>
                    <p className="text-sm text-white">{p.bundleName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(p.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-amber-400 font-medium">+{p.gtAmount} GT</p>
                    <p className="text-xs text-gray-500">{naira(p.amountKobo)}</p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${
                        statusStyles[p.status] ?? 'bg-gray-700/50 text-gray-400'
                      }`}
                    >
                      {p.status}
                    </span>
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

export default BuyGtPage;
