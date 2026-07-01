import React from 'react';

export const SquareGridSkeleton: React.FC<{ count: number; itemClassName?: string }> = ({
  count,
  itemClassName = 'min-w-[150px] md:min-w-0'
}) => {
  return (
    <div className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`animate-pulse ${itemClassName}`}>
          <div className="aspect-square rounded-xl bg-gray-800/70 border border-gray-700 overflow-hidden">
            <div className="h-full w-full bg-gradient-to-br from-gray-700/80 via-gray-800/70 to-gray-700/60" />
          </div>
          <div className="mt-3 h-4 rounded-full bg-gray-700/80" />
          <div className="mt-2 h-3 rounded-full bg-gray-700/60 w-2/3 mx-auto" />
        </div>
      ))}
    </div>
  );
};

export const SongListSkeleton: React.FC<{ count: number }> = ({ count }) => {
  return (
    <div className="space-y-2 md:space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse flex items-center gap-2 sm:gap-3 md:gap-4 p-3 sm:p-4 min-h-[48px] bg-gray-800/50 rounded-lg sm:rounded-xl border border-gray-700"
        >
          <div className="flex-shrink-0 w-8 sm:w-10 md:w-12 h-4 rounded-full bg-gray-700" />
          <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg bg-gray-700/80" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 rounded-full bg-gray-700/80 w-3/5" />
            <div className="h-3 rounded-full bg-gray-700/60 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const SearchResultsSkeleton: React.FC<{ count: number }> = ({ count }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-gray-700 bg-gray-800/50 overflow-hidden"
        >
          <div className="h-40 bg-gradient-to-br from-gray-700/80 via-gray-800/70 to-gray-700/60" />
          <div className="p-4 space-y-3">
            <div className="h-4 rounded-full bg-gray-700/80 w-4/5" />
            <div className="h-3 rounded-full bg-gray-700/60 w-3/5" />
            <div className="h-3 rounded-full bg-gray-700/50 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const DetailPageSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      <div className="mb-8 h-10 w-28 rounded-full bg-gray-800/70" />
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 mb-8 p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl bg-gray-700/80" />
          <div className="flex-1 space-y-5">
            <div className="h-12 w-3/4 rounded-full bg-gray-700/80" />
            <div className="flex flex-wrap gap-2">
              <div className="h-8 w-24 rounded-full bg-gray-700/70" />
              <div className="h-8 w-20 rounded-full bg-gray-700/70" />
              <div className="h-8 w-28 rounded-full bg-gray-700/70" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="h-24 rounded-lg bg-gray-800/80 border border-gray-700" />
              <div className="h-24 rounded-lg bg-gray-800/80 border border-gray-700" />
              <div className="h-24 rounded-lg bg-gray-800/80 border border-gray-700" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-48 rounded-2xl bg-gray-800/70 border border-gray-700" />
        <div className="h-48 rounded-2xl bg-gray-800/70 border border-gray-700" />
      </div>
    </div>
  );
};