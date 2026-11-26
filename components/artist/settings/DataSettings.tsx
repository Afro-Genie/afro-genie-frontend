import React, { useState } from 'react';
import { Download, Database, CheckCircle } from 'lucide-react';

const DataSettings: React.FC = () => {
  const [requested, setRequested] = useState(false);

  const handleRequest = () => {
    setRequested(true);
    setTimeout(() => setRequested(false), 3000);
  };

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">Data & Downloads</h2>
        </div>
        <p className="text-sm text-gray-400 mt-1">Export or manage your data</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm text-white">Download My Data</p>
            <p className="text-xs text-gray-500">Request a copy of all your data (streams, songs, translations)</p>
          </div>
          <button
            onClick={handleRequest}
            disabled={requested}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {requested ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                Requested
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Request
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Data exports are typically ready within 48 hours. You will receive an email when your download is available.
        </p>
      </div>
    </div>
  );
};

export default DataSettings;
