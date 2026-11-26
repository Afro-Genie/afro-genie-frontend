import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../hooks/useNotification';
import { useConfirm } from '../../hooks/useConfirm';
import Notification from '../../components/Notification';
import ConfirmDialog from '../../components/ConfirmDialog';
import AdminPagination from '../../components/admin/AdminPagination';
import { AdminListPageSkeleton } from '../../components/PageSkeletons';

type ViewMode = 'topics' | 'categories' | 'comments';
type TopicSortBy = 'createdAt' | 'likes' | 'commentCount' | 'title';

interface AdminTopic {
  id: string;
  title: string;
  content: string;
  authorName: string;
  categoryName: string;
  likes: number;
  commentCount: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
}

interface AdminCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  topicCount: number;
  memberCount: number;
}

interface AdminComment {
  id: string;
  content: string;
  userName: string;
  likes: number;
  parentCommentId: string | null;
  createdAt: string;
  replies: AdminComment[];
}

interface CategoryFormData {
  id: string | null;
  name: string;
  description: string;
  icon: string;
  order: string;
}

const emptyCategoryForm: CategoryFormData = { id: null, name: '', description: '', icon: 'chat', order: '0' };

const toQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
  const query = search.toString();
  return query ? `?${query}` : '';
};

const formatDate = (timestamp: any) => {
  if (!timestamp) return 'Unknown';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const mapComment = (comment: any): AdminComment => ({
  id: comment.id,
  content: comment.content || '',
  userName: comment.user?.displayName || comment.userName || 'Anonymous',
  likes: Number(comment.likes) || 0,
  parentCommentId: comment.parentCommentId || null,
  createdAt: comment.createdAt,
  replies: Array.isArray(comment.replies) ? comment.replies.map(mapComment) : [],
});

const CommunityManager: React.FC = () => {
  const { authFetch, applyBalance } = useAuth();
  const { notification, showNotification, hideNotification } = useNotification();
  const { confirmState, confirm } = useConfirm();

  const [viewMode, setViewMode] = useState<ViewMode>('topics');

  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicSearch, setTopicSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<TopicSortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [topicPage, setTopicPage] = useState(1);
  const [filteredTopics, setFilteredTopics] = useState(0);
  const [topicTotalPages, setTopicTotalPages] = useState(1);

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryPage, setCategoryPage] = useState(1);
  const [filteredCategories, setFilteredCategories] = useState(0);
  const [categoryTotalPages, setCategoryTotalPages] = useState(1);

  const [totalTopics, setTotalTopics] = useState(0);
  const [pinnedCount, setPinnedCount] = useState(0);
  const [totalCategories, setTotalCategories] = useState(0);
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; name: string }[]>([]);

  const [selectedTopic, setSelectedTopic] = useState<{ id: string; title: string } | null>(null);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [topicForm, setTopicForm] = useState<{ id: string; title: string; content: string } | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const itemsPerPage = 20;
  const topicSequence = useRef(0);
  const categorySequence = useRef(0);
  const commentSequence = useRef(0);

  const fetchTotals = useCallback(async () => {
    try {
      const [topicsTotals, categoriesTotals] = await Promise.all([
        authFetch('/api/community/topics' + toQuery({ page: 1, limit: 1 })),
        authFetch('/api/community/categories' + toQuery({ page: 1, limit: 1 })),
      ]);
      setTotalTopics(Number(topicsTotals?.total) || 0);
      setPinnedCount(Number(topicsTotals?.pinnedCount) || 0);
      setTotalCategories(Number(categoriesTotals?.total) || 0);
    } catch {
      // Totals are non-critical; list fetches surface errors.
    }
  }, [authFetch]);

  const fetchCategoryOptions = useCallback(async () => {
    try {
      const response = await authFetch('/api/community/categories');
      const list = Array.isArray(response) ? response : response?.data || [];
      setCategoryOptions(list.map((c: any) => ({ id: c.id, name: c.name })));
    } catch {
      // Options are non-critical.
    }
  }, [authFetch]);

  const fetchTopics = useCallback(async (forceFresh = false) => {
    const sequence = ++topicSequence.current;
    setTopicsLoading(true);
    try {
      const fresh = forceFresh ? { _ts: Date.now() } : {};
      const response = await authFetch('/api/community/topics' + toQuery({
        page: topicPage,
        limit: itemsPerPage,
        search: topicSearch.trim() || undefined,
        categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
        sortBy,
        sortOrder,
        ...fresh,
      }));
      if (sequence !== topicSequence.current) return;

      const topicsData = Array.isArray(response?.topics) ? response.topics : [];
      setTopics(topicsData.map((topic: any) => ({
        id: topic.id,
        title: topic.title || '',
        content: topic.content || '',
        authorName: topic.author?.displayName || 'Anonymous',
        categoryName: topic.category?.name || '',
        likes: Number(topic.likes) || 0,
        commentCount: Number(topic.commentCount) || 0,
        isPinned: Boolean(topic.isPinned),
        isLocked: Boolean(topic.isLocked),
        createdAt: topic.createdAt,
      })));

      const total = Number(response?.total) || 0;
      setFilteredTopics(total);
      const responseTotalPages = Math.max(1, Math.ceil(total / itemsPerPage));
      setTopicTotalPages(responseTotalPages);
      if (topicPage > responseTotalPages) {
        setTopicPage(responseTotalPages);
        return;
      }
    } catch (error: any) {
      if (sequence !== topicSequence.current) return;
      showNotification({ message: `Error loading topics: ${error.message}`, type: 'error' });
    } finally {
      if (sequence === topicSequence.current) setTopicsLoading(false);
    }
  }, [authFetch, categoryFilter, itemsPerPage, showNotification, sortBy, sortOrder, topicPage, topicSearch]);

  const fetchCategories = useCallback(async (forceFresh = false) => {
    const sequence = ++categorySequence.current;
    setCategoriesLoading(true);
    try {
      const fresh = forceFresh ? { _ts: Date.now() } : {};
      const response = await authFetch('/api/community/categories' + toQuery({
        page: categoryPage,
        limit: itemsPerPage,
        search: categorySearch.trim() || undefined,
        ...fresh,
      }));
      if (sequence !== categorySequence.current) return;

      const categoriesData = Array.isArray(response?.data) ? response.data : [];
      setCategories(categoriesData.map((category: any) => ({
        id: category.id,
        name: category.name || '',
        description: category.description || '',
        icon: category.icon || 'chat',
        order: Number(category.order) || 0,
        topicCount: Number(category.topicCount) || 0,
        memberCount: Number(category.memberCount) || 0,
      })));

      setFilteredCategories(Number(response?.total) || 0);
      const responseTotalPages = Math.max(1, Number(response?.totalPages) || 1);
      setCategoryTotalPages(responseTotalPages);
      if (categoryPage > responseTotalPages) {
        setCategoryPage(responseTotalPages);
        return;
      }
    } catch (error: any) {
      if (sequence !== categorySequence.current) return;
      showNotification({ message: `Error loading categories: ${error.message}`, type: 'error' });
    } finally {
      if (sequence === categorySequence.current) setCategoriesLoading(false);
    }
  }, [authFetch, categoryPage, categorySearch, itemsPerPage, showNotification]);

  const fetchComments = useCallback(async () => {
    if (!selectedTopic) return;
    const sequence = ++commentSequence.current;
    setCommentsLoading(true);
    try {
      const response = await authFetch(`/api/community/topics/${selectedTopic.id}`);
      if (sequence !== commentSequence.current) return;
      const commentsData = Array.isArray(response?.comments) ? response.comments : [];
      setComments(commentsData.map(mapComment));
    } catch (error: any) {
      if (sequence !== commentSequence.current) return;
      showNotification({ message: `Error loading comments: ${error.message}`, type: 'error' });
    } finally {
      if (sequence === commentSequence.current) setCommentsLoading(false);
    }
  }, [authFetch, selectedTopic, showNotification]);

  useEffect(() => {
    void fetchTotals();
    void fetchCategoryOptions();
  }, [fetchTotals, fetchCategoryOptions]);

  useEffect(() => {
    if (viewMode !== 'topics') return;
    const delay = topicSearch.trim() ? 250 : 0;
    const timer = window.setTimeout(() => void fetchTopics(), delay);
    return () => window.clearTimeout(timer);
  }, [fetchTopics, topicSearch, viewMode]);

  useEffect(() => {
    if (viewMode !== 'categories') return;
    const delay = categorySearch.trim() ? 250 : 0;
    const timer = window.setTimeout(() => void fetchCategories(), delay);
    return () => window.clearTimeout(timer);
  }, [fetchCategories, categorySearch, viewMode]);

  useEffect(() => {
    if (viewMode !== 'comments') return;
    void fetchComments();
  }, [fetchComments, viewMode]);

  const refreshAfterTopicChange = () => {
    void fetchTopics(true);
    void fetchTotals();
  };

  const refreshAfterCategoryChange = () => {
    void fetchCategories(true);
    void fetchCategoryOptions();
    void fetchTotals();
  };

  const handlePinTopic = async (topic: AdminTopic) => {
    try {
      const result = await authFetch(`/api/community/topics/${topic.id}/pin`, { method: 'PATCH' });
      if (result?.reward?.balance != null) applyBalance(result.reward.balance);
      showNotification({
        message: (result?.isPinned ?? !topic.isPinned) ? 'Topic pinned!' : 'Topic unpinned!',
        type: 'success'
      });
      refreshAfterTopicChange();
    } catch (error: any) {
      showNotification({ message: `Error pinning topic: ${error.message}`, type: 'error' });
    }
  };

  const handleLockTopic = async (topic: AdminTopic) => {
    try {
      const result = await authFetch(`/api/community/topics/${topic.id}/lock`, { method: 'PATCH' });
      if (result?.reward?.balance != null) applyBalance(result.reward.balance);
      showNotification({
        message: (result?.isLocked ?? !topic.isLocked) ? 'Topic locked!' : 'Topic unlocked!',
        type: 'success'
      });
      refreshAfterTopicChange();
    } catch (error: any) {
      showNotification({ message: `Error locking topic: ${error.message}`, type: 'error' });
    }
  };

  const handleSaveTopic = async () => {
    if (!topicForm) return;
    if (!topicForm.title.trim()) {
      showNotification({ message: 'Topic title is required', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      await authFetch(`/api/community/topics/${topicForm.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: topicForm.title.trim(), content: topicForm.content }),
      });
      showNotification({ message: 'Topic updated successfully!', type: 'success' });
      setTopicForm(null);
      refreshAfterTopicChange();
    } catch (error: any) {
      showNotification({ message: `Error updating topic: ${error.message}`, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTopic = async (topic: AdminTopic) => {
    const hasConfirmed = await confirm({
      title: 'Delete Topic',
      message: `Are you sure you want to delete "${topic.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!hasConfirmed) return;

    try {
      await authFetch(`/api/community/topics/${topic.id}`, { method: 'DELETE' });
      showNotification({ message: 'Topic deleted successfully!', type: 'success' });
      refreshAfterTopicChange();
    } catch (error: any) {
      showNotification({ message: `Error deleting topic: ${error.message}`, type: 'error' });
    }
  };

  const openComments = (topic: AdminTopic) => {
    setSelectedTopic({ id: topic.id, title: topic.title });
    setViewMode('comments');
  };

  const handleSaveCategory = async () => {
    if (!categoryForm) return;
    if (!categoryForm.name.trim()) {
      showNotification({ message: 'Category name is required', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
        icon: categoryForm.icon,
        order: Number(categoryForm.order) || 0,
      };

      if (categoryForm.id) {
        await authFetch(`/api/community/categories/${categoryForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showNotification({ message: 'Category updated successfully!', type: 'success' });
      } else {
        await authFetch('/api/community/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showNotification({ message: 'Category created successfully!', type: 'success' });
      }

      setCategoryForm(null);
      refreshAfterCategoryChange();
    } catch (error: any) {
      showNotification({ message: `Error saving category: ${error.message}`, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (category: AdminCategory) => {
    const hasConfirmed = await confirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete "${category.name}"? Topics in this category will not be deleted.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!hasConfirmed) return;

    try {
      await authFetch(`/api/community/categories/${category.id}`, { method: 'DELETE' });
      showNotification({ message: 'Category deleted successfully!', type: 'success' });
      if (categoryFilter === category.id) setCategoryFilter('all');
      refreshAfterCategoryChange();
    } catch (error: any) {
      showNotification({ message: `Error deleting category: ${error.message}`, type: 'error' });
    }
  };

  const handleDeleteComment = async (comment: AdminComment) => {
    const hasConfirmed = await confirm({
      title: 'Delete Comment',
      message: 'Are you sure you want to delete this comment? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!hasConfirmed) return;

    try {
      await authFetch(`/api/community/comments/${comment.id}`, { method: 'DELETE' });
      showNotification({ message: 'Comment deleted successfully!', type: 'success' });
      void fetchComments();
      void fetchTotals();
    } catch (error: any) {
      showNotification({ message: `Error deleting comment: ${error.message}`, type: 'error' });
    }
  };

  const resetTopicFilters = () => {
    setTopicSearch('');
    setCategoryFilter('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    setTopicPage(1);
  };

  const renderTopicBadges = (topic: AdminTopic) => (
    <>
      {topic.isPinned && (
        <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">Pinned</span>
      )}
      {topic.isLocked && (
        <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">Locked</span>
      )}
    </>
  );

  const renderTopicActions = (topic: AdminTopic) => (
    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => void handlePinTopic(topic)}
        className={`px-3 py-1 text-sm font-semibold rounded transition-colors ${topic.isPinned ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        title={topic.isPinned ? 'Unpin' : 'Pin'}
      >
        {topic.isPinned ? 'Unpin' : 'Pin'}
      </button>
      <button
        onClick={() => void handleLockTopic(topic)}
        className={`px-3 py-1 text-sm font-semibold rounded transition-colors ${topic.isLocked ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        title={topic.isLocked ? 'Unlock' : 'Lock'}
      >
        {topic.isLocked ? 'Unlock' : 'Lock'}
      </button>
      <button
        onClick={() => setTopicForm({ id: topic.id, title: topic.title, content: topic.content })}
        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
      >
        Edit
      </button>
      <button
        onClick={() => openComments(topic)}
        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded transition-colors"
      >
        Comments
      </button>
      <button
        onClick={() => void handleDeleteTopic(topic)}
        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition-colors"
      >
        Delete
      </button>
    </div>
  );

  const renderComment = (comment: AdminComment, depth = 0): React.ReactNode => (
    <div key={comment.id} className={depth > 0 ? 'ml-6 sm:ml-10 border-l border-gray-700 pl-4' : ''}>
      <div className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-white text-sm">{comment.userName}</span>
              <span className="text-gray-500 text-xs">{formatDate(comment.createdAt)}</span>
              {comment.parentCommentId && (
                <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full">Reply</span>
              )}
            </div>
            <p className="text-gray-300 text-sm whitespace-pre-wrap break-words">{comment.content}</p>
            <p className="text-xs text-gray-500 mt-1">{comment.likes} likes</p>
          </div>
          <button
            onClick={() => void handleDeleteComment(comment)}
            className="flex-shrink-0 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
      {comment.replies.map((reply) => renderComment(reply, depth + 1))}
    </div>
  );

  const activeLoading = viewMode === 'topics' ? topicsLoading : viewMode === 'categories' ? categoriesLoading : commentsLoading;

  if (activeLoading) {
    return (
      <AdminListPageSkeleton rows={8} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Community Management</h1>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Manage topics, categories, and comments</p>
        </div>
        {viewMode === 'categories' && (
          <button
            onClick={() => setCategoryForm(emptyCategoryForm)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[44px] sm:w-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Category
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Total Topics</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{totalTopics}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Filtered Results</p>
          <p className="text-xl sm:text-2xl font-bold text-white">
            {viewMode === 'categories' ? filteredCategories : filteredTopics}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Pinned Topics</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{pinnedCount}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Categories</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{totalCategories}</p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => {
            setViewMode('topics');
            setSelectedTopic(null);
          }}
          className={`px-4 py-2 font-semibold transition-colors ${
            viewMode === 'topics'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Topics
        </button>
        <button
          onClick={() => {
            setViewMode('categories');
            setSelectedTopic(null);
          }}
          className={`px-4 py-2 font-semibold transition-colors ${
            viewMode === 'categories'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Categories
        </button>
        {viewMode === 'comments' && selectedTopic && (
          <button className="px-4 py-2 font-semibold text-green-400 border-b-2 border-green-400">
            Comments
          </button>
        )}
      </div>

      {/* Topics View */}
      {viewMode === 'topics' && (
        <>
          {/* Search and Filters */}
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={topicSearch}
                    onChange={(e) => {
                      setTopicSearch(e.target.value);
                      setTopicPage(1);
                    }}
                    placeholder="Search by title, content, or author..."
                    className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <svg
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label htmlFor="topic-category-filter" className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  id="topic-category-filter"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setTopicPage(1);
                  }}
                  className="w-full select-chevron px-3 pr-10 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div className="lg:col-span-2">
                <label htmlFor="topic-sort-by" className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                <div className="flex gap-2">
                  <select
                    id="topic-sort-by"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as TopicSortBy);
                      setTopicPage(1);
                    }}
                    className="flex-1 select-chevron px-3 pr-10 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="createdAt">Date Created</option>
                    <option value="likes">Likes</option>
                    <option value="commentCount">Comments</option>
                    <option value="title">Title</option>
                  </select>
                  <button
                    onClick={() => {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      setTopicPage(1);
                    }}
                    className="px-3 py-2.5 min-w-[44px] bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white transition-colors"
                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>

            {/* Reset Filters */}
            {(topicSearch || categoryFilter !== 'all') && (
              <button
                onClick={resetTopicFilters}
                className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset Filters
              </button>
            )}
          </div>

          {/* Topics List */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            {topics.length === 0 ? (
              <div className="p-6 sm:p-12 text-center">
                <div className="text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-lg font-semibold text-white mb-2">No Topics Found</p>
                  <p>Try adjusting your filters or search query</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-gray-900 border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Topic
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Author
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Likes
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Comments
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {topics.map((topic) => (
                        <tr key={topic.id} className="hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-1">
                              {renderTopicBadges(topic)}
                              <Link
                                to={`/community/topic/${topic.id}`}
                                className="font-medium text-white hover:text-green-400 transition-colors line-clamp-1"
                              >
                                {topic.title}
                              </Link>
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-1 max-w-[320px]">{topic.content}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">{topic.authorName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {topic.categoryName ? (
                              <span className="px-2 py-1 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">
                                {topic.categoryName}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">{topic.likes}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">{topic.commentCount}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">{formatDate(topic.createdAt)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {renderTopicActions(topic)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-700">
                  {topics.map((topic) => (
                    <div key={topic.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        {renderTopicBadges(topic)}
                        <Link
                          to={`/community/topic/${topic.id}`}
                          className="font-semibold text-white hover:text-green-400 transition-colors line-clamp-1"
                        >
                          {topic.title}
                        </Link>
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-2 mb-2">{topic.content}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
                        <span>By {topic.authorName}</span>
                        {topic.categoryName && <span>{topic.categoryName}</span>}
                        <span>{topic.likes} likes</span>
                        <span>{topic.commentCount} comments</span>
                        <span>{formatDate(topic.createdAt)}</span>
                      </div>
                      {renderTopicActions(topic)}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            <AdminPagination
              currentPage={topicPage}
              totalPages={topicTotalPages}
              totalItems={filteredTopics}
              itemsPerPage={itemsPerPage}
              itemLabel="topics"
              onPageChange={setTopicPage}
            />
          </div>
        </>
      )}

      {/* Categories View */}
      {viewMode === 'categories' && (
        <>
          {/* Search */}
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => {
                      setCategorySearch(e.target.value);
                      setCategoryPage(1);
                    }}
                    placeholder="Search by name or description..."
                    className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <svg
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {categorySearch && (
              <button
                onClick={() => {
                  setCategorySearch('');
                  setCategoryPage(1);
                }}
                className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset Filters
              </button>
            )}
          </div>

          {/* Categories List */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            {categories.length === 0 ? (
              <div className="p-6 sm:p-12 text-center">
                <div className="text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="text-lg font-semibold text-white mb-2">No Categories Found</p>
                  <p>Try adjusting your search or add a new category</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead className="bg-gray-900 border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Icon
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Order
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Topics
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Members
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {categories.map((category) => (
                        <tr
                          key={category.id}
                          className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                          onClick={() => setCategoryForm({
                            id: category.id,
                            name: category.name,
                            description: category.description,
                            icon: category.icon,
                            order: String(category.order),
                          })}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCategoryForm({ id: category.id, name: category.name, description: category.description, icon: category.icon, order: String(category.order) }); } }}
                          tabIndex={0}
                          role="button"
                          aria-label={`Edit ${category.name}`}
                        >
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">{category.name}</div>
                            <div className="text-xs text-gray-400 line-clamp-1 max-w-[320px]">{category.description}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">{category.icon}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">{category.order}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">{category.topicCount}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">{category.memberCount}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setCategoryForm({
                                  id: category.id,
                                  name: category.name,
                                  description: category.description,
                                  icon: category.icon,
                                  order: String(category.order),
                                })}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => void handleDeleteCategory(category)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-700">
                  {categories.map((category) => (
                    <div key={category.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                      <h3 className="font-semibold text-white mb-1">{category.name}</h3>
                      <p className="text-sm text-gray-400 line-clamp-2 mb-2">{category.description}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
                        <span>Icon: {category.icon}</span>
                        <span>Order: {category.order}</span>
                        <span>{category.topicCount} topics</span>
                        <span>{category.memberCount} members</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setCategoryForm({
                            id: category.id,
                            name: category.name,
                            description: category.description,
                            icon: category.icon,
                            order: String(category.order),
                          })}
                          className="flex-1 min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void handleDeleteCategory(category)}
                          className="flex-1 min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            <AdminPagination
              currentPage={categoryPage}
              totalPages={categoryTotalPages}
              totalItems={filteredCategories}
              itemsPerPage={itemsPerPage}
              itemLabel="categories"
              onPageChange={setCategoryPage}
            />
          </div>
        </>
      )}

      {/* Comments View */}
      {viewMode === 'comments' && selectedTopic && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white line-clamp-1">Comments on "{selectedTopic.title}"</h2>
              <p className="text-xs text-gray-400 mt-1">Showing the first 20 top-level comments and their replies</p>
            </div>
            <button
              onClick={() => {
                setViewMode('topics');
                setSelectedTopic(null);
              }}
              className="min-h-[44px] px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white text-sm font-medium transition-colors flex-shrink-0"
            >
              ← Back to Topics
            </button>
          </div>

          {comments.length === 0 ? (
            <div className="p-6 sm:p-12 text-center text-gray-400">
              <p className="text-lg font-semibold text-white mb-2">No Comments Found</p>
              <p>This topic has no comments yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700 px-4 sm:px-6">
              {comments.map((comment) => renderComment(comment))}
            </div>
          )}
        </div>
      )}

      {/* Topic Edit Modal */}
      {topicForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !submitting && setTopicForm(null)}>
          <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Edit topic">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Edit Topic</h2>
              <button onClick={() => !submitting && setTopicForm(null)} className="text-gray-400 hover:text-white" aria-label="Close">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="topic-title" className="mb-1 block text-sm font-medium text-gray-300">Title</label>
                <input
                  id="topic-title"
                  value={topicForm.title}
                  onChange={(e) => setTopicForm((f) => f ? { ...f, title: e.target.value } : f)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label htmlFor="topic-content" className="mb-1 block text-sm font-medium text-gray-300">Content</label>
                <textarea
                  id="topic-content"
                  value={topicForm.content}
                  onChange={(e) => setTopicForm((f) => f ? { ...f, content: e.target.value } : f)}
                  rows={6}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setTopicForm(null)} disabled={submitting} className="min-h-[44px] rounded-lg border border-gray-600 px-4 text-gray-200 hover:bg-gray-700 disabled:opacity-50">Cancel</button>
              <button onClick={() => void handleSaveTopic()} disabled={submitting} className="min-h-[44px] rounded-lg bg-green-600 px-5 font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Add/Edit Modal */}
      {categoryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !submitting && setCategoryForm(null)}>
          <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={categoryForm.id ? 'Edit category' : 'Add category'}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{categoryForm.id ? 'Edit Category' : 'Add New Category'}</h2>
              <button onClick={() => !submitting && setCategoryForm(null)} className="text-gray-400 hover:text-white" aria-label="Close">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="category-name" className="mb-1 block text-sm font-medium text-gray-300">Category Name</label>
                <input
                  id="category-name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((f) => f ? { ...f, name: e.target.value } : f)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. General Discussion"
                />
              </div>
              <div>
                <label htmlFor="category-description" className="mb-1 block text-sm font-medium text-gray-300">Description (optional)</label>
                <textarea
                  id="category-description"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((f) => f ? { ...f, description: e.target.value } : f)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="category-icon" className="mb-1 block text-sm font-medium text-gray-300">Icon</label>
                  <select
                    id="category-icon"
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm((f) => f ? { ...f, icon: e.target.value } : f)}
                    className="w-full select-chevron rounded-lg border border-gray-600 bg-gray-700 px-3 pr-10 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="chat">Chat</option>
                    <option value="translate">Translate</option>
                    <option value="book">Book</option>
                    <option value="users">Users</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="category-order" className="mb-1 block text-sm font-medium text-gray-300">Order</label>
                  <input
                    id="category-order"
                    type="number"
                    value={categoryForm.order}
                    onChange={(e) => setCategoryForm((f) => f ? { ...f, order: e.target.value } : f)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setCategoryForm(null)} disabled={submitting} className="min-h-[44px] rounded-lg border border-gray-600 px-4 text-gray-200 hover:bg-gray-700 disabled:opacity-50">Cancel</button>
              <button onClick={() => void handleSaveCategory()} disabled={submitting} className="min-h-[44px] rounded-lg bg-green-600 px-5 font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                {submitting ? 'Saving…' : categoryForm.id ? 'Save changes' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      <Notification notification={notification} onClose={hideNotification} />

      {/* Confirm Dialog */}
      {confirmState && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          title={confirmState.options.title}
          message={confirmState.options.message}
          confirmText={confirmState.options.confirmText}
          cancelText={confirmState.options.cancelText}
          type={confirmState.options.type}
          onConfirm={confirmState.onConfirm}
          onCancel={confirmState.onCancel}
        />
      )}
    </div>
  );
};

export default CommunityManager;
