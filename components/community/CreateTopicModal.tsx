import React, { useState } from 'react';

interface CreateTopicModalProps {
  categoryId: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => Promise<void>;
}

const CreateTopicModal: React.FC<CreateTopicModalProps> = ({ categoryId, open, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(title.trim(), content.trim());
      setTitle('');
      setContent('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create topic');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-lg mx-4 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-100">Create Topic</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Topic title"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2.5 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
              maxLength={200}
            />
          </div>
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your topic content..."
              className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2.5 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              rows={6}
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !content.trim() || submitting}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Topic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTopicModal;
