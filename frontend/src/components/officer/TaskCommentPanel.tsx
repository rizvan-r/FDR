import React, { useState } from 'react';
import { MessageSquare, Send, User } from 'lucide-react';
import { TaskComment } from '../../types';

interface TaskCommentPanelProps {
  taskId: string;
  comments: TaskComment[];
  onAddComment: (commentText: string) => Promise<void>;
  className?: string;
}

export const TaskCommentPanel: React.FC<TaskCommentPanelProps> = ({
  taskId,
  comments,
  onAddComment,
  className = '',
}) => {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAddComment(commentText);
      setCommentText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <MessageSquare className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          Officer Discussion & Audit Notes ({comments.length})
        </h4>
      </div>

      {/* Comments List */}
      <div className="space-y-3 mb-5 max-h-80 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">
            No notes or officer comments recorded on this task yet.
          </p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 text-xs"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px]">
                    <User className="w-3 h-3" />
                  </div>
                  <span>{c.user_name || 'Officer'}</span>
                  {c.user_role && (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                      {c.user_role.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">
                  {new Date(c.created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap pl-6">
                {c.comment_text}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add an officer note or status update..."
          className="flex-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!commentText.trim() || isSubmitting}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </form>
    </div>
  );
};
