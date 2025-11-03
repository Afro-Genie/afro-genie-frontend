import React, { useState, useEffect } from 'react';
import { getSongAnnotations, addAnnotation } from '../services/firebaseService';
import { useAuth } from '../context/AuthContext';
import type { Annotation } from '../services/firebaseService';

interface AnnotationSidebarProps {
  songId: string;
}

const AnnotationSidebar: React.FC<AnnotationSidebarProps> = ({ songId }) => {
  const { user, userProfile } = useAuth();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchAnnotations = async () => {
      try {
        const fetchedAnnotations = await getSongAnnotations(songId);
        setAnnotations(fetchedAnnotations);
      } catch (error) {
        console.error('Error fetching annotations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (songId) {
      fetchAnnotations();
    }
  }, [songId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    try {
      await addAnnotation({
        songId,
        userId: user.uid,
        userName: userProfile?.displayName || user.email || 'Anonymous',
        userAvatar: userProfile?.photoURL || undefined,
        comment: newComment.trim()
      });
      
      setNewComment('');
      // Refresh annotations
      const updatedAnnotations = await getSongAnnotations(songId);
      setAnnotations(updatedAnnotations);
    } catch (error) {
      console.error('Error adding annotation:', error);
    } finally {
      setSubmitting(false);
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
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };
  return (
    <aside className="bg-[#1A2B22]/50 border-l border-white/10 p-6 overflow-y-auto">
      <h2 className="text-xl font-bold mb-6">Community Annotations</h2>
      
      {/* Add Comment Form */}
      {user ? (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts about this song..."
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            rows={3}
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="mt-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg text-center">
          <p className="text-gray-400">Sign in to join the conversation</p>
        </div>
      )}

      {/* Annotations List */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading comments...</p>
          </div>
        ) : annotations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          annotations.map((annotation) => (
            <div key={annotation.id} className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-600 flex items-center justify-center">
                {annotation.userAvatar ? (
                  <img 
                    src={annotation.userAvatar} 
                    alt={annotation.userName} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-white font-semibold">
                    {annotation.userName[0]?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-white">{annotation.userName}</h3>
                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(annotation.createdAt)}
                  </span>
                </div>
                <p className="text-gray-300 text-sm">{annotation.comment}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default AnnotationSidebar;