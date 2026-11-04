function createInMemoryPlannerProfileRepository(seed = {}) {
  const profiles = new Map();

  for (const profile of seed.profiles || []) {
    profiles.set(profile.id, { ...profile });
  }

  return {
    async getProfile({ userId, email } = {}) {
      if (userId && profiles.has(userId)) {
        return { ...profiles.get(userId) };
      }

      if (email) {
        const normalizedEmail = String(email).trim().toLowerCase();
        const match = Array.from(profiles.values()).find(
          (profile) => String(profile.email || '').trim().toLowerCase() === normalizedEmail,
        );

        if (match) {
          return { ...match };
        }
      }

      return null;
    },
  };
}

module.exports = {
  createInMemoryPlannerProfileRepository,
};
