import React, { useCallback, useEffect, useState } from 'react';
import { translationsApi } from '../services/api';

const StatusDot: React.FC<{ ok: boolean }> = ({ ok }) => (
  <span
    className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`}
  />
);

const Row: React.FC<{ label: string; ok: boolean; detail?: string }> = ({ label, ok, detail }) => (
  <div className="flex items-center justify-between gap-2 text-[11px] leading-tight">
    <div className="flex items-center gap-1.5">
      <StatusDot ok={ok} />
      <span className="text-gray-300">{label}</span>
    </div>
    {detail && <span className="text-gray-500 truncate max-w-[200px]" title={detail}>{detail}</span>}
  </div>
);

const TranslationDiagnosticPanel: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [healthResult, setHealthResult] = useState<any>(null);
  const [sdkTestResult, setSdkTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [healthTesting, setHealthTesting] = useState(false);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'T' && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      setVisible((v) => !v);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const runHealthCheck = async () => {
    setHealthTesting(true);
    try {
      const result = await translationsApi.health();
      setHealthResult(result);
    } catch (err: any) {
      setHealthResult({ healthy: false, error: err.message });
    }
    setHealthTesting(false);
  };

  const runSdkTest = async () => {
    setTesting(true);
    try {
      const result = await translationsApi.testSdk();
      setSdkTestResult(result);
    } catch (err: any) {
      setSdkTestResult({ success: false, error: err.message });
    }
    setTesting(false);
  };

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="fixed bottom-2 left-2 z-[9999] rounded bg-gray-800/90 px-2 py-1 text-[10px] text-gray-400 hover:text-gray-200 border border-gray-700 transition-colors"
        title="Open Translation Diagnostics (Ctrl+Shift+T)"
      >
        Tx
      </button>
    );
  }

  return (
    <div className="fixed bottom-2 left-2 z-[9999] w-[380px] max-h-[70vh] overflow-hidden rounded-lg border border-gray-700 bg-gray-900/95 shadow-2xl text-[11px] font-mono">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-800/60">
        <span className="text-xs font-semibold text-gray-200">Translation Diagnostics</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            {expanded ? '[-]' : '[+]'}
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            [x]
          </button>
        </div>
      </div>

      <div className="px-3 py-2 space-y-3 overflow-y-auto max-h-[calc(70vh-36px)]">
        {/* Health Check Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Service Health</p>
            <button
              onClick={runHealthCheck}
              disabled={healthTesting}
              className="text-[10px] text-blue-400 hover:text-blue-300 disabled:text-gray-500 transition-colors"
            >
              {healthTesting ? 'Testing...' : 'Run Check'}
            </button>
          </div>
          {healthResult && (
            <div className="space-y-1 rounded bg-gray-800/50 p-2">
              <Row
                label="Overall"
                ok={healthResult.healthy}
                detail={healthResult.healthy ? 'All systems operational' : 'Issues detected'}
              />
              <Row
                label="Gemini API"
                ok={healthResult.results?.gemini?.status === 'ok'}
                detail={
                  healthResult.results?.gemini?.status === 'ok'
                    ? `${healthResult.results.gemini.model} (${healthResult.results.gemini.latencyMs}ms)`
                    : healthResult.results?.gemini?.error?.substring(0, 80) || 'Unknown'
                }
              />
              <Row
                label="Redis Queue"
                ok={healthResult.results?.queue?.status === 'ok'}
                detail={
                  healthResult.results?.queue?.status === 'ok'
                    ? `W:${healthResult.results.queue.waiting} A:${healthResult.results.queue.active} C:${healthResult.results.queue.completed} F:${healthResult.results.queue.failed}`
                    : healthResult.results?.queue?.error?.substring(0, 80) || 'Unknown'
                }
              />
              <Row
                label="Translations (24h)"
                ok={healthResult.results?.translations?.status === 'ok'}
                detail={
                  healthResult.results?.translations?.status === 'ok'
                    ? `${healthResult.results.translations.last24h} recent, ${healthResult.results.translations.pending} pending`
                    : 'Error'
                }
              />
              <Row
                label="Total Latency"
                ok={healthResult.totalLatencyMs < 5000}
                detail={`${healthResult.totalLatencyMs}ms`}
              />
            </div>
          )}
        </div>

        {/* SDK Test Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">SDK Quick Test</p>
            <button
              onClick={runSdkTest}
              disabled={testing}
              className="text-[10px] text-blue-400 hover:text-blue-300 disabled:text-gray-500 transition-colors"
            >
              {testing ? 'Testing...' : 'Run Test'}
            </button>
          </div>
          {sdkTestResult && (
            <div className="space-y-1 rounded bg-gray-800/50 p-2">
              <Row
                label="Overall"
                ok={sdkTestResult.success}
                detail={sdkTestResult.success ? 'Passed' : sdkTestResult.error?.substring(0, 80) || 'Failed'}
              />
              {sdkTestResult.detection && (
                <Row
                  label="Language Detection"
                  ok={true}
                  detail={`${sdkTestResult.detection.language} (${(sdkTestResult.detection.confidence * 100).toFixed(0)}%) in ${sdkTestResult.detection.latencyMs}ms`}
                />
              )}
              {sdkTestResult.translation && (
                <>
                  <Row
                    label="Translation"
                    ok={true}
                    detail={`${sdkTestResult.translation.latencyMs}ms, ${sdkTestResult.translation.tokensUsed} tokens`}
                  />
                  <Row
                    label="Model"
                    ok={true}
                    detail={sdkTestResult.translation.model}
                  />
                  <div className="mt-1.5 rounded bg-gray-900/50 p-2 max-h-[120px] overflow-y-auto">
                    <p className="text-[10px] text-gray-400 whitespace-pre-wrap">{sdkTestResult.translation.text}</p>
                  </div>
                  {sdkTestResult.translation.culturalContext && (
                    <div className="mt-1 rounded bg-gray-900/50 p-2 max-h-[80px] overflow-y-auto">
                      <p className="text-[9px] text-gray-500 italic whitespace-pre-wrap">{sdkTestResult.translation.culturalContext}</p>
                    </div>
                  )}
                </>
              )}
              {sdkTestResult.latencyMs && (
                <Row
                  label="Total Time"
                  ok={sdkTestResult.latencyMs < 10000}
                  detail={`${sdkTestResult.latencyMs}ms`}
                />
              )}
            </div>
          )}
        </div>

        {expanded && (
          <div className="space-y-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Info</p>
            <div className="text-[10px] text-gray-500 space-y-0.5">
              <p>Ctrl+Shift+T to toggle this panel</p>
              <p>Gemini 3.5 Flash via @google/genai SDK</p>
              <p>Inline fallback enabled (processes in API if queue fails)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslationDiagnosticPanel;
