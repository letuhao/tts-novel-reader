/**
 * Conversation Card Component
 * Displays a single conversation in the list
 */
import { Link } from 'react-router-dom';
import { MessageCircle, Calendar, Trash2, Archive } from 'lucide-react';
import type { Conversation } from '../services/conversationApi';
import { formatDistanceToNow } from 'date-fns';

interface ConversationCardProps {
  conversation: Conversation;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
}

export default function ConversationCard({
  conversation,
  onDelete,
  onArchive,
  onRestore,
}: ConversationCardProps): JSX.Element {
  const isArchived = conversation.status === 'archived';
  const isDeleted = conversation.status === 'deleted';

  const formatDate = (dateString: string): string => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return new Date(dateString).toLocaleDateString();
    }
  };

  return (
    <Link
      to={`/conversation/${conversation.id}`}
      className={`block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow ${
        isArchived ? 'opacity-60' : ''
      } ${isDeleted ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <MessageCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {conversation.title || 'Untitled Conversation'}
            </h3>
            {isArchived && (
              <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                Archived
              </span>
            )}
            {isDeleted && (
              <span className="px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded">
                Deleted
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(conversation.updated_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          {!isDeleted && (
            <>
              {isArchived ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRestore?.(conversation.id);
                  }}
                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Restore conversation"
                >
                  <Archive className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onArchive?.(conversation.id);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
                  title="Archive conversation"
                >
                  <Archive className="h-4 w-4" />
                </button>
              )}
            </>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete?.(conversation.id);
            }}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete conversation"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}

