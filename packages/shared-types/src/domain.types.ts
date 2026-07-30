export enum UserRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  ANALYST = 'ANALYST',
  VIEWER = 'VIEWER',
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
}

export interface SystemSetting {
  key: string;
  value: string;
  description: string | null;
}
