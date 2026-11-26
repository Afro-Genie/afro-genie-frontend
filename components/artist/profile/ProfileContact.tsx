import React, { useState, useEffect } from 'react';
import { Edit3, Save, X, Mail, Phone, MapPin } from 'lucide-react';

interface ContactInfo {
  email?: string;
  phone?: string;
  location?: string;
}

interface ProfileContactProps {
  contact: ContactInfo;
  onSave: (contact: ContactInfo) => Promise<void>;
  loading?: boolean;
}

const ProfileContact: React.FC<ProfileContactProps> = ({ contact, onSave, loading }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(contact);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(contact);
  }, [contact]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(contact);
    setEditing(false);
  };

  const fields = [
    { key: 'email' as const, label: 'Email', icon: Mail, placeholder: 'artist@example.com' },
    { key: 'phone' as const, label: 'Phone', icon: Phone, placeholder: '+1 (555) 000-0000' },
    { key: 'location' as const, label: 'Location', icon: MapPin, placeholder: 'Lagos, Nigeria' },
  ];

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Contact Info</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f.key} className="flex items-center gap-3">
                <div className="h-5 w-5 bg-gray-700/50 rounded animate-pulse" />
                <div className="h-4 w-48 bg-gray-700/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : editing ? (
          <div className="space-y-4">
            {fields.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{f.label}</label>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                    <input
                      type={f.key === 'email' ? 'email' : 'text'}
                      value={draft[f.key] || ''}
                      onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                      className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder={f.placeholder}
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((f) => {
              const Icon = f.icon;
              const value = contact[f.key];
              return (
                <div key={f.key} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                  {value ? (
                    <span className="text-sm text-gray-300">{value}</span>
                  ) : (
                    <span className="text-sm text-gray-600 italic">Not provided</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileContact;
