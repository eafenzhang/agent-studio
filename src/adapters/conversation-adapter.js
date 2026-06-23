/**
 * Conversation Adapter — normalizes API response data to canonical camelCase fields
 */
export function normalizeConversation(raw) {
  if (!raw) return raw;
  return {
    ...raw,
    updatedAt: raw.updatedAt || raw.updated_at || raw.createdAt,
    createdAt: raw.createdAt || raw.created_at || raw.updatedAt,
    name: raw.name || raw.title || '新对话',
    title: raw.title || raw.name || '新对话',
  };
}

export function normalizeMessage(raw) {
  if (!raw) return raw;
  return {
    ...raw,
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
  };
}

export function normalizeArtifact(raw) {
  if (!raw) return raw;
  return {
    ...raw,
    createdAt: raw.createdAt || raw.created_at,
    updatedAt: raw.updatedAt || raw.updated_at || raw.createdAt,
  };
}

export function normalizeConversationList(list) {
  if (!Array.isArray(list)) return list;
  return list.map(normalizeConversation);
}

export function normalizeMessageList(list) {
  if (!Array.isArray(list)) return list;
  return list.map(normalizeMessage);
}

export function normalizeArtifactList(list) {
  if (!Array.isArray(list)) return list;
  return list.map(normalizeArtifact);
}

export default {
  normalizeConversation,
  normalizeMessage,
  normalizeArtifact,
  normalizeConversationList,
  normalizeMessageList,
  normalizeArtifactList,
};
