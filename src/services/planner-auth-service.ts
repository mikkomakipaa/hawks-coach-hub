import { PlannerApiClient } from '@/services/planner-api-client';
import type { PlannerPermissions, PlannerProfile, PlannerRole } from '@/types/planner';

const ROLE_LEVELS: Record<PlannerRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

export class PlannerAuthService {
  constructor(private readonly client: PlannerApiClient = new PlannerApiClient()) {}

  async getProfile(): Promise<PlannerProfile> {
    return this.client.request<PlannerProfile>('/api/planner/me');
  }

  getPermissions(profile: PlannerProfile): PlannerPermissions {
    return {
      role: profile.role,
      canViewPlanner: this.hasMinimumRole(profile.role, 'viewer'),
      canManageSessions: this.hasMinimumRole(profile.role, 'viewer'),
      canEditDrills: this.hasMinimumRole(profile.role, 'editor'),
      canPublishDrills: this.hasMinimumRole(profile.role, 'admin'),
      canReviewImports: this.hasMinimumRole(profile.role, 'editor'),
      canApproveImports: this.hasMinimumRole(profile.role, 'admin'),
    };
  }

  async getCurrentPermissions(): Promise<{ profile: PlannerProfile; permissions: PlannerPermissions }> {
    const profile = await this.getProfile();

    return {
      profile,
      permissions: this.getPermissions(profile),
    };
  }

  hasMinimumRole(role: PlannerRole, minimumRole: PlannerRole): boolean {
    return ROLE_LEVELS[role] >= ROLE_LEVELS[minimumRole];
  }
}
