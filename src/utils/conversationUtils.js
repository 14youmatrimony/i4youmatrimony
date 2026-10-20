/**
 * Matrimonial Conversation & Unread Badge Utility
 * 
 * Enforces strict query alignment between the renderable conversation list
 * and the unread message badge count:
 * 1. Badge count strictly tallies unread messages in active, verified conversations.
 * 2. Empty states ("No Conversations Yet") guarantee an unread badge count of 0 (badge hidden).
 * 3. Pending/rejected/declined interest threads are excluded from active direct message tallies.
 * 4. Zero cross-contamination between Interests tab and Messages tab.
 */

import { deduplicateMessageList } from '../services/liveChatService';

/**
 * Validates if a conversation thread is active, verified, and renderable
 */
export function isConversationActiveAndRenderable(c, currentUser, profiles = [], declinedReceivedIds = []) {
  if (!c || !c.profileId || !currentUser) return false;

  const currentUserId = String(currentUser.id || '');
  const currentUserRegId = currentUser.register_id || currentUser.registerId ? String(currentUser.register_id || currentUser.registerId) : null;
  const userIds = [currentUserId, currentUserRegId].filter(Boolean);

  const pid = String(c.profileId);

  // Strictly exclude self-conversations
  if (userIds.includes(pid)) return false;

  // Strictly require at least one real message
  if (!Array.isArray(c.messages) || c.messages.length === 0) return false;

  // Exclude explicitly declined, rejected, or blocked threads
  if (Array.isArray(declinedReceivedIds) && declinedReceivedIds.some(dId => String(dId) === pid)) {
    return false;
  }
  if (c.status === 'rejected' || c.status === 'declined' || c.status === 'blocked') {
    return false;
  }

  // Resolve partner candidate profile
  const matchedProfile = (profiles || []).find(p => 
    p && (
      String(p.id) === pid || 
      (p.register_id && String(p.register_id) === pid) ||
      (p.registerId && String(p.registerId) === pid)
    )
  );

  const partner = matchedProfile || c.partnerUser;
  if (!partner || !partner.id) return false;

  const partnerIdStr = String(partner.id);
  if (userIds.includes(partnerIdStr)) return false;

  return true;
}

/**
 * Returns an array of active, verified conversations with attached partner profiles
 * and accurate unread counts derived strictly from unread incoming messages.
 */
export function getActiveConversations(conversations = [], currentUser, profiles = [], declinedReceivedIds = []) {
  if (!currentUser || !Array.isArray(conversations)) return [];

  const currentUserId = String(currentUser.id || '');
  const currentUserRegId = currentUser.register_id || currentUser.registerId ? String(currentUser.register_id || currentUser.registerId) : null;
  const userIds = [currentUserId, currentUserRegId].filter(Boolean);

  const seenIds = new Set();
  const activeList = [];

  for (const c of conversations) {
    if (!isConversationActiveAndRenderable(c, currentUser, profiles, declinedReceivedIds)) {
      continue;
    }

    const pid = String(c.profileId);
    const matchedProfile = (profiles || []).find(p => 
      p && (
        String(p.id) === pid || 
        (p.register_id && String(p.register_id) === pid) ||
        (p.registerId && String(p.registerId) === pid)
      )
    );

    const partner = matchedProfile || c.partnerUser;
    const partnerIdStr = String(partner.id);

    if (seenIds.has(partnerIdStr)) continue;
    seenIds.add(partnerIdStr);

    const cleanMessages = deduplicateMessageList(c.messages || []);
    if (cleanMessages.length === 0) continue;

    // Tally actual unread incoming messages sent by the partner
    const actualUnread = cleanMessages.filter(m => {
      const isFromMe = m.sender === 'me' || (m.sender_id && userIds.includes(String(m.sender_id)));
      return !isFromMe && m.status !== 'read';
    }).length;

    activeList.push({
      ...c,
      messages: cleanMessages,
      partnerUser: partner,
      unreadCount: actualUnread
    });
  }

  return activeList;
}

/**
 * Calculates the total unread message badge count.
 * Guaranteed alignment: If getActiveConversations returns 0 items, returns 0.
 */
export function computeUnreadMessagesCount(conversations = [], currentUser, profiles = [], declinedReceivedIds = []) {
  if (!currentUser) return 0;
  const activeList = getActiveConversations(conversations, currentUser, profiles, declinedReceivedIds);
  if (activeList.length === 0) return 0;

  return activeList.reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0);
}
