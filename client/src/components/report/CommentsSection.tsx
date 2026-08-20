import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { commentsApi } from '@/lib/api';
import { Send, ThumbsUp, ThumbsDown, MessageSquare, Flag } from 'lucide-react';

interface User {
  id: string;
  name: string;
  avatar: string | null;
}

interface Reply {
  id: string;
  content: string;
  userId: string;
  createdAt: string;
  user: User;
  score: number;
  likesCount: number;
  dislikesCount: number;
  userInteraction: 'like' | 'dislike' | null;
}

interface Comment {
  id: string;
  content: string;
  userId: string;
  createdAt: string;
  user: User;
  score: number;
  likesCount: number;
  dislikesCount: number;
  userInteraction: 'like' | 'dislike' | null;
  replies: Reply[];
}

interface CommentsSectionProps {
  reportId: string;
  onReportContent: (type: 'COMMENT' | 'REPLY', id: string) => void;
}

export default function CommentsSection({ reportId, onReportContent }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const { token, user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    fetchComments();
  }, [reportId]);

  const fetchComments = async () => {
    try {
      const data = await commentsApi.getComments(reportId);
      setComments(data);
    } catch (err) {
      console.error('Failed to fetch comments', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      addToast('error', 'Please login to comment');
      return;
    }
    if (!newComment.trim()) return;

    try {
      await commentsApi.addComment(reportId, newComment);
      setNewComment('');
      fetchComments();
      addToast('success', 'Comment added');
    } catch (err) {
      addToast('error', 'Failed to add comment');
    }
  };

  const handleAddReply = async (commentId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      addToast('error', 'Please login to reply');
      return;
    }
    if (!replyContent.trim()) return;

    try {
      await commentsApi.addReply(commentId, replyContent);
      setReplyContent('');
      setReplyingTo(null);
      fetchComments();
      addToast('success', 'Reply added');
    } catch (err) {
      addToast('error', 'Failed to add reply');
    }
  };

  const handleInteract = async (type: 'comment' | 'reply', id: string, action: 'like' | 'dislike' | 'none') => {
    if (!token) {
      addToast('error', 'Please login to vote');
      return;
    }

    try {
      await commentsApi.interact(type, id, action);
      fetchComments(); // Refresh to get updated scores
    } catch (err) {
      console.error('Interaction failed', err);
    }
  };

  const renderInteractions = (item: Comment | Reply, type: 'comment' | 'reply') => {
    return (
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1 bg-surface-secondary rounded-full px-2 py-1">
          <button
            onClick={() => handleInteract(type, item.id, item.userInteraction === 'like' ? 'none' : 'like')}
            className={`p-1 rounded-full hover:bg-surface transition-colors ${item.userInteraction === 'like' ? 'text-green-500' : 'text-text-muted'}`}
          >
            <ThumbsUp size={14} />
          </button>
          <span className="text-xs text-text-secondary font-medium px-1">{item.score}</span>
          <button
            onClick={() => handleInteract(type, item.id, item.userInteraction === 'dislike' ? 'none' : 'dislike')}
            className={`p-1 rounded-full hover:bg-surface transition-colors ${item.userInteraction === 'dislike' ? 'text-red-500' : 'text-text-muted'}`}
          >
            <ThumbsDown size={14} />
          </button>
        </div>

        {type === 'comment' && (
          <button
            onClick={() => setReplyingTo(replyingTo === item.id ? null : item.id)}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            <MessageSquare size={14} />
            Reply
          </button>
        )}

        <button
          onClick={() => onReportContent(type.toUpperCase() as 'COMMENT' | 'REPLY', item.id)}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-red-500 transition-colors ml-auto"
        >
          <Flag size={14} />
          Report
        </button>
      </div>
    );
  };

  return (
    <div className="mt-8 pt-8 border-t border-border">
      <h3 className="text-xl font-semibold mb-6 text-text-primary">Comments ({comments.length})</h3>

      {/* Add Comment Form */}
      <form onSubmit={handleAddComment} className="mb-8">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex-shrink-0 flex items-center justify-center text-emerald-400 font-bold">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-grow relative">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full bg-surface-secondary border border-border rounded-xl py-3 px-4 pr-12 text-text-primary placeholder-text-muted focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-emerald-400 hover:text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-border flex-shrink-0 overflow-hidden">
              {comment.user.avatar ? (
                <img src={comment.user.avatar} alt={comment.user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted font-bold">
                  {comment.user.name[0].toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-grow">
              <div className="bg-surface-secondary rounded-2xl rounded-tl-none p-4 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-text-primary text-sm">{comment.user.name}</span>
                  <span className="text-xs text-text-muted">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-text-secondary text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>

              {renderInteractions(comment, 'comment')}

              {/* Reply Form */}
              {replyingTo === comment.id && (
                <form onSubmit={(e) => handleAddReply(comment.id, e)} className="mt-4 flex gap-3 ml-4">
                  <div className="flex-grow relative">
                    <input
                      type="text"
                      autoFocus
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      className="w-full bg-surface-secondary border border-border rounded-xl py-2 px-4 pr-10 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!replyContent.trim()}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-emerald-400 hover:text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </form>
              )}

              {/* Replies List */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 space-y-4 ml-6 border-l-2 border-border pl-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-border flex-shrink-0 overflow-hidden">
                        {reply.user.avatar ? (
                          <img src={reply.user.avatar} alt={reply.user.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-muted text-xs font-bold">
                            {reply.user.name[0].toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex-grow">
                        <div className="bg-surface-secondary rounded-2xl rounded-tl-none p-3 border border-border">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-text-primary text-xs">{reply.user.name}</span>
                            <span className="text-[10px] text-text-muted">
                              {new Date(reply.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-text-secondary text-xs whitespace-pre-wrap">{reply.content}</p>
                        </div>
                        {renderInteractions(reply, 'reply')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
