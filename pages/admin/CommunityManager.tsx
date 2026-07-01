import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getTopics,
  getCategories,
  deleteTopic,
  pinTopic,
  lockTopic,
  updateTopic,
  createCategory,
  updateCategory,
  deleteCategory,
  getTopicComments,
  deleteComment,
  searchTopics,
  getAllUsers
} from '../../services/firebaseService';
import {
  DeleteIcon,
  EditIcon,
  SearchIcon,
  FilterIcon,
  PlusIcon,
  SaveIcon,
  CancelIcon,
  XIcon
} from '../../components/icons/FlatIcons';
import UserGroupIcon from '../../components/icons/UserGroupIcon';
import type { Topic, ForumCategory, TopicComment } from '../../types';

type ViewMode = 'topics' | 'categories' | 'comments';
type SortBy = 'latest' | 'mostLiked' | 'mostCommented';

const CommunityManager: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('topics');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [comments, setComments] = useState<TopicComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<SortBy>('latest');
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingCategory, setEditingCategory] = useState<ForumCategory | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', icon: 'chat', order: 0 });
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [viewMode, selectedCategory, sortBy, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'topics') {
        let topicsData: Topic[];
        if (searchTerm && searchTerm.trim()) {
          topicsData = await searchTopics(searchTerm);
        } else {
          topicsData = await getTopics(selectedCategory, sortBy, 100);
        }
        setTopics(topicsData);
      } else if (viewMode === 'categories') {
        const cats = await getCategories();
        setCategories(cats);
      } else if (viewMode === 'comments' && selectedTopicId) {
        const comms = await getTopicComments(selectedTopicId);
        setComments(comms);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (window.confirm('Are you sure you want to delete this topic? This action cannot be undone.')) {
      try {
        await deleteTopic(topicId);
        loadData();
      } catch (error) {
        console.error('Error deleting topic:', error);
        alert('Failed to delete topic');
      }
    }
  };

  const handlePinTopic = async (topicId: string, isPinned: boolean) => {
    try {
      await pinTopic(topicId, !isPinned);
      loadData();
    } catch (error) {
      console.error('Error pinning topic:', error);
    }
  };

  const handleLockTopic = async (topicId: string, isLocked: boolean) => {
    try {
      await lockTopic(topicId, !isLocked);
      loadData();
    } catch (error) {
      console.error('Error locking topic:', error);
    }
  };

  const handleSaveTopic = async () => {
    if (!editingTopic || !editingTopic.id) return;
    try {
      await updateTopic(editingTopic.id, {
        title: editingTopic.title,
        content: editingTopic.content,
        category: editingTopic.category
      });
      setEditingTopic(null);
      loadData();
    } catch (error) {
      console.error('Error updating topic:', error);
      alert('Failed to update topic');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category? Topics in this category will not be deleted.')) {
      try {
        await deleteCategory(categoryId);
        loadData();
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category');
      }
    }
  };

  const handleSaveCategory = async () => {
    if (editingCategory && editingCategory.id) {
      try {
        await updateCategory(editingCategory.id, {
          name: editingCategory.name,
          description: editingCategory.description,
          icon: editingCategory.icon,
          order: editingCategory.order
        });
        setEditingCategory(null);
        loadData();
      } catch (error) {
        console.error('Error updating category:', error);
        alert('Failed to update category');
      }
    } else {
      try {
        await createCategory({
          name: newCategory.name,
          description: newCategory.description,
          icon: newCategory.icon,
          order: newCategory.order
        });
        setNewCategory({ name: '', description: '', icon: 'chat', order: 0 });
        loadData();
      } catch (error) {
        console.error('Error creating category:', error);
        alert('Failed to create category');
      }
    }
  };

  const handleDeleteComment = async (commentId: string, topicId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteComment(commentId, topicId);
        loadData();
      } catch (error) {
        console.error('Error deleting comment:', error);
        alert('Failed to delete comment');
      }
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && viewMode === 'topics' && topics.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 rounded-xl bg-gray-800/70 border border-gray-700" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-48 rounded-xl bg-gray-800/70 border border-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Community Management</h1>
          <p className="text-gray-400 mt-1">Manage topics, categories, and comments</p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => {
            setViewMode('topics');
            setSelectedTopicId(null);
          }}
          className={`px-4 py-2 font-semibold transition-colors ${
            viewMode === 'topics'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Topics ({topics.length})
        </button>
        <button
          onClick={() => setViewMode('categories')}
          className={`px-4 py-2 font-semibold transition-colors ${
            viewMode === 'categories'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Categories ({categories.length})
        </button>
        <button
          onClick={() => {
            if (!selectedTopicId) {
              alert('Please select a topic first to view comments');
              return;
            }
            setViewMode('comments');
          }}
          className={`px-4 py-2 font-semibold transition-colors ${
            viewMode === 'comments'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-gray-400 hover:text-white'
          }`}
          disabled={!selectedTopicId}
        >
          Comments {selectedTopicId && `(${comments.length})`}
        </button>
      </div>

      {/* Topics View */}
      {viewMode === 'topics' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || undefined)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="latest">Latest</option>
                <option value="mostLiked">Most Liked</option>
                <option value="mostCommented">Most Discussed</option>
              </select>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory(undefined);
                  setSortBy('latest');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Topics List */}
          <div className="bg-gray-800 rounded-lg">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">All Topics ({topics.length})</h2>
            </div>

            {topics.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No topics found.</div>
            ) : (
              <div className="divide-y divide-gray-700">
                {topics.map((topic) => (
                  <div key={topic.id} className="p-6 hover:bg-gray-700/50 transition-colors">
                    {editingTopic?.id === topic.id ? (
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={editingTopic.title}
                          onChange={(e) => setEditingTopic({ ...editingTopic, title: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                          placeholder="Topic title"
                        />
                        <textarea
                          value={editingTopic.content}
                          onChange={(e) => setEditingTopic({ ...editingTopic, content: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                          rows={4}
                          placeholder="Topic content"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveTopic}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
                          >
                            <SaveIcon className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingTopic(null)}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2"
                          >
                            <CancelIcon className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {topic.isPinned && (
                              <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded">Pinned</span>
                            )}
                            {topic.isLocked && (
                              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">Locked</span>
                            )}
                            <Link
                              to={`/community/topic/${topic.id}`}
                              className="text-lg font-semibold text-white hover:text-green-400 transition-colors"
                            >
                              {topic.title}
                            </Link>
                          </div>
                          <p className="text-gray-400 text-sm mb-2 line-clamp-2">{topic.content}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>By {topic.authorName}</span>
                            <span>•</span>
                            <span>{formatDate(topic.createdAt)}</span>
                            <span>•</span>
                            <span>{topic.likes || 0} likes</span>
                            <span>•</span>
                            <span>{topic.commentCount || 0} comments</span>
                            {topic.category && (
                              <>
                                <span>•</span>
                                <span className="px-2 py-0.5 bg-gray-700 rounded">{topic.category}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handlePinTopic(topic.id!, topic.isPinned)}
                            className={`p-2 rounded-lg transition-colors ${
                              topic.isPinned
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-400'
                            }`}
                            title={topic.isPinned ? 'Unpin' : 'Pin'}
                          >
                            📌
                          </button>
                          <button
                            onClick={() => handleLockTopic(topic.id!, topic.isLocked)}
                            className={`p-2 rounded-lg transition-colors ${
                              topic.isLocked
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-400'
                            }`}
                            title={topic.isLocked ? 'Unlock' : 'Lock'}
                          >
                            🔒
                          </button>
                          <button
                            onClick={() => setEditingTopic(topic)}
                            className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-400 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTopic(topic.id!)}
                            className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <DeleteIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTopicId(topic.id!);
                              setViewMode('comments');
                            }}
                            className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors"
                            title="View Comments"
                          >
                            💬
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categories View */}
      {viewMode === 'categories' && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Create New Category</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Category name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <input
                type="text"
                placeholder="Description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <select
                value={newCategory.icon}
                onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="chat">Chat</option>
                <option value="translate">Translate</option>
                <option value="book">Book</option>
                <option value="users">Users</option>
              </select>
              <input
                type="number"
                placeholder="Order"
                value={newCategory.order}
                onChange={(e) => setNewCategory({ ...newCategory, order: parseInt(e.target.value) || 0 })}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <button
              onClick={handleSaveCategory}
              className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Create Category
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">All Categories ({categories.length})</h2>
            </div>

            {categories.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No categories found.</div>
            ) : (
              <div className="divide-y divide-gray-700">
                {categories.map((category) => (
                  <div key={category.id} className="p-6">
                    {editingCategory?.id === category.id ? (
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={editingCategory.name}
                          onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                        />
                        <textarea
                          value={editingCategory.description}
                          onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveCategory}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
                          >
                            <SaveIcon className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2"
                          >
                            <CancelIcon className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{category.name}</h3>
                          <p className="text-gray-400 text-sm mt-1">{category.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Icon: {category.icon}</span>
                            <span>•</span>
                            <span>Order: {category.order}</span>
                            <span>•</span>
                            <span>Topics: {category.topicCount || 0}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingCategory(category)}
                            className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-400 rounded-lg transition-colors"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id!)}
                            className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                          >
                            <DeleteIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comments View */}
      {viewMode === 'comments' && selectedTopicId && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <button
              onClick={() => {
                setViewMode('topics');
                setSelectedTopicId(null);
              }}
              className="text-green-400 hover:text-green-300 flex items-center gap-2"
            >
              ← Back to Topics
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Comments ({comments.length})</h2>
            </div>

            {comments.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No comments found.</div>
            ) : (
              <div className="divide-y divide-gray-700">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-white">{comment.userName}</span>
                          <span className="text-gray-500 text-sm">•</span>
                          <span className="text-gray-500 text-sm">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="text-gray-300 mb-2">{comment.content}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{comment.likes || 0} likes</span>
                          {comment.parentCommentId && (
                            <span className="px-2 py-0.5 bg-gray-700 rounded">Reply</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(comment.id!, selectedTopicId)}
                        className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors ml-4"
                      >
                        <DeleteIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityManager;

