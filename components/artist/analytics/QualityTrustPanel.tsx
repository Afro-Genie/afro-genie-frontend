import React from 'react';
interface Props { data: { approvalRate:number; correctionOpened:number; correctionResolved:number; avgResolutionHours:number; downvoteRate:number }; loading?: boolean }
const Card: React.FC<{label:string; value:string; hint:string}> = ({label,value,hint}) => (
  <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-4"><div className="text-xs text-gray-400">{label}</div><div className="text-2xl font-bold text-white mt-1">{value}</div><div className="text-xs text-gray-500 mt-1">{hint}</div></div>
);
const QualityTrustPanel: React.FC<Props> = ({ data, loading }) => {
  if (loading) return <div className="h-48 bg-gray-800/40 border border-gray-700/50 rounded-xl animate-pulse" />;
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-1">Quality & Trust</h2>
      <p className="text-xs text-gray-400 mb-4">Signals investors and listeners use to trust translation quality.</p>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card label="Approval Rate" value={`${data.approvalRate}%`} hint="Approved/published translations" />
        <Card label="Corrections Opened" value={`${data.correctionOpened}`} hint="In selected range" />
        <Card label="Corrections Resolved" value={`${data.correctionResolved}`} hint="Resolved in range" />
        <Card label="Avg Resolution" value={`${data.avgResolutionHours}h`} hint="Time to resolve" />
        <Card label="Downvote Rate" value={`${data.downvoteRate}%`} hint="Downvotes / all votes" />
      </div>
    </div>
  );
};
export default QualityTrustPanel;
