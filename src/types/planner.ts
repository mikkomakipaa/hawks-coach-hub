export type PlannerRole = 'viewer' | 'editor' | 'admin';
export type PlannerProfileStatus = 'active' | 'disabled';

export interface PlannerProfile {
  id: string;
  email: string;
  role: PlannerRole;
  displayName?: string;
  status: PlannerProfileStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerPermissions {
  role: PlannerRole;
  canViewPlanner: boolean;
  canManageSessions: boolean;
  canEditDrills: boolean;
  canPublishDrills: boolean;
  canReviewImports: boolean;
  canApproveImports: boolean;
}

export interface PlannerApiErrorDetail {
  field?: string;
  message: string;
}

export interface PlannerIdentityHeaders {
  userId: string;
  email?: string;
  role?: PlannerRole;
  displayName?: string;
}
