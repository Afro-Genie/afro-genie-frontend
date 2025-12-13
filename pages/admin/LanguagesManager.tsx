import React, { useState, useEffect } from 'react';
import { 
  getAllLanguages, 
  addLanguage, 
  updateLanguage, 
  deleteLanguage,
  initializeDefaultLanguages
} from '../../services/languageService';
import { useNotification } from '../../hooks/useNotification';
import Notification from '../../components/Notification';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { Language } from '../../types';

const LanguagesManager: React.FC = () => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { notification, showNotification, hideNotification } = useNotification();

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    setLoading(true);
    try {
      const fetchedLanguages = await getAllLanguages();
      setLanguages(fetchedLanguages);
      
      // Initialize default languages if collection is empty
      if (fetchedLanguages.length === 0) {
        await initializeDefaultLanguages();
        const updated = await getAllLanguages();
        setLanguages(updated);
      }
    } catch (error: any) {
      showNotification({
        message: `Error fetching languages: ${error.message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim()) {
      showNotification({
        message: 'Please fill in both code and name',
        type: 'error'
      });
      return;
    }

    // Validate code format (should be lowercase, 2-10 characters)
    const codeRegex = /^[a-z]{2,10}$/;
    if (!codeRegex.test(formData.code.trim().toLowerCase())) {
      showNotification({
        message: 'Language code must be 2-10 lowercase letters (e.g., "en", "yo", "pidgin")',
        type: 'error'
      });
      return;
    }

    setSubmitting(true);

    try {
      if (editingLanguage) {
        await updateLanguage(editingLanguage.id!, {
          code: formData.code.trim().toLowerCase(),
          name: formData.name.trim()
        });
        showNotification({
          message: 'Language updated successfully!',
          type: 'success'
        });
      } else {
        await addLanguage({
          code: formData.code.trim().toLowerCase(),
          name: formData.name.trim(),
          isActive: true
        });
        showNotification({
          message: 'Language added successfully!',
          type: 'success'
        });
      }

      setFormData({ code: '', name: '' });
      setEditingLanguage(null);
      setShowAddForm(false);
      fetchLanguages();
    } catch (error: any) {
      showNotification({
        message: `Error saving language: ${error.message}`,
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (language: Language) => {
    setEditingLanguage(language);
    setFormData({ code: language.code, name: language.name });
    setShowAddForm(true);
  };

  const handleDelete = async (languageId: string) => {
    if (window.confirm('Are you sure you want to delete this language? This will mark it as inactive.')) {
      try {
        await deleteLanguage(languageId);
        showNotification({
          message: 'Language deleted successfully!',
          type: 'success'
        });
        fetchLanguages();
      } catch (error: any) {
        showNotification({
          message: `Error deleting language: ${error.message}`,
          type: 'error'
        });
      }
    }
  };

  const handleCancel = () => {
    setFormData({ code: '', name: '' });
    setEditingLanguage(null);
    setShowAddForm(false);
  };

  const filteredLanguages = languages.filter(lang =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Languages</h1>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Manage languages for songs and translations</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full sm:w-auto min-h-[44px] bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Language
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">
            {editingLanguage ? 'Edit Language' : 'Add New Language'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Language Code <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., en, yo, pidgin"
                  required
                  disabled={submitting}
                />
                <p className="text-xs text-gray-400 mt-1">ISO 639-1 code (2-10 lowercase letters)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Language Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., English, Yoruba, Pidgin"
                  required
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-4 border-t border-gray-700">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto min-h-[44px] bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-base"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner />
                    {editingLanguage ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {editingLanguage ? 'Update Language' : 'Add Language'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="w-full sm:w-auto min-h-[44px] bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-base"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search languages by name or code..."
          className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Languages List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {filteredLanguages.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {searchQuery ? 'No languages found matching your search.' : 'No languages found. Add your first language!'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Name</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredLanguages.map((language) => (
                  <tr key={language.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-white font-mono text-sm">{language.code}</td>
                    <td className="px-4 py-3 text-white">{language.name}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(language)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors"
                          title="Edit language"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(language.id!)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Delete language"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredLanguages.map((language) => (
          <div key={language.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-white font-semibold">{language.name}</div>
                <div className="text-gray-400 text-sm font-mono">{language.code}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(language)}
                  className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(language.id!)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Notification */}
      <Notification notification={notification} onClose={hideNotification} />
    </div>
  );
};

export default LanguagesManager;

