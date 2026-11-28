import React from 'react';

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}

const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  itemLabel,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="px-4 sm:px-6 py-4 border-t border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
        {`Showing ${totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} ${itemLabel}`}
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600 rounded-lg text-white transition-colors text-base font-medium"
        >
          Previous
        </button>
        <span className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-300">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600 rounded-lg text-white transition-colors text-base font-medium"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AdminPagination;
