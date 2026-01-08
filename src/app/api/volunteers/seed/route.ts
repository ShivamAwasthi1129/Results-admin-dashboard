import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Volunteer from '@/models/Volunteer';
import VolunteerTeam from '@/models/VolunteerTeam';
import User from '@/models/User';
import { verifyAuth, hashPassword } from '@/lib/auth';

// POST - Seed sample volunteer and team data
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Clear existing data
    await Volunteer.deleteMany({});
    await VolunteerTeam.deleteMany({});
    
    // Also delete volunteer users
    await User.deleteMany({ role: 'volunteer' });

    // Create teams first
    const teams = [
      {
        name: 'Search & Rescue Alpha',
        description: 'Primary search and rescue team specializing in urban and wilderness rescue operations',
        specialization: 'Search & Rescue',
        status: 'active' as const,
      },
      {
        name: 'Medical Response Team',
        description: 'Emergency medical response team with certified EMTs and paramedics',
        specialization: 'Medical',
        status: 'active' as const,
      },
      {
        name: 'Logistics & Supply',
        description: 'Handles supply chain, transportation, and resource distribution',
        specialization: 'Logistics',
        status: 'active' as const,
      },
      {
        name: 'Water Rescue Unit',
        description: 'Specialized in water-based rescue operations and flood response',
        specialization: 'Water Rescue',
        status: 'active' as const,
      },
      {
        name: 'Communication Team',
        description: 'Manages emergency communications and coordination',
        specialization: 'Communication',
        status: 'active' as const,
      },
    ];

    const createdTeams = [];
    for (const teamData of teams) {
      const team = await VolunteerTeam.create(teamData);
      createdTeams.push(team);
    }

    // Sample volunteer data
    const volunteerData = [
      {
        name: 'John Smith',
        email: 'john.smith@volunteer.com',
        phone: '+1-555-0101',
        dateOfBirth: '1985-03-15',
        gender: 'male',
        bloodGroup: 'O+',
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        skills: ['First Aid', 'Rescue', 'Navigation', 'Communication'],
        specializations: ['Urban Rescue', 'Wilderness Search'],
        languages: ['English', 'Spanish'],
        experienceYears: 8,
        experienceDescription: 'Extensive experience in search and rescue operations, certified in wilderness first aid',
        availability: 'available',
        weekdays: true,
        weekends: true,
        nights: true,
        preferredShift: 'any',
        preferredWorkAreas: ['Manhattan', 'Brooklyn'],
        willingToTravel: true,
        maxTravelDistance: 100,
        emergencyName: 'Jane Smith',
        emergencyPhone: '+1-555-0102',
        emergencyRelation: 'Spouse',
        emergencyEmail: 'jane.smith@example.com',
        medicalConditions: [],
        allergies: [],
        physicallyFit: true,
        hasOwnVehicle: true,
        vehicleType: 'suv',
        status: 'active',
        teamIndex: 0, // Search & Rescue Alpha
        isLead: true,
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@volunteer.com',
        phone: '+1-555-0201',
        dateOfBirth: '1990-07-22',
        gender: 'female',
        bloodGroup: 'A+',
        street: '456 Oak Avenue',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        skills: ['EMT', 'CPR', 'Medical', 'Triage'],
        specializations: ['Emergency Medicine', 'Trauma Care'],
        languages: ['English'],
        experienceYears: 5,
        experienceDescription: 'Certified EMT with experience in emergency medical response',
        availability: 'available',
        weekdays: true,
        weekends: true,
        nights: false,
        preferredShift: 'morning',
        preferredWorkAreas: ['Downtown LA', 'Hollywood'],
        willingToTravel: true,
        maxTravelDistance: 75,
        emergencyName: 'Mike Johnson',
        emergencyPhone: '+1-555-0202',
        emergencyRelation: 'Spouse',
        emergencyEmail: 'mike.johnson@example.com',
        medicalConditions: [],
        allergies: ['Penicillin'],
        physicallyFit: true,
        hasOwnVehicle: true,
        vehicleType: 'car',
        status: 'active',
        teamIndex: 1, // Medical Response Team
        isLead: true,
      },
      {
        name: 'Michael Chen',
        email: 'michael.chen@volunteer.com',
        phone: '+1-555-0301',
        dateOfBirth: '1988-11-10',
        gender: 'male',
        bloodGroup: 'B+',
        street: '789 Pine Street',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        skills: ['Logistics', 'Supply Chain', 'Transportation', 'Warehouse Management'],
        specializations: ['Resource Distribution', 'Supply Coordination'],
        languages: ['English', 'Mandarin'],
        experienceYears: 6,
        experienceDescription: 'Background in logistics and supply chain management',
        availability: 'available',
        weekdays: true,
        weekends: false,
        nights: false,
        preferredShift: 'afternoon',
        preferredWorkAreas: ['Chicago Metro'],
        willingToTravel: false,
        maxTravelDistance: 30,
        emergencyName: 'Lisa Chen',
        emergencyPhone: '+1-555-0302',
        emergencyRelation: 'Spouse',
        emergencyEmail: 'lisa.chen@example.com',
        medicalConditions: [],
        allergies: [],
        physicallyFit: true,
        hasOwnVehicle: true,
        vehicleType: 'truck',
        status: 'active',
        teamIndex: 2, // Logistics & Supply
        isLead: true,
      },
      {
        name: 'Emily Rodriguez',
        email: 'emily.rodriguez@volunteer.com',
        phone: '+1-555-0401',
        dateOfBirth: '1992-05-18',
        gender: 'female',
        bloodGroup: 'AB+',
        street: '321 Elm Street',
        city: 'Miami',
        state: 'FL',
        zipCode: '33101',
        skills: ['Water Rescue', 'Swimming', 'Boat Operation', 'Diving'],
        specializations: ['Flood Response', 'Marine Rescue'],
        languages: ['English', 'Spanish'],
        experienceYears: 4,
        experienceDescription: 'Certified lifeguard and water rescue specialist',
        availability: 'available',
        weekdays: true,
        weekends: true,
        nights: false,
        preferredShift: 'any',
        preferredWorkAreas: ['Miami Beach', 'Key West'],
        willingToTravel: true,
        maxTravelDistance: 150,
        emergencyName: 'Carlos Rodriguez',
        emergencyPhone: '+1-555-0402',
        emergencyRelation: 'Parent',
        emergencyEmail: 'carlos.rodriguez@example.com',
        medicalConditions: [],
        allergies: [],
        physicallyFit: true,
        hasOwnVehicle: false,
        vehicleType: 'none',
        status: 'active',
        teamIndex: 3, // Water Rescue Unit
        isLead: true,
      },
      {
        name: 'David Kim',
        email: 'david.kim@volunteer.com',
        phone: '+1-555-0501',
        dateOfBirth: '1987-09-25',
        gender: 'male',
        bloodGroup: 'O-',
        street: '654 Maple Drive',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98101',
        skills: ['Radio Communication', 'Network Setup', 'Coordination', 'Technical Support'],
        specializations: ['Emergency Communications', 'Radio Operations'],
        languages: ['English', 'Korean'],
        experienceYears: 7,
        experienceDescription: 'IT professional with expertise in emergency communication systems',
        availability: 'available',
        weekdays: true,
        weekends: true,
        nights: true,
        preferredShift: 'any',
        preferredWorkAreas: ['Seattle Metro'],
        willingToTravel: true,
        maxTravelDistance: 50,
        emergencyName: 'Jennifer Kim',
        emergencyPhone: '+1-555-0502',
        emergencyRelation: 'Spouse',
        emergencyEmail: 'jennifer.kim@example.com',
        medicalConditions: [],
        allergies: [],
        physicallyFit: true,
        hasOwnVehicle: true,
        vehicleType: 'van',
        status: 'active',
        teamIndex: 4, // Communication Team
        isLead: true,
      },
      // Additional team members
      {
        name: 'Robert Taylor',
        email: 'robert.taylor@volunteer.com',
        phone: '+1-555-0103',
        dateOfBirth: '1991-02-14',
        gender: 'male',
        bloodGroup: 'A+',
        street: '987 Cedar Lane',
        city: 'New York',
        state: 'NY',
        zipCode: '10002',
        skills: ['Rescue', 'Rope Work', 'Climbing'],
        specializations: ['Technical Rescue'],
        languages: ['English'],
        experienceYears: 3,
        experienceDescription: 'Rock climbing instructor with rescue training',
        availability: 'available',
        weekdays: false,
        weekends: true,
        nights: false,
        preferredShift: 'afternoon',
        preferredWorkAreas: ['Manhattan'],
        willingToTravel: true,
        maxTravelDistance: 60,
        emergencyName: 'Patricia Taylor',
        emergencyPhone: '+1-555-0104',
        emergencyRelation: 'Parent',
        emergencyEmail: 'patricia.taylor@example.com',
        medicalConditions: [],
        allergies: [],
        physicallyFit: true,
        hasOwnVehicle: false,
        vehicleType: 'none',
        status: 'active',
        teamIndex: 0,
        isLead: false,
      },
      {
        name: 'Amanda White',
        email: 'amanda.white@volunteer.com',
        phone: '+1-555-0203',
        dateOfBirth: '1993-08-30',
        gender: 'female',
        bloodGroup: 'B-',
        street: '147 Birch Street',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90002',
        skills: ['Nursing', 'First Aid', 'Patient Care'],
        specializations: ['Medical Support'],
        languages: ['English'],
        experienceYears: 2,
        experienceDescription: 'Registered nurse with emergency room experience',
        availability: 'available',
        weekdays: true,
        weekends: false,
        nights: true,
        preferredShift: 'night',
        preferredWorkAreas: ['Downtown LA'],
        willingToTravel: false,
        maxTravelDistance: 25,
        emergencyName: 'James White',
        emergencyPhone: '+1-555-0204',
        emergencyRelation: 'Spouse',
        emergencyEmail: 'james.white@example.com',
        medicalConditions: [],
        allergies: [],
        physicallyFit: true,
        hasOwnVehicle: true,
        vehicleType: 'car',
        status: 'active',
        teamIndex: 1,
        isLead: false,
      },
      {
        name: 'James Wilson',
        email: 'james.wilson@volunteer.com',
        phone: '+1-555-0303',
        dateOfBirth: '1989-12-05',
        gender: 'male',
        bloodGroup: 'O+',
        street: '258 Spruce Avenue',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60602',
        skills: ['Driving', 'Forklift', 'Inventory'],
        specializations: ['Transportation'],
        languages: ['English'],
        experienceYears: 4,
        experienceDescription: 'Commercial driver with warehouse experience',
        availability: 'available',
        weekdays: true,
        weekends: true,
        nights: false,
        preferredShift: 'morning',
        preferredWorkAreas: ['Chicago Metro'],
        willingToTravel: true,
        maxTravelDistance: 100,
        emergencyName: 'Mary Wilson',
        emergencyPhone: '+1-555-0304',
        emergencyRelation: 'Spouse',
        emergencyEmail: 'mary.wilson@example.com',
        medicalConditions: [],
        allergies: [],
        physicallyFit: true,
        hasOwnVehicle: true,
        vehicleType: 'truck',
        status: 'active',
        teamIndex: 2,
        isLead: false,
      },
      {
        name: 'Maria Garcia',
        email: 'maria.garcia@volunteer.com',
        phone: '+1-555-0403',
        dateOfBirth: '1994-04-12',
        gender: 'female',
        bloodGroup: 'A-',
        street: '369 Willow Way',
        city: 'Miami',
        state: 'FL',
        zipCode: '33102',
        skills: ['Swimming', 'Boat Operation'],
        specializations: ['Water Safety'],
        languages: ['English', 'Spanish'],
        experienceYears: 2,
        experienceDescription: 'Certified swim instructor and boat operator',
        availability: 'available',
        weekdays: true,
        weekends: true,
        nights: false,
        preferredShift: 'any',
        preferredWorkAreas: ['Miami Beach'],
        willingToTravel: true,
        maxTravelDistance: 80,
        emergencyName: 'Jose Garcia',
        emergencyPhone: '+1-555-0404',
        emergencyRelation: 'Parent',
        emergencyEmail: 'jose.garcia@example.com',
        medicalConditions: [],
        allergies: [],
        physicallyFit: true,
        hasOwnVehicle: false,
        vehicleType: 'none',
        status: 'active',
        teamIndex: 3,
        isLead: false,
      },
      {
        name: 'Kevin Park',
        email: 'kevin.park@volunteer.com',
        phone: '+1-555-0503',
        dateOfBirth: '1990-06-20',
        gender: 'male',
        bloodGroup: 'AB-',
        street: '741 Ash Boulevard',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98102',
        skills: ['Radio', 'Technical Support', 'IT'],
        specializations: ['Technical Support'],
        languages: ['English', 'Korean'],
        experienceYears: 3,
        experienceDescription: 'IT support specialist with radio communication experience',
        availability: 'available',
        weekdays: true,
        weekends: false,
        nights: false,
        preferredShift: 'afternoon',
        preferredWorkAreas: ['Seattle Metro'],
        willingToTravel: false,
        maxTravelDistance: 30,
        emergencyName: 'Susan Park',
        emergencyPhone: '+1-555-0504',
        emergencyRelation: 'Spouse',
        emergencyEmail: 'susan.park@example.com',
        medicalConditions: [],
        allergies: [],
        physicallyFit: true,
        hasOwnVehicle: true,
        vehicleType: 'car',
        status: 'active',
        teamIndex: 4,
        isLead: false,
      },
    ];

    const createdVolunteers = [];
    for (const volData of volunteerData) {
      // Create user account
      const hashedPassword = await hashPassword('volunteer123');
      const firstName = volData.name.split(' ')[0];
      const lastName = volData.name.split(' ').slice(1).join(' ');
      
      const user = await User.create({
        firstName,
        lastName,
        name: volData.name,
        email: volData.email.toLowerCase(),
        phone: volData.phone,
        password: hashedPassword,
        role: 'volunteer',
        status: 'active',
        address: {
          street: volData.street,
          city: volData.city,
          state: volData.state,
          pincode: volData.zipCode,
          country: 'United States',
        },
      });

      // Create volunteer profile
      const volunteer = await Volunteer.create({
        userId: user._id.toString(),
        dateOfBirth: new Date(volData.dateOfBirth),
        gender: volData.gender,
        bloodGroup: volData.bloodGroup,
        profileImage: '',
        address: {
          street: volData.street,
          city: volData.city,
          state: volData.state,
          pincode: volData.zipCode,
          country: 'United States',
        },
        skills: volData.skills,
        specializations: volData.specializations,
        languages: volData.languages,
        experience: {
          years: volData.experienceYears,
          description: volData.experienceDescription,
        },
        availability: volData.availability,
        availabilitySchedule: {
          weekdays: volData.weekdays,
          weekends: volData.weekends,
          nights: volData.nights,
          preferredShift: volData.preferredShift,
        },
        preferredWorkAreas: volData.preferredWorkAreas,
        willingToTravel: volData.willingToTravel,
        maxTravelDistance: volData.maxTravelDistance,
        emergencyContact: {
          name: volData.emergencyName,
          phone: volData.emergencyPhone,
          relation: volData.emergencyRelation,
          email: volData.emergencyEmail,
        },
        healthInfo: {
          medicalConditions: volData.medicalConditions,
          allergies: volData.allergies,
          medications: [],
          physicallyFit: volData.physicallyFit,
        },
        hasOwnVehicle: volData.hasOwnVehicle,
        vehicleType: volData.vehicleType,
        vehicleNumber: '',
        status: volData.status,
        rating: Math.random() * 2 + 3, // Random rating between 3-5
        totalReviews: Math.floor(Math.random() * 20) + 5,
        completedMissions: Math.floor(Math.random() * 15),
        totalHoursServed: Math.floor(Math.random() * 200) + 50,
      });

      createdVolunteers.push({ volunteer: volunteer as any, teamIndex: volData.teamIndex, isLead: volData.isLead });
    }

    // Assign volunteers to teams
    for (let i = 0; i < createdTeams.length; i++) {
      const team = createdTeams[i];
      const teamVolunteers = createdVolunteers.filter(v => v.teamIndex === i);
      const lead = teamVolunteers.find(v => v.isLead);
      const members = teamVolunteers.map(v => v.volunteer._id.toString());

      if (lead) {
        await VolunteerTeam.findByIdAndUpdate(team._id, {
          leadId: (lead.volunteer as any)._id.toString(),
          memberIds: members,
        });

        // Update volunteers with teamId
        await Volunteer.updateMany(
          { _id: { $in: members } },
          { $set: { teamId: team._id.toString() } }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${createdVolunteers.length} volunteers and ${createdTeams.length} teams`,
      data: {
        volunteers: createdVolunteers.length,
        teams: createdTeams.length,
      },
    });
  } catch (error: any) {
    console.error('Error seeding volunteer data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to seed volunteer data' },
      { status: 500 }
    );
  }
}

