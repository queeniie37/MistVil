import { MistVilDatabase } from '../data';

// Badges are granted EXCLUSIVELY by the owner from the admin panel and are
// stored in the shared, synced 'user_badges' key (userId -> badges[]), so a
// badge granted on the owner's device appears on the member's profile on
// their own device. Profiles show a badges section only when at least one
// badge has actually been granted — no automatic/fake achievements.
export interface UserBadge {
  id: string;
  name: string;
  icon: string;
  desc: string;
  kind: 'READER' | 'TRANSLATOR';
  grantedAt: string;
}

export type BadgeSpec = Omit<UserBadge, 'grantedAt'>;

// Catalog the owner picks from: reader-fitting and translator-fitting awards.
export const BADGE_CATALOG: BadgeSpec[] = [
  // Reader achievements
  { id: 'reader-active', name: 'Active Reader', icon: '📖', desc: 'Consistent dedication to reading novels and chapters', kind: 'READER' },
  { id: 'reader-blazing', name: 'Blazing Reader', icon: '🔥', desc: 'Read a huge number of chapters', kind: 'READER' },
  { id: 'commenter-gold', name: 'Golden Commenter', icon: '💬', desc: 'Outstanding, ongoing engagement in the comments', kind: 'READER' },
  { id: 'critic', name: 'Certified Critic', icon: '⭐', desc: 'High-quality reviews and ratings', kind: 'READER' },
  { id: 'season-hero', name: 'Season Hero', icon: '🏆', desc: 'Most active and engaged this season', kind: 'READER' },
  // Translator achievements
  { id: 'translator-month', name: 'Translator of the Month', icon: '🥇', desc: 'Best translator for the current month', kind: 'TRANSLATOR' },
  { id: 'fast-publisher', name: 'Fast Publisher', icon: '⚡', desc: 'A prolific monthly chapter-publishing pace', kind: 'TRANSLATOR' },
  { id: 'expert-translator', name: 'Expert Translator', icon: '🎖️', desc: 'Translated several novels at high quality', kind: 'TRANSLATOR' },
  { id: 'platform-pillar', name: 'Platform Pillar', icon: '👑', desc: 'Exceptional contribution to enriching the platform', kind: 'TRANSLATOR' }
];

type BadgesMap = { [userId: string]: UserBadge[] };

export const getUserBadges = (userId: string): UserBadge[] => {
  if (!userId) return [];
  const map = MistVilDatabase.get<BadgesMap>('user_badges', {});
  const list = map && typeof map === 'object' ? map[userId] : undefined;
  return Array.isArray(list) ? list : [];
};

// Owner-only operations (the admin panel is already gated to the owner).
export const grantBadge = (userId: string, badgeId: string): boolean => {
  const spec = BADGE_CATALOG.find((b) => b.id === badgeId);
  if (!spec || !userId) return false;
  const map = MistVilDatabase.get<BadgesMap>('user_badges', {});
  const existing = Array.isArray(map[userId]) ? map[userId] : [];
  if (existing.some((b) => b.id === badgeId)) return false; // already granted
  const updated: BadgesMap = {
    ...map,
    [userId]: [...existing, { ...spec, grantedAt: new Date().toISOString() }]
  };
  return MistVilDatabase.set('user_badges', updated);
};

export const revokeBadge = (userId: string, badgeId: string): boolean => {
  const map = MistVilDatabase.get<BadgesMap>('user_badges', {});
  const existing = Array.isArray(map[userId]) ? map[userId] : [];
  const filtered = existing.filter((b) => b.id !== badgeId);
  if (filtered.length === existing.length) return false;
  const updated: BadgesMap = { ...map, [userId]: filtered };
  return MistVilDatabase.set('user_badges', updated);
};
