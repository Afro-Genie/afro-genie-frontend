import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getTopic, getTopicComments, likeTopic, shareTopic, isTopicLiked, deleteTopic, pinTopic, lockTopic, getSong, getArtist } from '../../services/firebaseService';
import { Topic, TopicComment, Song, Artist } from '../../types';
import TopicActions from './TopicActions';
import CommentSection from './CommentSection';

const TopicDetail: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { user, userProfile, isAdmin } = useAuth();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [comments, setComments] = useState<TopicComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [linkedSong, setLinkedSong] = useState<Song | null>(null);
  const [linkedArtist, setLinkedArtist] = useState<Artist | null>(null);

  useEffect(() => {
    if (topicId) {
      loadTopic();
    }
  }, [topicId]);

  useEffect(() => {
    if (topic?.id) {
      loadComments();
      if (user) {
        checkLikedStatus();
      }
    }
  }, [topic?.id, user]);

  useEffect(() => {
    if (topic) {
      if (topic.songId) {
        loadLinkedSong();
      }
      if (topic.artistId) {
        loadLinkedArtist();
      }
    }
  }, [topic]);

  const loadTopic = async () => {
    if (!topicId) return;
    setLoading(true);
    try {
      const topicData = await getTopic(topicId);
      if (topicData) {
        setTopic(topicData);
      } else {
        navigate('/community');
      }
    } catch (error) {
      console.error('Error loading topic:', error);
      navigate('/community');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    if (!topic?.id) return;
    try {
      const commentsData = await getTopicComments(topic.id);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const checkLikedStatus = async () => {
    if (!topic?.id || !user) return;
    try {
      const liked = await isTopicLiked(topic.id, user.uid);
      setIsLiked(liked);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const loadLinkedSong = async () => {
    if (!topic?.songId) return;
    try {
      const song = await getSong(topic.songId);
      setLinkedSong(song);
    } catch (error) {
      console.error('Error loading linked song:', error);
    }
  };

  const loadLinkedArtist = async () => {
    if (!topic?.artistId) return;
    try {
      const artist = await getArtist(topic.artistId);
      setLinkedArtist(artist);
    } catch (error) {
      console.error('Error loading linked artist:', error);
    }
  };

  const handleLike = async () => {
    if (!topic?.id || !user) return;

    const wasLiked = isLiked;
    setIsLiked(!wasLiked);

    try {
      const newLiked = await likeTopic(topic.id, user.uid);
      setIsLiked(newLiked);
      loadTopic(); // Reload to get updated like count
    } catch (error) {
      console.error('Error liking topic:', error);
      setIsLiked(wasLiked); // Revert on error
    }
  };

  const handleShare = async () => {
    if (!topic?.id) return;

    if (user) {
      try {
        await shareTopic(topic.id, user.uid);
        loadTopic(); // Reload to get updated share count
      } catch (error) {
        console.error('Error sharing topic:', error);
      }
    } else {
      // Just copy link if not logged in
      const url = `${window.location.origin}/#/community/topic/${topic.id}`;
      navigator.clipboard.writeText(url);
    }
  };

  const handleDelete = async () => {
    if (!topic?.id || !isAdmin) return;
    if (!window.confirm('Are you sure you want to delete this topic?')) return;

    try {
      await deleteTopic(topic.id);
      navigate('/community');
    } catch (error) {
      console.error('Error deleting topic:', error);
    }
  };

  const handlePin = async () => {
    if (!topic?.id || !isAdmin) return;
    try {
      await pinTopic(topic.id, !topic.isPinned);
      loadTopic();
    } catch (error) {
      console.error('Error pinning topic:', error);
    }
  };

  const handleLock = async () => {
    if (!topic?.id || !isAdmin) return;
    try {
      await lockTopic(topic.id, !topic.isLocked);
      loadTopic();
    } catch (error) {
      console.error('Error locking topic:', error);
    }
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-gray-800/50 p-8 rounded-lg border border-gray-700 animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-gray-800/50 p-8 rounded-lg border border-gray-700 text-center">
          <p className="text-gray-400">Topic not found</p>
          <Link to="/community" className="text-amber-400 hover:text-amber-300 mt-4 inline-block">
            Back to Community
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Back Button */}
      <Link
        to="/community"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Community
      </Link>

      {/* Topic Card */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {topic.isPinned && (
              <div className="flex items-center gap-2 mb-2 text-amber-400 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
                <span>Pinned</span>
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-100 mb-2">{topic.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                {topic.authorAvatar ? (
                  <img
                    src={topic.authorAvatar}
                    alt={topic.authorName}
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {topic.authorName?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <span className="font-semibold text-gray-300">{topic.authorName}</span>
              </div>
              <span>•</span>
              <span>{formatTimeAgo(topic.createdAt)}</span>
              {topic.category && (
                <>
                  <span>•</span>
                  <span className="px-2 py-0.5 bg-gray-700 rounded text-gray-300">
                    {topic.category}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={handlePin}
                className={`p-2 rounded-lg transition-colors ${
                  topic.isPinned
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
                title={topic.isPinned ? 'Unpin' : 'Pin'}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </button>
              <button
                onClick={handleLock}
                className={`p-2 rounded-lg transition-colors ${
                  topic.isLocked
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
                title={topic.isLocked ? 'Unlock' : 'Lock'}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                title="Delete"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Linked Content */}
        {(linkedSong || linkedArtist) && (
          <div className="mb-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
            {linkedSong && (
              <Link
                to={`/songs/${linkedSong.id}`}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                {linkedSong.image && (
                  <img src={linkedSong.image} alt={linkedSong.title} className="h-12 w-12 rounded object-cover" />
                )}
                <div>
                  <p className="text-sm text-gray-400">Related Song</p>
                  <p className="text-gray-200 font-semibold">{linkedSong.title}</p>
                </div>
              </Link>
            )}
            {linkedArtist && (
              <Link
                to={`/artist/${linkedArtist.id}`}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                {linkedArtist.image && (
                  <img src={linkedArtist.image} alt={linkedArtist.name} className="h-12 w-12 rounded-full object-cover" />
                )}
                <div>
                  <p className="text-sm text-gray-400">Related Artist</p>
                  <p className="text-gray-200 font-semibold">{linkedArtist.name}</p>
                </div>
              </Link>
            )}
          </div>
        )}

        {/* Image */}
        {topic.imageUrl && (
          <div className="mb-4">
            <img
              src={topic.imageUrl}
              alt={topic.title}
              className="w-full max-h-96 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-invert max-w-none mb-6">
          <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
            {topic.content}
          </div>
        </div>

        {/* Actions */}
        {!topic.isLocked && (
          <TopicActions
            topic={topic}
            onLike={handleLike}
            onShare={handleShare}
            isLiked={isLiked}
          />
        )}

        {topic.isLocked && (
          <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-center">
            <p className="text-yellow-400">This topic is locked and no longer accepting new comments.</p>
          </div>
        )}
      </div>

      {/* Comments Section */}
      {!topic.isLocked && (
        <CommentSection
          topicId={topic.id!}
          comments={comments}
          onCommentsUpdate={loadComments}
        />
      )}
    </div>
  );
};

export default TopicDetail;

