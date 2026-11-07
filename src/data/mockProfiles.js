// Real authentic matrimonial profiles dataset: Strictly empty for mock candidates.
// All profiles must be loaded dynamically from the Supabase database (public.profiles).

export const INITIAL_PROFILES = [];

// Initial mock chat conversations (Empty: strictly real chat conversations)
export const CONVERSATIONS_FOR_FEMALE = [];
export const CONVERSATIONS_FOR_MALE = [];

export const getConversationsForUser = () => [];

export const INITIAL_CONVERSATIONS = [];

// Dummy profiles permanently cleared for fresh production start
export const DEMO_USER_FEMALE = null;
export const DEMO_USER_MALE = null;
export const DEMO_USER = null;

export default {
  INITIAL_PROFILES,
  CONVERSATIONS_FOR_FEMALE,
  CONVERSATIONS_FOR_MALE,
  getConversationsForUser,
  INITIAL_CONVERSATIONS,
  DEMO_USER_FEMALE,
  DEMO_USER_MALE,
  DEMO_USER
};
