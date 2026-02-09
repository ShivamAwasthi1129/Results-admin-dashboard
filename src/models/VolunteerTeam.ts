import mongoose, { Schema, Document, Model } from 'mongoose';
// Ensure Volunteer model is registered before this schema (ref: 'Volunteer')
import Volunteer from './Volunteer';
void Volunteer;

export interface IVolunteerTeam {
  _id?: string;
  teamId: string; // Unique team identifier
  name: string;
  description?: string;
  leadId: string; // Volunteer ID who is the team lead
  memberIds: string[]; // Array of volunteer IDs in the team
  specialization?: string; // e.g., "Search & Rescue", "Medical", "Logistics"
  status: 'active' | 'inactive' | 'on_mission';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVolunteerTeamDocument extends Omit<IVolunteerTeam, '_id'>, Document {}

// Generate unique team ID
function generateTeamId(): string {
  return `TEAM-${Math.floor(1000 + Math.random() * 9000)}`;
}

const VolunteerTeamSchema = new Schema<IVolunteerTeamDocument>(
  {
    teamId: {
      type: String,
      unique: true,
      required: true,
      default: generateTeamId,
    },
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    leadId: {
      type: String,
      required: [true, 'Team lead is required'],
      ref: 'Volunteer',
    },
    memberIds: [{
      type: String,
      ref: 'Volunteer',
    }],
    specialization: {
      type: String,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on_mission'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'volunteer_teams',
  }
);

// Indexes
VolunteerTeamSchema.index({ leadId: 1 });
VolunteerTeamSchema.index({ memberIds: 1 });
VolunteerTeamSchema.index({ status: 1, specialization: 1 });

// Pre-save hook to ensure unique teamId
VolunteerTeamSchema.pre('save', async function() {
  if (this.isNew && !this.teamId) {
    let isUnique = false;
    while (!isUnique) {
      const newId = generateTeamId();
      const existing = await mongoose.models.VolunteerTeam.findOne({ teamId: newId });
      if (!existing) {
        this.teamId = newId;
        isUnique = true;
      }
    }
  }
  
  // Ensure lead is in memberIds
  if (this.leadId && !this.memberIds.includes(this.leadId)) {
    this.memberIds.push(this.leadId);
  }
});

const VolunteerTeam: Model<IVolunteerTeamDocument> =
  mongoose.models.VolunteerTeam || mongoose.model<IVolunteerTeamDocument>('VolunteerTeam', VolunteerTeamSchema);

export default VolunteerTeam;

