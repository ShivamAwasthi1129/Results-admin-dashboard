/**
 * MongoDB → Postgres Data Migration Script
 * Migrates all data from MongoDB collections to Postgres tables via Prisma
 * 
 * Usage: npx tsx scripts/migrate-mongo-to-postgres.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Import all MongoDB models
import '../src/models/Volunteer';  // Must be imported before models that ref it
import OpsUser from '../src/models/OpsUser';
import User from '../src/models/User';
import Volunteer from '../src/models/Volunteer';
import VolunteerTeam from '../src/models/VolunteerTeam';
import ServiceProvider from '../src/models/ServiceProvider';
import Disaster from '../src/models/Disaster';
import Emergency from '../src/models/Emergency';
import Shelter from '../src/models/Shelter';
import Device from '../src/models/Device';
import Incident from '../src/models/Incident';
import InventoryItem from '../src/models/InventoryItem';
import StockLocation from '../src/models/StockLocation';
import StockEntry from '../src/models/StockEntry';
import Product from '../src/models/Product';
import DamageReport from '../src/models/DamageReport';
import Adjuster from '../src/models/Adjuster';
import Order from '../src/models/Order';
import CategoryDocumentRequirement from '../src/models/CategoryDocumentRequirement';

// Setup Prisma
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper to safely convert MongoDB doc to plain object
function toPlain(doc: any): any {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return JSON.parse(JSON.stringify(obj));
}

// Helper to convert MongoDB _id to string
function idStr(doc: any): string {
  return doc._id?.toString() || doc.id?.toString() || '';
}

async function migrateOpsUsers() {
  console.log('📦 Migrating OpsUsers...');
  const docs = await OpsUser.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.opsUser.upsert({
        where: { email: doc.email },
        update: {},
        create: {
          firstName: doc.firstName || '',
          lastName: doc.lastName || '',
          name: doc.name || null,
          email: doc.email,
          password: doc.password,
          phone: doc.phone || '',
          role: doc.role || 'admin',
          status: doc.status || 'active',
          avatar: doc.avatar || '',
          profilePhoto: doc.profilePhoto || '',
          dateOfBirth: doc.dateOfBirth || null,
          bloodGroup: doc.bloodGroup || '',
          gender: doc.gender || '',
          ssnNumber: doc.ssnNumber || '',
          driversLicense: doc.driversLicense ? toPlain(doc.driversLicense) : null,
          emergencyContact: doc.emergencyContact ? toPlain(doc.emergencyContact) : null,
          address: doc.address ? toPlain(doc.address) : null,
          preferences: doc.preferences ? toPlain(doc.preferences) : null,
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ OpsUser ${doc.email}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} OpsUsers migrated`);
}

async function migrateUsers() {
  console.log('📦 Migrating Users (auth collection)...');
  const docs = await User.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminUser.upsert({
        where: { email: doc.email },
        update: {},
        create: {
          firstName: doc.firstName || '',
          lastName: doc.lastName || '',
          name: doc.name || null,
          email: doc.email,
          password: doc.password,
          phone: doc.phone || '',
          role: doc.role || 'volunteer',
          status: doc.status || 'active',
          avatar: doc.avatar || '',
          profilePhoto: doc.profilePhoto || '',
          dateOfBirth: doc.dateOfBirth || null,
          bloodGroup: doc.bloodGroup || '',
          gender: doc.gender || '',
          ssnNumber: doc.ssnNumber || '',
          aadharNumber: (doc as any).aadharNumber || '',
          driversLicense: doc.driversLicense ? toPlain(doc.driversLicense) : null,
          emergencyContact: doc.emergencyContact ? toPlain(doc.emergencyContact) : null,
          address: doc.address ? toPlain(doc.address) : null,
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ User ${doc.email}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} Users migrated`);
}

async function migrateVolunteers() {
  console.log('📦 Migrating Volunteers...');
  const docs = await Volunteer.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminVolunteer.upsert({
        where: { volunteerId: doc.volunteerId },
        update: {},
        create: {
          volunteerId: doc.volunteerId,
          userId: doc.userId,
          dateOfBirth: doc.dateOfBirth || null,
          gender: doc.gender || null,
          bloodGroup: doc.bloodGroup || null,
          profileImage: doc.profileImage || '',
          idProofType: doc.idProofType || null,
          idProofNumber: doc.idProofNumber || null,
          address: doc.address ? toPlain(doc.address) : null,
          skills: doc.skills || [],
          specializations: doc.specializations || [],
          languages: doc.languages || [],
          experience: doc.experience ? toPlain(doc.experience) : { years: 0, description: '' },
          certifications: doc.certifications ? toPlain(doc.certifications) : [],
          trainingCompleted: doc.trainingCompleted ? toPlain(doc.trainingCompleted) : [],
          availability: doc.availability || 'available',
          availabilitySchedule: doc.availabilitySchedule ? toPlain(doc.availabilitySchedule) : null,
          currentLocation: doc.currentLocation ? toPlain(doc.currentLocation) : null,
          preferredWorkAreas: doc.preferredWorkAreas || [],
          willingToTravel: doc.willingToTravel ?? true,
          maxTravelDistance: doc.maxTravelDistance ?? 50,
          assignedDisasters: doc.assignedDisasters ? toPlain(doc.assignedDisasters) : [],
          currentMission: doc.currentMission || null,
          completedMissions: doc.completedMissions || 0,
          totalHoursServed: doc.totalHoursServed || 0,
          rating: doc.rating || 0,
          totalReviews: doc.totalReviews || 0,
          badges: doc.badges ? toPlain(doc.badges) : [],
          emergencyContact: doc.emergencyContact ? toPlain(doc.emergencyContact) : null,
          healthInfo: doc.healthInfo ? toPlain(doc.healthInfo) : null,
          hasOwnVehicle: doc.hasOwnVehicle ?? false,
          vehicleType: doc.vehicleType || null,
          vehicleNumber: doc.vehicleNumber || null,
          status: doc.status || 'active',
          verificationStatus: doc.verificationStatus || 'pending',
          verifiedBy: doc.verifiedBy || null,
          verifiedAt: doc.verifiedAt || null,
          joinedAt: doc.joinedAt || new Date(),
          lastActiveAt: doc.lastActiveAt || new Date(),
          adminNotes: doc.adminNotes || '',
          teamId: doc.teamId || null,
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ Volunteer ${doc.volunteerId}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} Volunteers migrated`);
}

async function migrateVolunteerTeams() {
  console.log('📦 Migrating VolunteerTeams...');
  const docs = await VolunteerTeam.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminVolunteerTeam.upsert({
        where: { teamId: doc.teamId },
        update: {},
        create: {
          teamId: doc.teamId,
          name: doc.name,
          description: doc.description || null,
          leadId: doc.leadId,
          memberIds: doc.memberIds || [],
          specialization: doc.specialization || null,
          status: doc.status || 'active',
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ Team ${doc.teamId}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} VolunteerTeams migrated`);
}

async function migrateServiceProviders() {
  console.log('📦 Migrating ServiceProviders...');
  const docs = await ServiceProvider.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminServiceProvider.upsert({
        where: { providerId: doc.providerId },
        update: {},
        create: {
          providerId: doc.providerId,
          userId: doc.userId,
          businessName: doc.businessName,
          businessType: doc.businessType || 'individual',
          einNumber: doc.einNumber || null,
          registrationNumber: doc.registrationNumber || null,
          stateRegistration: doc.stateRegistration ? toPlain(doc.stateRegistration) : null,
          description: doc.description || '',
          tagline: doc.tagline || '',
          logo: doc.logo || '',
          coverImage: doc.coverImage || '',
          gallery: doc.gallery ? toPlain(doc.gallery) : [],
          contactPerson: doc.contactPerson ? toPlain(doc.contactPerson) : null,
          website: doc.website || null,
          socialLinks: doc.socialLinks ? toPlain(doc.socialLinks) : null,
          category: doc.category,
          subcategories: doc.subcategories || [],
          serviceType: doc.serviceType || null,
          services: doc.services ? toPlain(doc.services) : [],
          equipmentAvailable: doc.equipmentAvailable ? toPlain(doc.equipmentAvailable) : [],
          teamSize: doc.teamSize || 1,
          vehiclesAvailable: doc.vehiclesAvailable ? toPlain(doc.vehiclesAvailable) : [],
          location: doc.location ? toPlain(doc.location) : { type: 'Point', coordinates: [0, 0] },
          serviceAreas: doc.serviceAreas ? toPlain(doc.serviceAreas) : [],
          maxServiceRadius: doc.maxServiceRadius || 50,
          operatingHours: doc.operatingHours ? toPlain(doc.operatingHours) : [],
          is24x7Available: doc.is24x7Available ?? false,
          pricing: doc.pricing ? toPlain(doc.pricing) : null,
          paymentMethods: doc.paymentMethods || [],
          isAvailableForEmergency: doc.isAvailableForEmergency ?? true,
          emergencyCharges: doc.emergencyCharges || 0,
          emergencyResponseTime: doc.emergencyResponseTime || null,
          yearsOfExperience: doc.yearsOfExperience || 0,
          certifications: doc.certifications ? toPlain(doc.certifications) : [],
          licenses: doc.licenses ? toPlain(doc.licenses) : [],
          insuranceDetails: doc.insuranceDetails ? toPlain(doc.insuranceDetails) : null,
          documents: doc.documents ? toPlain(doc.documents) : [],
          rating: doc.rating || 0,
          totalReviews: doc.totalReviews || 0,
          verified: doc.verified ?? false,
          verificationStatus: doc.verificationStatus || 'pending',
          verifiedBy: doc.verifiedBy?.toString() || null,
          verifiedAt: doc.verifiedAt || null,
          totalJobsCompleted: doc.totalJobsCompleted || 0,
          totalEmergencyResponses: doc.totalEmergencyResponses || 0,
          status: doc.status || 'active',
          adminNotes: doc.adminNotes || '',
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ SP ${doc.providerId}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} ServiceProviders migrated`);
}

async function migrateDisasters() {
  console.log('📦 Migrating Disasters...');
  const docs = await Disaster.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminDisaster.create({
        data: {
          title: doc.title,
          description: doc.description,
          type: doc.type,
          severity: doc.severity,
          status: doc.status || 'active',
          location: doc.location ? toPlain(doc.location) : {},
          affectedArea: doc.affectedArea || 0,
          affectedPopulation: doc.affectedPopulation || 0,
          casualties: doc.casualties ? toPlain(doc.casualties) : { deaths: 0, injured: 0, missing: 0 },
          resources: doc.resources ? toPlain(doc.resources) : {},
          assignedVolunteers: doc.assignedVolunteers ? toPlain(doc.assignedVolunteers) : [],
          reportedBy: doc.reportedBy?.toString() || null,
          reportedAt: doc.reportedAt || new Date(),
          startedAt: doc.startedAt || new Date(),
          resolvedAt: doc.resolvedAt || null,
          images: doc.images || [],
          updates: doc.updates ? toPlain(doc.updates) : [],
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ Disaster ${doc.title}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} Disasters migrated`);
}

async function migrateEmergencies() {
  console.log('📦 Migrating Emergencies...');
  const docs = await Emergency.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminEmergency.create({
        data: {
          title: doc.title,
          description: doc.description,
          type: doc.type,
          priority: doc.priority,
          status: doc.status || 'pending',
          disasterId: doc.disasterId?.toString() || null,
          location: doc.location ? toPlain(doc.location) : {},
          requestedBy: doc.requestedBy ? toPlain(doc.requestedBy) : {},
          assignedTo: (doc.assignedTo || []).map((id: any) => id.toString()),
          numberOfPeople: doc.numberOfPeople || 1,
          specialRequirements: doc.specialRequirements || [],
          estimatedTime: doc.estimatedTime || null,
          actualCompletionTime: doc.actualCompletionTime || null,
          notes: doc.notes || [],
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ Emergency ${doc.title}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} Emergencies migrated`);
}

async function migrateShelters() {
  console.log('📦 Migrating Shelters...');
  const docs = await Shelter.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminShelter.create({
        data: {
          name: doc.name,
          addressLine1: doc.addressLine1,
          addressLine2: doc.addressLine2 || null,
          city: doc.city,
          state: doc.state,
          zipCode: doc.zipCode || null,
          country: doc.country || 'United States',
          capacity: doc.capacity,
          currentOccupancy: doc.currentOccupancy || 0,
          contactPerson: doc.contactPerson,
          contactPhone: doc.contactPhone,
          contactEmail: doc.contactEmail || null,
          description: doc.description || null,
          website: doc.website || null,
          operatingHours: doc.operatingHours || null,
          notes: doc.notes || null,
          facilities: doc.facilities || [],
          status: doc.status || 'active',
          type: doc.type,
          coordinates: doc.coordinates ? toPlain(doc.coordinates) : { lat: 0, lng: 0 },
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ Shelter ${doc.name}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} Shelters migrated`);
}

async function migrateDevices() {
  console.log('📦 Migrating Devices...');
  const docs = await Device.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminDevice.upsert({
        where: { deviceId: doc.deviceId },
        update: {},
        create: {
          deviceId: doc.deviceId,
          deviceName: doc.deviceName,
          deviceType: doc.deviceType,
          ownerName: doc.ownerName,
          registeredDate: doc.registeredDate || new Date(),
          location: doc.location ? toPlain(doc.location) : {},
          batteryLevel: doc.batteryLevel ?? 100,
          signalStrength: doc.signalStrength ?? 100,
          firmwareVersion: doc.firmwareVersion || '2.4.1',
          lastSynced: doc.lastSynced || new Date(),
          status: doc.status || 'active',
          features: doc.features ? toPlain(doc.features) : null,
          primaryOwner: doc.primaryOwner ? toPlain(doc.primaryOwner) : { name: doc.ownerName, role: 'Device Owner' },
          familyMembers: doc.familyMembers ? toPlain(doc.familyMembers) : [],
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ Device ${doc.deviceId}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} Devices migrated`);
}

async function migrateIncidents() {
  console.log('📦 Migrating Incidents...');
  const docs = await Incident.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminIncident.upsert({
        where: { ticketNumber: doc.ticketNumber },
        update: {},
        create: {
          ticketNumber: doc.ticketNumber,
          type: doc.type,
          title: doc.title,
          description: doc.description,
          priority: doc.priority || 'low',
          status: doc.status || 'open',
          reportedBy: doc.reportedBy ? toPlain(doc.reportedBy) : {},
          assignedTo: doc.assignedTo || 'Unassigned',
          attachments: doc.attachments || [],
          notes: doc.notes ? toPlain(doc.notes) : [],
          timeline: doc.timeline ? toPlain(doc.timeline) : [],
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ Incident ${doc.ticketNumber}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} Incidents migrated`);
}

async function migrateInventoryItems() {
  console.log('📦 Migrating InventoryItems...');
  const docs = await InventoryItem.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminInventoryItem.create({
        data: {
          name: doc.name,
          description: doc.description || null,
          category: doc.category,
          unit: doc.unit,
          sku: doc.sku || null,
          barcode: doc.barcode || null,
          image: doc.image || '',
          isActive: doc.isActive ?? true,
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ InventoryItem ${doc.name}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} InventoryItems migrated`);
}

async function migrateStockLocations() {
  console.log('📦 Migrating StockLocations...');
  const docs = await StockLocation.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminStockLocation.create({
        data: {
          name: doc.name,
          address: doc.address ? toPlain(doc.address) : {},
          coordinates: doc.coordinates ? toPlain(doc.coordinates) : { type: 'Point', coordinates: [0, 0] },
          contactPerson: doc.contactPerson ? toPlain(doc.contactPerson) : null,
          capacity: doc.capacity ? toPlain(doc.capacity) : null,
          isActive: doc.isActive ?? true,
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ StockLocation ${doc.name}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} StockLocations migrated`);
}

async function migrateStockEntries() {
  console.log('📦 Migrating StockEntries...');
  const docs = await StockEntry.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminStockEntry.create({
        data: {
          item: doc.item ? toPlain(doc.item) : {},
          location: doc.location ? toPlain(doc.location) : {},
          inventory: doc.inventory ? toPlain(doc.inventory) : { currentQuantity: 0, unit: 'units', threshold: 0, reservedQuantity: 0, availableQuantity: 0 },
          status: doc.status || 'In-Stock',
          batches: doc.batches ? toPlain(doc.batches) : [],
          actions: doc.actions ? toPlain(doc.actions) : [],
          auditLog: doc.auditLog ? toPlain(doc.auditLog) : [],
          tags: doc.tags || [],
          lastUpdated: doc.lastUpdated || new Date(),
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ StockEntry ${doc.item?.name}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} StockEntries migrated`);
}

async function migrateProducts() {
  console.log('📦 Migrating Products...');
  const docs = await Product.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminProduct.upsert({
        where: { sku: doc.sku },
        update: {},
        create: {
          name: doc.name,
          description: doc.description || null,
          sku: doc.sku,
          barcode: doc.barcode || null,
          category: doc.category,
          subcategory: doc.subcategory || null,
          costPrice: doc.costPrice || 0,
          sellingPrice: doc.sellingPrice || 0,
          discount: doc.discount || 0,
          taxRate: doc.taxRate || 0,
          stock: doc.stock ? toPlain(doc.stock) : { quantity: 0, lowStockThreshold: 10, reservedQuantity: 0, availableQuantity: 0, reorderPoint: 0, maxStock: 0 },
          brand: doc.brand || null,
          model: doc.model || null,
          size: doc.size || [],
          color: doc.color || [],
          material: doc.material || null,
          weight: doc.weight || null,
          dimensions: doc.dimensions ? toPlain(doc.dimensions) : null,
          safetyFeatures: doc.safetyFeatures || [],
          safetyStandards: doc.safetyStandards || [],
          certifications: doc.certifications || [],
          images: doc.images ? toPlain(doc.images) : [],
          videoUrl: doc.videoUrl || null,
          model3dUrl: doc.model3dUrl || null,
          model3dFormat: doc.model3dFormat || null,
          keyFeatures: doc.keyFeatures || [],
          variants: doc.variants ? toPlain(doc.variants) : [],
          categoryAttributes: doc.categoryAttributes ? toPlain(doc.categoryAttributes) : null,
          specifications: doc.specifications ? toPlain(doc.specifications) : [],
          vendor: doc.vendor ? toPlain(doc.vendor) : null,
          status: doc.status || 'active',
          isFeatured: doc.isFeatured ?? false,
          tags: doc.tags || [],
          warrantyPeriod: doc.warrantyPeriod || null,
          returnPolicy: doc.returnPolicy || null,
          shippingInfo: doc.shippingInfo ? toPlain(doc.shippingInfo) : null,
          createdBy: doc.createdBy || null,
          lastModifiedBy: doc.lastModifiedBy || null,
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ Product ${doc.sku}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} Products migrated`);
}

async function migrateDamageReports() {
  console.log('📦 Migrating DamageReports...');
  const docs = await DamageReport.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminDamageReport.upsert({
        where: { reportNumber: doc.reportNumber },
        update: {},
        create: {
          customer: doc.customer ? toPlain(doc.customer) : {},
          reportNumber: doc.reportNumber,
          reportDate: doc.reportDate || new Date(),
          reportedBy: doc.reportedBy ? toPlain(doc.reportedBy) : {},
          propertyAddress: doc.propertyAddress ? toPlain(doc.propertyAddress) : {},
          damageType: doc.damageType,
          severity: doc.severity,
          status: doc.status || 'report_created',
          description: doc.description,
          affectedAreas: doc.affectedAreas || [],
          estimatedCost: doc.estimatedCost || 0,
          actualCost: doc.actualCost || null,
          fundingSources: doc.fundingSources ? toPlain(doc.fundingSources) : [],
          insuranceCoverage: doc.insuranceCoverage || null,
          workflowSteps: doc.workflowSteps ? toPlain(doc.workflowSteps) : [],
          currentStep: doc.currentStep || 1,
          assignedAdjuster: doc.assignedAdjuster ? toPlain(doc.assignedAdjuster) : null,
          assignedVendors: doc.assignedVendors ? toPlain(doc.assignedVendors) : [],
          images: doc.images ? toPlain(doc.images) : [],
          notes: doc.notes || null,
          tags: doc.tags || [],
          priority: doc.priority || 'medium',
          createdBy: doc.createdBy || null,
          lastModifiedBy: doc.lastModifiedBy || null,
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ DamageReport ${doc.reportNumber}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} DamageReports migrated`);
}

async function migrateAdjusters() {
  console.log('📦 Migrating Adjusters...');
  const docs = await Adjuster.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminAdjuster.upsert({
        where: { adjusterId: doc.adjusterId },
        update: {},
        create: {
          adjusterId: doc.adjusterId,
          photo: doc.photo || null,
          firstName: doc.firstName,
          lastName: doc.lastName,
          email: doc.email,
          phone: doc.phone || null,
          companyName: doc.companyName || null,
          address: doc.address ? toPlain(doc.address) : null,
          certifications: doc.certifications ? toPlain(doc.certifications) : [],
          specializations: doc.specializations || [],
          documents: doc.documents ? toPlain(doc.documents) : [],
          states: doc.states || [],
          licenseNumber: doc.licenseNumber || null,
          yearsOfExperience: doc.yearsOfExperience || null,
          status: doc.status || 'active',
          assignedReports: doc.assignedReports ? toPlain(doc.assignedReports) : [],
          totalReportsHandled: doc.totalReportsHandled || 0,
          currentActiveReports: doc.currentActiveReports || 0,
          isAvailable: doc.isAvailable ?? true,
          availabilityNotes: doc.availabilityNotes || null,
          averageRating: doc.averageRating || null,
          totalRatings: doc.totalRatings || 0,
          notes: doc.notes || null,
          createdBy: doc.createdBy || null,
          lastModifiedBy: doc.lastModifiedBy || null,
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ Adjuster ${doc.adjusterId}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} Adjusters migrated`);
}

async function migrateOrders() {
  console.log('📦 Migrating Orders...');
  const docs = await Order.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminOrder.upsert({
        where: { orderId: doc.id },
        update: {},
        create: {
          orderId: doc.id,
          stripeSessionId: doc.stripe_session_id,
          customerEmail: doc.customer_email,
          amountTotalCents: doc.amount_total_cents || null,
          amountTotal: doc.amount_total || null,
          amountSubtotal: doc.amount_subtotal || null,
          shippingAmount: doc.shipping_amount || null,
          currency: doc.currency || 'usd',
          paymentStatus: doc.payment_status,
          shippingAddress: doc.shipping_address ? toPlain(doc.shipping_address) : {},
          billingAddress: doc.billing_address ? toPlain(doc.billing_address) : null,
          billingSameAsShipping: doc.billing_same_as_shipping || null,
          lineItems: doc.line_items ? toPlain(doc.line_items) : [],
          orderCreatedAt: doc.created_at || new Date(),
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ Order ${doc.id}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} Orders migrated`);
}

async function migrateCategoryDocReqs() {
  console.log('📦 Migrating CategoryDocumentRequirements...');
  const docs = await CategoryDocumentRequirement.find({}).lean();
  let count = 0;
  for (const doc of docs) {
    try {
      await prisma.adminCategoryDocReq.upsert({
        where: { category: doc.category },
        update: {},
        create: {
          category: doc.category,
          categoryLabel: doc.categoryLabel,
          documents: doc.documents ? toPlain(doc.documents) : [],
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        },
      });
      count++;
    } catch (e: any) {
      console.error(`  ❌ CategoryDocReq ${doc.category}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count}/${docs.length} CategoryDocumentRequirements migrated`);
}

async function seedSuperAdmin() {
  console.log('🔐 Seeding Super Admin...');
  const email = 'admin@r3sults.com';
  const existing = await prisma.opsUser.findUnique({ where: { email } });
  if (existing) {
    console.log('  ℹ️  Super Admin already exists, skipping');
    return;
  }
  const hashedPassword = await bcrypt.hash('R3sults@Admin2024', 12);
  await prisma.opsUser.create({
    data: {
      firstName: 'Super',
      lastName: 'Admin',
      name: 'Super Admin',
      email,
      password: hashedPassword,
      phone: '',
      role: 'super_admin',
      status: 'active',
    },
  });
  console.log('  ✅ Super Admin created: admin@r3sults.com / R3sults@Admin2024');
}

async function main() {
  console.log('🚀 Starting MongoDB → Postgres Migration\n');
  console.log(`MongoDB: ${process.env.MONGODB_URI?.substring(0, 40)}...`);
  console.log(`Postgres: ${process.env.POSTGRES_URI?.substring(0, 40)}...\n`);

  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('✅ Connected to MongoDB\n');

  // Run all migrations
  await migrateOpsUsers();
  await migrateUsers();
  await migrateVolunteers();
  await migrateVolunteerTeams();
  await migrateServiceProviders();
  await migrateDisasters();
  await migrateEmergencies();
  await migrateShelters();
  await migrateDevices();
  await migrateIncidents();
  await migrateInventoryItems();
  await migrateStockLocations();
  await migrateStockEntries();
  await migrateProducts();
  await migrateDamageReports();
  await migrateAdjusters();
  await migrateOrders();
  await migrateCategoryDocReqs();

  console.log('\n🔐 Seeding accounts...');
  await seedSuperAdmin();

  // Cleanup
  await mongoose.disconnect();
  await prisma.$disconnect();
  await pool.end();

  console.log('\n🎉 Migration complete!');
}

main().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
