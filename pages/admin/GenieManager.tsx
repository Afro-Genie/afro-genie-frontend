import React, { useState, useEffect } from 'react';
import { getGenieSettings, updateGenieSettings, uploadGenieImage } from '../../services/firebaseService';
import type { GenieSettings } from '../../types';
import { AdminFormPageSkeleton } from '../../components/PageSkeletons';

const GenieManager: React.FC = () => {
  const [settings, setSettings] = useState<GenieSettings>({
    imageUrl: '/Images/gene.png',
    animationType: 'float',
    animationDuration: 3,
    animationDelay: 0,
    opacity: 20,
    size: 'large'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getGenieSettings();
      if (data) {
        setSettings(data);
        setImagePreview(data.imageUrl);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 5MB' });
      return;
    }

    try {
      setUploading(true);
      setMessage(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Firebase Storage
      const imageUrl = await uploadGenieImage(file);
      
      // Update settings with new image URL
      setSettings(prev => ({ ...prev, imageUrl }));
      setMessage({ type: 'success', text: 'Image uploaded successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload image' });
      setImagePreview(settings.imageUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await updateGenieSettings(settings);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const getSizeInPixels = (size: string) => {
    switch (size) {
      case 'small': return '200px';
      case 'medium': return '300px';
      case 'large': return '400px';
      default: return '300px';
    }
  };

  const getAnimationCSS = () => {
    const { animationType, animationDuration, animationDelay } = settings;
    
    let keyframes = '';
    switch (animationType) {
      case 'float':
        keyframes = `
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
        `;
        break;
      case 'bounce':
        keyframes = `
          @keyframes bounce {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-30px); }
          }
        `;
        break;
      case 'pulse':
        keyframes = `
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `;
        break;
      case 'spin':
        keyframes = `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `;
        break;
      default:
        return '';
    }

    return `
      ${keyframes}
      .genie-preview {
        animation: ${animationType} ${animationDuration}s ease-in-out ${animationDelay}s infinite;
      }
    `;
  };

  if (loading) {
    return (
      <AdminFormPageSkeleton />
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Genie Settings</h1>
        <p className="text-gray-400">Customize the floating genie mascot on the homepage</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Settings Form */}
        <div className="bg-[#1a2922] rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">Settings</h2>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Genie Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-green-700 file:text-white
                hover:file:bg-green-600
                file:cursor-pointer cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
            {uploading && <p className="text-sm text-green-400 mt-2">Uploading...</p>}
          </div>

          {/* Animation Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Animation Type
            </label>
            <select
              value={settings.animationType}
              onChange={(e) => setSettings({ ...settings, animationType: e.target.value as any })}
              className="w-full px-3 py-2 bg-[#0d1612] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="float">Float</option>
              <option value="bounce">Bounce</option>
              <option value="pulse">Pulse</option>
              <option value="spin">Spin</option>
              <option value="none">None</option>
            </select>
          </div>

          {/* Animation Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Animation Duration: {settings.animationDuration}s
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={settings.animationDuration}
              onChange={(e) => setSettings({ ...settings, animationDuration: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1s</span>
              <span>10s</span>
            </div>
          </div>

          {/* Animation Delay */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Animation Delay: {settings.animationDelay}s
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={settings.animationDelay}
              onChange={(e) => setSettings({ ...settings, animationDelay: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0s</span>
              <span>5s</span>
            </div>
          </div>

          {/* Opacity */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Background Opacity: {settings.opacity}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={settings.opacity}
              onChange={(e) => setSettings({ ...settings, opacity: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['small', 'medium', 'large'].map((size) => (
                <button
                  key={size}
                  onClick={() => setSettings({ ...settings, size: size as any })}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors capitalize ${
                    settings.size === size
                      ? 'bg-green-700 text-white'
                      : 'bg-[#0d1612] text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveSettings}
            disabled={saving || uploading}
            className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Preview */}
        <div className="bg-[#1a2922] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Preview</h2>
          <div className="relative bg-[#122118] rounded-lg h-[500px] flex items-center justify-center overflow-hidden">
            {/* Background Genie (blurred) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={imagePreview || settings.imageUrl}
                alt="Background Genie"
                className="genie-preview"
                style={{
                  height: getSizeInPixels(settings.size),
                  opacity: settings.opacity / 100,
                  filter: 'blur(2px)'
                }}
              />
            </div>

            {/* Foreground Genie */}
            <div className="relative z-10">
              <img
                src={imagePreview || settings.imageUrl}
                alt="Genie Preview"
                className="genie-preview"
                style={{
                  height: getSizeInPixels(settings.size)
                }}
              />
            </div>

            {/* Animation CSS */}
            <style dangerouslySetInnerHTML={{ __html: getAnimationCSS() }} />
          </div>

          <div className="mt-4 p-4 bg-[#0d1612] rounded-lg">
            <h3 className="text-sm font-semibold text-white mb-2">Current Settings:</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>Animation: <span className="text-green-400 capitalize">{settings.animationType}</span></li>
              <li>Duration: <span className="text-green-400">{settings.animationDuration}s</span></li>
              <li>Delay: <span className="text-green-400">{settings.animationDelay}s</span></li>
              <li>Opacity: <span className="text-green-400">{settings.opacity}%</span></li>
              <li>Size: <span className="text-green-400 capitalize">{settings.size}</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenieManager;



