import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { IUser, UserRole } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT Token generation
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Get token from request
export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  const cookieToken = request.cookies.get('auth-token')?.value;
  return cookieToken || null;
}

// Verify authentication middleware
export async function verifyAuth(request: NextRequest): Promise<TokenPayload | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

// Role-based access control
export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

// Role hierarchy (higher index = more permissions)
const roleHierarchy: UserRole[] = ['volunteer', 'service_provider', 'admin', 'super_admin'];

export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  const userRoleIndex = roleHierarchy.indexOf(userRole);
  const minimumRoleIndex = roleHierarchy.indexOf(minimumRole);
  return userRoleIndex >= minimumRoleIndex;
}

// Permission matrix
export const permissions = {
  // Dashboard
  viewDashboard: ['super_admin', 'admin', 'volunteer', 'service_provider'] as UserRole[],
  viewFullStats: ['super_admin', 'admin'] as UserRole[],
  
  // User Management
  viewUsers: ['super_admin', 'admin'] as UserRole[],
  createAdmin: ['super_admin'] as UserRole[],
  createUser: ['super_admin', 'admin'] as UserRole[],
  editUser: ['super_admin', 'admin'] as UserRole[],
  deleteUser: ['super_admin'] as UserRole[],
  
  // Disaster Management
  viewDisasters: ['super_admin', 'admin', 'volunteer'] as UserRole[],
  createDisaster: ['super_admin', 'admin'] as UserRole[],
  editDisaster: ['super_admin', 'admin'] as UserRole[],
  deleteDisaster: ['super_admin'] as UserRole[],
  
  // Emergency Management
  viewEmergencies: ['super_admin', 'admin', 'volunteer'] as UserRole[],
  createEmergency: ['super_admin', 'admin', 'volunteer'] as UserRole[],
  assignEmergency: ['super_admin', 'admin'] as UserRole[],
  resolveEmergency: ['super_admin', 'admin', 'volunteer'] as UserRole[],
  
  // Volunteer Management
  viewVolunteers: ['super_admin', 'admin'] as UserRole[],
  manageVolunteers: ['super_admin', 'admin'] as UserRole[],
  
  // Service Provider Management
  viewServiceProviders: ['super_admin', 'admin'] as UserRole[],
  manageServiceProviders: ['super_admin', 'admin'] as UserRole[],
  verifyServiceProvider: ['super_admin', 'admin'] as UserRole[],
  
  // Own profile
  editOwnProfile: ['super_admin', 'admin', 'volunteer', 'service_provider'] as UserRole[],
  manageOwnServices: ['service_provider'] as UserRole[],
};

export function canPerform(userRole: UserRole, action: keyof typeof permissions): boolean {
  return permissions[action].includes(userRole);
}

