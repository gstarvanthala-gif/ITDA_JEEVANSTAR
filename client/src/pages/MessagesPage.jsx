import { useCallback, useEffect, useRef, useState } from 'react';

import ConfirmDialog from '../components/ConfirmDialog';
import LoadingState from '../components/LoadingState';
import ToastMessage from '../components/ToastMessage';
import { useAuth } from '../hooks/useAuth';
import { advisorApi, messageApi } from '../services/api';

const referenceId = (value) => {
  if (typeof value === 'string') return value;
  return value?._id || value?.id || '';
};

function MessagesPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [participant, setParticipant] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(user?.role === 'advisor');
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const isAdvisor = user?.role === 'advisor';
  const conversationUserId = isAdvisor ? selectedUserId : user?.advisorId || '';

  useEffect(() => {
    let isMounted = true;

    if (!isAdvisor) {
      return () => {
        isMounted = false;
      };
    }

    advisorApi.getClients()
      .then((response) => {
        if (!isMounted) return;
        const assignedClients = response.data.clients;
        setClients(assignedClients);
        if (!selectedUserId && assignedClients[0]) {
          setSelectedUserId(assignedClients[0].id);
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Could not load assigned clients.');
        }
      })
      .finally(() => {
        if (isMounted) setLoadingContacts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAdvisor, selectedUserId]);

  const loadConversation = useCallback(async () => {
    if (!conversationUserId) {
      setMessages([]);
      setParticipant(null);
      return;
    }

    setError('');
    try {
      const response = await messageApi.getConversation(conversationUserId);
      setParticipant(response.data.participant);
      setMessages(response.data.messages);
    } catch (requestError) {
      setMessages([]);
      setParticipant(null);
      setError(requestError.response?.data?.message || 'Could not load this conversation.');
    }
  }, [conversationUserId]);

  useEffect(() => {
    if (!conversationUserId) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void loadConversation();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [conversationUserId, loadConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const handleSend = async (event) => {
    event.preventDefault();
    const message = draft.trim();
    if (!conversationUserId || !message || sending) return;

    setSending(true);
    setError('');
    try {
      await messageApi.send(conversationUserId, message);
      setDraft('');
      await loadConversation();
      setNotice('Message sent.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not send this message.');
    } finally {
      setSending(false);
    }
  };

  const handleRead = async (messageId) => {
    setError('');
    try {
      const response = await messageApi.markRead(messageId);
      setMessages((current) => current.map((message) => (
        message._id === messageId ? response.data.message : message
      )));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not mark the message as read.');
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    setError('');
    try {
      await messageApi.remove(confirmDeleteId);
      setMessages((current) => current.filter((message) => message._id !== confirmDeleteId));
      setNotice('Message deleted.');
      setConfirmDeleteId('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not delete the message.');
      setConfirmDeleteId('');
    } finally {
      setDeleting(false);
    }
  };

  const selectedClient = clients.find((client) => client.id === selectedUserId);
  const displayParticipant = participant || selectedClient || null;
  const currentUserId = user?.id || user?._id;

  if (loadingContacts) {
    return <LoadingState label="Loading assigned conversations" />;
  }

  const hasCounterpart = isAdvisor ? clients.length > 0 : Boolean(user?.advisorId);

  return (
    <section className="dashboard-page messages-page">
      <header className="messages-heading">
        <div>
          <p className="eyebrow">Private conversation</p>
          <h2>Messages</h2>
        </div>
        <span className="demo-badge">ASSIGNED ONLY</span>
      </header>

      <p className="messages-disclaimer">Messages are limited to an investor and their assigned advisor.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <ToastMessage message={notice} onDismiss={() => setNotice('')} />

      {!hasCounterpart ? (
        <p className="empty-state">
          {isAdvisor ? 'No active investors are assigned to your account.' : 'No advisor is assigned to your account yet.'}
        </p>
      ) : (
        <div className={`conversation-layout ${isAdvisor ? 'advisor-conversation' : ''}`}>
          {isAdvisor && (
            <aside className="conversation-contacts" aria-label="Assigned investor conversations">
              <h3>Assigned investors</h3>
              {clients.map((client) => (
                <button
                  className={`conversation-contact ${selectedUserId === client.id ? 'active' : ''}`}
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedUserId(client.id)}
                >
                  <span>{client.name}</span>
                  <small>{client.email}</small>
                </button>
              ))}
            </aside>
          )}

          <section className="conversation-panel" aria-label="Message conversation">
            <header className="conversation-header">
              <div>
                <p className="eyebrow">{isAdvisor ? 'Investor' : 'Assigned advisor'}</p>
                <h3>{displayParticipant?.name || (isAdvisor ? 'Select a client' : 'Advisor')}</h3>
              </div>
              {displayParticipant?.email && <span>{displayParticipant.email}</span>}
            </header>

            <div className="conversation-messages" aria-live="polite">
              {messages.length === 0 ? (
                <p className="conversation-empty">No messages yet. Start the conversation.</p>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = referenceId(message.senderId) === String(currentUserId);
                  return (
                    <article className={`message-bubble ${isOwnMessage ? 'own' : 'received'}`} key={message._id}>
                      <div className="message-meta">
                        <strong>{isOwnMessage ? 'You' : message.senderId.name}</strong>
                        <time dateTime={message.createdAt}>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(message.createdAt))}</time>
                      </div>
                      <p>{message.message}</p>
                      <div className="message-actions">
                        {!isOwnMessage && !message.isRead && (
                          <button type="button" onClick={() => handleRead(message._id)}>Mark read</button>
                        )}
                        {isOwnMessage && (
                          <button type="button" onClick={() => setConfirmDeleteId(message._id)}>Delete</button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-compose" onSubmit={handleSend}>
              <label htmlFor="message-draft">Message</label>
              <textarea
                id="message-draft"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Write a message..."
                disabled={!conversationUserId || sending}
              />
              <div className="message-compose-footer">
                <span>{draft.length} / 2000</span>
                <button className="primary-button" type="submit" disabled={!draft.trim() || sending || !conversationUserId}>
                  {sending ? 'Sending...' : 'Send message'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete this message?"
        message="This message will be permanently removed from the conversation."
        confirmLabel="Delete message"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId('')}
      />
    </section>
  );
}

export default MessagesPage;