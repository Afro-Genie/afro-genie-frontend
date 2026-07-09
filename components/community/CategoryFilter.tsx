import React from 'react';
import { ForumCategory } from '../../types';

interface CategoryFilterProps {
  categories: ForumCategory[];
  selectedCategory?: string;
  onSelectCategory: (categoryId: string | undefined) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ categories, selectedCategory, onSelectCategory }) => {
  return (
    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Categories</h3>
      <div className="space-y-2">
        <button
          onClick={() => onSelectCategory(undefined)}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
            !selectedCategory
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
          }`}
        >
          All Topics
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
              selectedCategory === category.id
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
          >
            <span>{category.name}</span>
            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">
              {category.topicCount || 0}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;

