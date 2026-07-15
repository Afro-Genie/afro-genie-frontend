import React, { useCallback, useEffect, useState } from 'react';
import { useWebPlayback } from '../context/WebPlaybackContext';
import { useAudioPlayer } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';
import { spotifyAuthService } from '../services/spotifyAuthService';

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
    {detail && <span className="text-gray-500 truncate max-w-[180px]" title={detail}>{detail}</span>}
  </div>
);

const PlaybackDiagnosticPanel: React.FC = () => {
  const { isSpotifyPremium, user } = useAuth();
  const { isReady, deviceId, sdkError, diagnostics } = useWebPlayback();
  const { playbackMode, sdkPending, sdkPlaybackFailed, sdkPlaybackError } = useAudioPlayer();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'D' && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      setVisible((v) => !v);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="fixed bottom-2 right-2 z-[9999] rounded bg-gray-800/90 px-2 py-1 text-[10px] text-gray-400 hover:text-gray-200 border border-gray-700 transition-colors"
        title="Open Playback Diagnostics (Ctrl+Shift+D)"
      >
        Dx
      </button>
    );
  }

  const token = spotifyAuthService.getStoredAccessToken();
  const refreshToken = spotifyAuthService.getStoredRefreshToken();
  const tokenExpiringSoon = spotifyAuthService.isTokenExpiringSoon();
  const tokenExpired = spotifyAuthService.isTokenExpired();
  const eventLog = diagnostics.eventLog;

  return (
    <div className="fixed bottom-2 right-2 z-[9999] w-[340px] max-h-[70vh] overflow-hidden rounded-lg border border-gray-700 bg-gray-900/95 shadow-2xl text-[11px] font-mono">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-800/60">
        <span className="text-xs font-semibold text-gray-200">Playback Diagnostics</span>
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

      <div className="px-3 py-2 space-y-2 overflow-y-auto max-h-[calc(70vh-36px)]">
        <div className="space-y-1">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">SDK State</p>
          <Row
            label="SDK script in DOM"
            ok={diagnostics.sdkScriptPresent}
            detail={diagnostics.sdkScriptPresent ? 'Present' : 'Absent'}
          />
          <Row
            label="SDK global (window.Spotify)"
            ok={diagnostics.sdkGlobalAvailable}
            detail={diagnostics.sdkGlobalAvailable ? 'function' : diagnostics.sdkGlobalType}
          />
          {diagnostics.spotifyKeys.length > 0 && (
            <Row
              label="window.Spotify keys"
              ok={diagnostics.playerType === 'function'}
              detail={`[${diagnostics.spotifyKeys.join(', ')}]`}
            />
          )}
          {diagnostics.playerType !== 'undefined' && (
            <Row
              label="Spotify.Player type"
              ok={diagnostics.playerType === 'function'}
              detail={diagnostics.playerType}
            />
          )}
          <Row
            label="Player instance created"
            ok={diagnostics.playerCreated}
            detail={diagnostics.playerCreated ? 'Yes' : 'No'}
          />
          <Row
            label="ready event fired"
            ok={diagnostics.readyEventFired}
            detail={diagnostics.readyEventFired ? 'Yes' : 'No'}
          />
          <Row
            label="device_id attached"
            ok={diagnostics.deviceIdAttached}
            detail={deviceId ?? 'None'}
          />
          <Row
            label="SDK error"
            ok={!diagnostics.sdkError}
            detail={diagnostics.sdkError ?? 'None'}
          />
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Auth State</p>
          <Row
            label="User logged in"
            ok={Boolean(user)}
            detail={user?.email ?? 'None'}
          />
          <Row
            label="Spotify Premium"
            ok={isSpotifyPremium}
            detail={user?.spotifyProduct ?? 'Unknown'}
          />
          <Row
            label="Spotify token present"
            ok={Boolean(token)}
            detail={token ? `${token.slice(0, 12)}...` : 'None'}
          />
          <Row
            label="Refresh token present"
            ok={Boolean(refreshToken)}
            detail={refreshToken ? 'Yes' : 'No'}
          />
          <Row
            label="Token expiring soon"
            ok={!tokenExpiringSoon}
            detail={tokenExpiringSoon ? 'Yes' : 'No'}
          />
          <Row
            label="Token expired"
            ok={!tokenExpired}
            detail={tokenExpired ? 'Yes' : 'No'}
          />
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Runtime</p>
          <Row
            label="isReady (context)"
            ok={isReady}
            detail={isReady ? 'Ready' : 'Not ready'}
          />
          <Row
            label="playbackMode"
            ok={playbackMode === 'sdk'}
            detail={
              sdkPending
                ? 'SDK pending'
                : playbackMode === 'sdk'
                  ? 'SDK'
                  : playbackMode === 'preview'
                    ? 'Preview'
                    : 'None'
            }
          />
          {sdkPending && (
            <Row
              label="sdkPending"
              ok={false}
              detail="Waiting for SDK to become ready"
            />
          )}
          {sdkPlaybackFailed && (
            <Row
              label="SDK playback failed"
              ok={false}
              detail={sdkPlaybackError ?? 'Last play request failed'}
            />
          )}
        </div>

        {expanded && (
          <div className="space-y-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
              Event Log ({eventLog.length})
            </p>
            <div className="max-h-[200px] overflow-y-auto space-y-0.5 rounded bg-gray-800/50 p-1.5">
              {eventLog.length === 0 && (
                <p className="text-gray-500 text-[10px]">No events recorded yet.</p>
              )}
              {eventLog.map((evt, i) => {
                const ts = new Date(evt.timestamp).toISOString().slice(11, 23);
                return (
                  <div key={i} className="text-[10px] leading-tight text-gray-400">
                    <span className="text-gray-500">{ts}</span>{' '}
                    <span className="text-blue-400">[{evt.phase}]</span>{' '}
                    <span className="text-gray-300">{evt.message}</span>
                    {evt.data && (
                      <span className="text-gray-500"> {JSON.stringify(evt.data)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaybackDiagnosticPanel;
