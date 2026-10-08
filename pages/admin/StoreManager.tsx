import React, { useState, useEffect, useCallback } from 'react';
import {
  tokenApi,
  type AdminStoreItem,
  type AdminStorePurchase,
} from '../../services/tokenService';

const STATUS_LABEL: Record<string, string> = {
  PENDING_FULFILLMENT: 'Pending',
  FULFILLED: 'Fulfilled',
  REFUNDED: 'Refunded',
};

const StoreManager: React.FC = () => {
  const [items, setItems] = useState<AdminStoreItem[]>([]);
  const [purchases, setPurchases] = useState<AdminStorePurchase[]>([]);
  const [purchaseStatus, setPurchaseStatus] = useState('PENDING_FULFILLMENT');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    tokenCost: '',
    category: 'avatar',
    digital: true,
    entitlementType: '',
  });

  const fetchItems = useCallback(async () => {
    try {
      const data = await tokenApi.adminGetStoreItems();
      setItems(data);
    } catch {
      // silent
    }
  }, []);

  const fetchPurchases = useCallback(async (status: string, page = 1) => {
    setLoading(true);
    try {
      const result = await tokenApi.adminGetStorePurchases(status || undefined, page, 20);
      setPurchases(result.data);
      setPagination(result.pagination);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchPurchases(purchaseStatus, 1);
  }, [fetchItems, fetchPurchases, purchaseStatus]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '', description: '', tokenCost: '', category: 'avatar', digital: true, entitlementType: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tokenCost = parseInt(form.tokenCost, 10);
    if (!form.name.trim() || isNaN(tokenCost) || tokenCost <= 0) return;

    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        tokenCost,
        category: form.category,
        metadata: {
          digital: form.digital,
          entitlementType: form.digital && form.entitlementType.trim() ? form.entitlementType.trim() : undefined,
        },
      };
      if (editingId) {
        await tokenApi.adminUpdateStoreItem(editingId, payload);
        setMessage({ type: 'success', text: 'Item updated' });
      } else {
        await tokenApi.adminCreateStoreItem(payload);
        setMessage({ type: 'success', text: 'Item created' });
      }
      resetForm();
      fetchItems();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save item' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: AdminStoreItem) => {
    setEditingId(item.id);
    const metadata = item.metadata && typeof item.metadata === 'object'
      ? (item.metadata as Record<string, unknown>)
      : {};
    setForm({
      name: item.name,
      description: item.description ?? '',
      tokenCost: String(item.tokenCost),
      category: item.category,
      digital: metadata.digital === true,
      entitlementType: typeof metadata.entitlementType === 'string' ? metadata.entitlementType : '',
    });
  };

  const handleToggleActive = async (item: AdminStoreItem) => {
    try {
      await tokenApi.adminUpdateStoreItem(item.id, { active: !item.active });
      setMessage({ type: 'success', text: `${item.name} ${item.active ? 'hidden' : 'shown'}` });
      fetchItems();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update item' });
    }
  };

  const handleDelete = async (item: AdminStoreItem) => {
    if (!window.confirm(`Hide "${item.name}" from the store?`)) return;
    try {
      await tokenApi.adminDeleteStoreItem(item.id);
      setMessage({ type: 'success', text: 'Item hidden' });
      fetchItems();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to hide item' });
    }
  };

  const handleFulfill = async (purchaseId: string) => {
    try {
      await tokenApi.adminFulfillPurchase(purchaseId);
      setMessage({ type: 'success', text: 'Purchase fulfilled' });
      fetchPurchases(purchaseStatus, pagination.page);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to fulfill purchase' });
    }
  };

  const handleRefund = async (purchaseId: string) => {
    if (!window.confirm('Refund this purchase? The GT is returned to the buyer and the reward is revoked.')) return;
    try {
      const result = await tokenApi.adminRefundPurchase(purchaseId);
      setMessage({ type: 'success', text: `Refunded ${result.refund.amount} GT to the buyer` });
      fetchPurchases(purchaseStatus, pagination.page);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to refund purchase' });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Store Manager</h1>
        <p className="text-gray-400 mt-1">Manage store items and fulfill pending purchases.</p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-700/50' : 'bg-red-900/50 text-red-300 border border-red-700/50'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Create/Edit Item */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">{editingId ? 'Edit Item' : 'Add Item'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Item name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
            required
          />
          <input
            type="number"
            placeholder="Token cost"
            value={form.tokenCost}
            onChange={(e) => setForm({ ...form, tokenCost: e.target.value })}
            min={1}
            className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="md:col-span-2 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
          >
            <option value="avatar">Avatar</option>
            <option value="title">Title</option>
            <option value="digital">Digital</option>
            <option value="merch">Merch (manual fulfillment)</option>
          </select>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.digital}
                onChange={(e) => setForm({ ...form, digital: e.target.checked })}
                className="rounded bg-gray-900 border-gray-600"
              />
              Digital (auto-grants entitlement)
            </label>
          </div>
          {form.digital && (
            <input
              type="text"
              placeholder="Entitlement type (e.g. avatar:border:gold)"
              value={form.entitlementType}
              onChange={(e) => setForm({ ...form, entitlementType: e.target.value })}
              className="md:col-span-2 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          )}
          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Item'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Items */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Store Items</h2>
        {items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No items yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-3 font-medium">Item</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Cost</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {items.map((item) => {
                  const metadata = item.metadata && typeof item.metadata === 'object'
                    ? (item.metadata as Record<string, unknown>)
                    : {};
                  return (
                    <tr key={item.id} className="hover:bg-gray-700/30">
                      <td className="py-3">
                        <p className="text-white">{item.name}</p>
                        {item.description && <p className="text-xs text-gray-500 max-w-xs truncate">{item.description}</p>}
                      </td>
                      <td className="py-3 text-gray-300">{item.category}</td>
                      <td className="py-3 font-semibold text-amber-400">{item.tokenCost}</td>
                      <td className="py-3 text-gray-300">{metadata.digital === true ? 'Digital' : 'Manual'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${item.active ? 'bg-green-900/50 text-green-300' : 'bg-gray-700/50 text-gray-400'}`}>
                          {item.active ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="px-2 py-1 text-xs text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(item)}
                            className="px-2 py-1 text-xs text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700"
                          >
                            {item.active ? 'Hide' : 'Show'}
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="px-2 py-1 text-xs text-red-400 border border-red-700/40 rounded-lg hover:bg-red-900/30"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchases / Fulfillment */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Purchases</h2>
          <select
            value={purchaseStatus}
            onChange={(e) => setPurchaseStatus(e.target.value)}
            className="px-3 py-1.5 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
          >
            <option value="PENDING_FULFILLMENT">Pending</option>
            <option value="FULFILLED">Fulfilled</option>
            <option value="REFUNDED">Refunded</option>
            <option value="">All</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : purchases.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No purchases found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-3 font-medium">Buyer</th>
                  <th className="pb-3 font-medium">Item</th>
                  <th className="pb-3 font-medium">Cost</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-700/30">
                    <td className="py-3">
                      <p className="text-white">{purchase.user.displayName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{purchase.user.email}</p>
                    </td>
                    <td className="py-3 text-gray-300">{purchase.item.name}</td>
                    <td className="py-3 font-semibold text-amber-400">{purchase.spentAmount}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        purchase.status === 'FULFILLED'
                          ? 'bg-green-900/50 text-green-300'
                          : purchase.status === 'REFUNDED'
                          ? 'bg-gray-700/50 text-gray-400'
                          : 'bg-amber-900/50 text-amber-300'
                      }`}>
                        {STATUS_LABEL[purchase.status] || purchase.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500 whitespace-nowrap">
                      {new Date(purchase.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3">
                        <div className="flex justify-end gap-2">
                          {purchase.status === 'PENDING_FULFILLMENT' && (
                            <button
                              onClick={() => handleFulfill(purchase.id)}
                              className="px-2 py-1 text-xs text-green-300 border border-green-700/50 rounded-lg hover:bg-green-900/30"
                            >
                              Fulfill
                            </button>
                          )}
                          {purchase.status !== 'REFUNDED' && (
                            <button
                              onClick={() => handleRefund(purchase.id)}
                              className="px-2 py-1 text-xs text-red-300 border border-red-700/50 rounded-lg hover:bg-red-900/30"
                            >
                              Refund
                            </button>
                          )}
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchPurchases(purchaseStatus, pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-sm text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => fetchPurchases(purchaseStatus, pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-sm text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreManager;
