// User Roles
export type UserRole = 'super_admin' | 'admin' | 'volunteer' | 'service_provider';

// User Status
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

// Disaster Types
export type DisasterType = 
  | 'earthquake' 
  | 'flood' 
  | 'cyclone' 
  | 'fire' 
  | 'landslide' 
  | 'tsunami' 
  | 'drought'
  | 'industrial_accident'
  | 'epidemic'
  | 'other';

// Disaster Severity
export type DisasterSeverity = 'low' | 'medium' | 'high' | 'critical';

// Disaster Status
export type DisasterStatus = 'active' | 'contained' | 'resolved' | 'monitoring';

// Emergency Status
export type EmergencyStatus = 'pending' | 'dispatched' | 'in_progress' | 'resolved' | 'cancelled';

// Emergency Priority
export type EmergencyPriority = 'low' | 'medium' | 'high' | 'critical';

// Service Categories
export type ServiceCategory = 
  | 'medical'
  | 'rescue'
  | 'shelter'
  | 'food_water'
  | 'transportation'
  | 'construction'
  | 'electrical'
  | 'plumbing'
  | 'communication'
  | 'logistics'
  | 'counseling'
  | 'security'
  | 'other';

// Volunteer Availability
export type VolunteerAvailability = 'available' | 'on_mission' | 'unavailable' | 'on_leave';

// User Interface
export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// Volunteer Interface (extends User)
export interface IVolunteer {
  _id?: string;
  volunteerId: string; // 6-digit unique ID
  userId: string;
  // Personal Details
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  bloodGroup?: string;
  profileImage?: string;
  idProofType?: string;
  idProofNumber?: string;
  // Address
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  // Skills
  skills: string[];
  specializations?: string[];
  languages?: string[];
  experience?: {
    years: number;
    description?: string;
  };
  certifications?: {
    name: string;
    issuedBy?: string;
    issuedDate?: Date;
    expiryDate?: Date;
    documentUrl?: string;
  }[];
  trainingCompleted?: {
    name: string;
    completedDate?: Date;
    certificateUrl?: string;
  }[];
  // Availability
  availability: VolunteerAvailability;
  availabilitySchedule?: {
    weekdays: boolean;
    weekends: boolean;
    nights: boolean;
    preferredShift?: string;
  };
  // Location
  currentLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
  preferredWorkAreas?: string[];
  willingToTravel?: boolean;
  maxTravelDistance?: number;
  // Mission Stats
  assignedDisasters: string[];
  currentMission?: string;
  completedMissions: number;
  totalHoursServed?: number;
  // Rating
  rating: number;
  totalReviews?: number;
  badges?: {
    name: string;
    earnedAt: Date;
    description?: string;
  }[];
  // Emergency Contact
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
    email?: string;
  };
  // Health
  healthInfo?: {
    medicalConditions?: string[];
    allergies?: string[];
    medications?: string[];
    physicallyFit?: boolean;
  };
  // Vehicle
  hasOwnVehicle?: boolean;
  vehicleType?: string;
  vehicleNumber?: string;
  // Status
  status?: string;
  verificationStatus?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  // Timestamps
  joinedAt: Date;
  lastActiveAt?: Date;
  adminNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Service Provider Interface
export interface IServiceProvider {
  _id?: string;
  providerId: string; // Unique ID (e.g., SP123456)
  userId: string;
  // Business Information
  businessName: string;
  businessType?: 'individual' | 'partnership' | 'company' | 'ngo' | 'government' | 'other';
  registrationNumber?: string;
  gstNumber?: string;
  panNumber?: string;
  description: string;
  tagline?: string;
  // Media
  logo?: string;
  coverImage?: string;
  gallery?: {
    url: string;
    caption?: string;
    uploadedAt?: Date;
  }[];
  // Contact
  contactPerson?: {
    name: string;
    designation?: string;
    phone: string;
    email: string;
    alternatePhone?: string;
  };
  website?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  // Category and Services
  category: ServiceCategory;
  subcategories: string[];
  serviceType?: string;
  services: IService[];
  // Equipment
  equipmentAvailable?: {
    name: string;
    quantity: number;
    condition?: string;
    available?: boolean;
  }[];
  teamSize?: number;
  vehiclesAvailable?: {
    type: string;
    count: number;
    capacity?: string;
  }[];
  // Location
  location: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  serviceAreas?: {
    city: string;
    state: string;
    pincode?: string;
  }[];
  maxServiceRadius?: number;
  // Operating Hours
  operatingHours: {
    day: string;
    open: string;
    close: string;
    isOpen: boolean;
  }[];
  is24x7Available?: boolean;
  // Pricing
  pricing?: {
    type: string;
    rate: number;
    currency?: string;
    minimumCharge?: number;
  };
  paymentMethods?: string[];
  // Emergency
  isAvailableForEmergency: boolean;
  emergencyCharges?: number;
  emergencyResponseTime?: string;
  // Credentials
  yearsOfExperience?: number;
  certifications?: {
    name: string;
    issuedBy?: string;
    issuedDate?: Date;
    expiryDate?: Date;
    documentUrl?: string;
  }[];
  licenses?: {
    name: string;
    number: string;
    issuedBy?: string;
    validTill?: Date;
    documentUrl?: string;
  }[];
  insuranceDetails?: {
    provider?: string;
    policyNumber?: string;
    coverageAmount?: number;
    validTill?: Date;
  };
  // Rating
  rating: number;
  totalReviews: number;
  // Verification
  verified: boolean;
  verificationStatus?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  // Documents
  documents: {
    name?: string;
    type?: string;
    url: string;
    uploadedAt?: Date;
    verified?: boolean;
  }[];
  // Stats
  totalJobsCompleted?: number;
  totalEmergencyResponses?: number;
  // Status
  status?: string;
  adminNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Service Interface
export interface IService {
  _id?: string;
  name: string;
  description: string;
  price: number;
  priceType: 'fixed' | 'hourly' | 'negotiable';
  duration?: string;
  isActive: boolean;
}

// Disaster Interface
export interface IDisaster {
  _id?: string;
  title: string;
  description: string;
  type: DisasterType;
  severity: DisasterSeverity;
  status: DisasterStatus;
  location: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
    city: string;
    state: string;
    country: string;
  };
  affectedArea: number; // in sq km
  affectedPopulation: number;
  casualties: {
    deaths: number;
    injured: number;
    missing: number;
  };
  resources: {
    volunteersDeployed: number;
    serviceProvidersEngaged: number;
    fundsAllocated: number;
    suppliesDistributed: string[];
  };
  reportedBy: string;
  reportedAt: Date;
  startedAt: Date;
  resolvedAt?: Date;
  images: string[];
  updates: {
    message: string;
    updatedBy: string;
    updatedAt: Date;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Emergency/Evacuation Interface
export interface IEmergency {
  _id?: string;
  title: string;
  description: string;
  type: 'evacuation' | 'rescue' | 'medical' | 'supply_delivery' | 'shelter' | 'other';
  priority: EmergencyPriority;
  status: EmergencyStatus;
  disasterId?: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
  };
  requestedBy: {
    name: string;
    phone: string;
    email?: string;
  };
  assignedTo: string[]; // volunteer IDs
  numberOfPeople: number;
  specialRequirements?: string[];
  estimatedTime?: string;
  actualCompletionTime?: Date;
  notes: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Dashboard Statistics
export interface IDashboardStats {
  totalUsers: number;
  totalVolunteers: number;
  totalServiceProviders: number;
  activeDisasters: number;
  resolvedDisasters: number;
  pendingEmergencies: number;
  completedEmergencies: number;
  totalAffectedPeople: number;
  recentActivity: {
    type: string;
    message: string;
    timestamp: Date;
  }[];
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

