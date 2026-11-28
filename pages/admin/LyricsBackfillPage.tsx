import React from 'react';
import { Link } from 'react-router-dom';
import LyricsBackfillPanel from '../../components/admin/LyricsBackfillPanel';

const LyricsBackfillPage: React.FC = () => (
  <div className="mx-auto max-w-5xl space-y-6">
    <div>
      <Link to="/admin" className="mb-3 inline-flex min-h-[44px] items-center text-gray-400 hover:text-white">
        Back to dashboard
      </Link>
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Lyrics Backfill Operations</h1>
      <p className="mt-1 text-sm text-gray-400 sm:text-base">
        Preview, run, and monitor scheduled or administrator-triggered lyrics enrichment.
      </p>
    </div>
    <LyricsBackfillPanel />
  </div>
);

export default LyricsBackfillPage;
