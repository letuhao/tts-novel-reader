/**
 * Conversations Page
 * Lists all user conversations
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Plus, Loader2, AlertCircle, Search } from 'lucide-react';
import { getConversations, deleteConversation, archiveConversation, restoreConversation, createConversation } from '../services/conversationApi';
import type { Conversation } from '../services/conversationApi';
import ConversationCard from '../components/ConversationCard';
import { logger } from '../utils/logger';

export default function Conversations(): JSX.Element {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getConversations({
        status: 'active',
        orderBy: 'updated_at',
        order: 'desc',
      });

      if (response.success && response.data) {
        setConversations(response.data.conversations);
      } else {
        throw new Error(response.error || 'Failed to load conversations');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMessage);
      logger.error('Error loading conversations', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const response = await deleteConversation(id);
      if (response.success) {
        setConversations(conversations.filter((c) => c.id !== id));
        logger.info('Conversation deleted', { id });
      } else {
        throw new Error(response.error || 'Failed to delete conversation');
      }
    } catch (err) {
      logger.error('Error deleting conversation', err);
      alert(err instanceof Error ? err.message : 'Failed to delete conversation');
    }
  };

  const handleArchive = async (id: string): Promise<void> => {
    try {
      const response = await archiveConversation(id);
      if (response.success && response.data) {
        setConversations(
          conversations.map((c) => (c.id === id ? response.data! : c))
        );
        logger.info('Conversation archived', { id });
      } else {
        throw new Error(response.error || 'Failed to archive conversation');
      }
    } catch (err) {
      logger.error('Error archiving conversation', err);
      alert(err instanceof Error ? err.message : 'Failed to archive conversation');
    }
  };

  const handleRestore = async (id: string): Promise<void> => {
    try {
      const response = await restoreConversation(id);
      if (response.success && response.data) {
        setConversations(
          conversations.map((c) => (c.id === id ? response.data! : c))
        );
        logger.info('Conversation restored', { id });
      } else {
        throw new Error(response.error || 'Failed to restore conversation');
      }
    } catch (err) {
      logger.error('Error restoring conversation', err);
      alert(err instanceof Error ? err.message : 'Failed to restore conversation');
    }
  };

  const handleNewConversation = async (): Promise<void> => {
    try {
      setIsLoading(true);
      logger.info('Creating new conversation from button click');
      const response = await createConversation({
        title: 'New Conversation',
      });
      
      if (response.success && response.data) {
        const newId = response.data.id;
        logger.info('New conversation created, navigating', { id: newId });
        navigate(`/conversation/${newId}`);
      } else {
        throw new Error(response.error || 'Failed to create conversation');
      }
    } catch (err) {
      logger.error('Error creating conversation', err);
      alert(err instanceof Error ? err.message : 'Failed to create conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conversations</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your English learning conversations
          </p>
        </div>
        <button
          onClick={handleNewConversation}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading conversations...</span>
        </div>
      )}

      {/* Conversations List */}
      {!isLoading && !error && (
        <>
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery
                  ? 'No conversations match your search.'
                  : 'Get started by creating a new conversation.'}
              </p>
              {!searchQuery && (
                <div className="mt-6">
                  <button
                    onClick={handleNewConversation}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    New Conversation
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredConversations.map((conversation) => (
                <ConversationCard
                  key={conversation.id}
                  conversation={conversation}
                  onDelete={handleDelete}
                  onArchive={handleArchive}
                  onRestore={handleRestore}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

