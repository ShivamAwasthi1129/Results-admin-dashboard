import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Volunteer from '@/models/Volunteer';
import ServiceProvider from '@/models/ServiceProvider';
import Disaster from '@/models/Disaster';
import Emergency from '@/models/Emergency';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    await connectDB();

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    
    if (existingSuperAdmin) {
      return NextResponse.json({
        success: true,
        message: 'Database already seeded. Super admin exists.',
      });
    }

    // Create Super Admin
    const superAdminPassword = await hashPassword('superadmin123');
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@results.com',
      password: superAdminPassword,
      phone: '+91 9876543210',
      role: 'super_admin',
      status: 'active',
      address: {
        street: '123 Admin Street',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        country: 'India',
      },
    });

    // Create Admin
    const adminPassword = await hashPassword('admin123');
    const admin = await User.create({
      name: 'John Admin',
      email: 'admin@results.com',
      password: adminPassword,
      phone: '+91 9876543211',
      role: 'admin',
      status: 'active',
      address: {
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      },
    });

    // Create Volunteers
    const volunteerPassword = await hashPassword('volunteer123');
    const volunteers = [];
    const volunteerData = [
      { name: 'Rahul Sharma', email: 'rahul@results.com', phone: '+91 9876543212', city: 'Delhi' },
      { name: 'Priya Patel', email: 'priya@results.com', phone: '+91 9876543213', city: 'Mumbai' },
      { name: 'Amit Kumar', email: 'amit@results.com', phone: '+91 9876543214', city: 'Chennai' },
      { name: 'Sneha Gupta', email: 'sneha@results.com', phone: '+91 9876543215', city: 'Kolkata' },
      { name: 'Vikram Singh', email: 'vikram@results.com', phone: '+91 9876543216', city: 'Bangalore' },
    ];

    // Default profile images for volunteers
    const defaultProfileImages = [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
    ];

    for (let i = 0; i < volunteerData.length; i++) {
      const vol = volunteerData[i];
      const user = await User.create({
        name: vol.name,
        email: vol.email,
        password: volunteerPassword,
        phone: vol.phone,
        role: 'volunteer',
        status: 'active',
        address: { city: vol.city, country: 'India' },
      });
      
      const volunteer = await Volunteer.create({
        userId: user._id,
        skills: ['First Aid', 'Rescue Operations', 'Communication'],
        availability: 'available',
        currentLocation: {
          type: 'Point',
          coordinates: [77.2090 + Math.random() * 5, 28.6139 + Math.random() * 5],
        },
        completedMissions: Math.floor(Math.random() * 20),
        rating: 4 + Math.random(),
        profileImage: defaultProfileImages[i % defaultProfileImages.length],
        certifications: [
          { name: 'CPR Certified', issuedBy: 'Red Cross', issuedDate: new Date('2023-01-15') },
          { name: 'Disaster Response Training', issuedBy: 'NDMA', issuedDate: new Date('2023-06-20') },
        ],
      });
      
      volunteers.push({ user, volunteer });
    }

    // Create Service Providers
    const serviceProviderPassword = await hashPassword('service123');
    const serviceProviderData = [
      { 
        name: 'Quick Medical Services', 
        email: 'medical@results.com', 
        businessName: 'Quick Medical Services',
        category: 'medical',
        city: 'Delhi',
      },
      { 
        name: 'Safe Transport Co.', 
        email: 'transport@results.com', 
        businessName: 'Safe Transport Co.',
        category: 'transportation',
        city: 'Mumbai',
      },
      { 
        name: 'Shelter Solutions', 
        email: 'shelter@results.com', 
        businessName: 'Shelter Solutions Pvt Ltd',
        category: 'shelter',
        city: 'Chennai',
      },
      { 
        name: 'Food Relief India', 
        email: 'food@results.com', 
        businessName: 'Food Relief India',
        category: 'food_water',
        city: 'Kolkata',
      },
    ];

    // Sample service images by category
    const serviceImages: Record<string, string[]> = {
      medical: [
        'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=400&h=300&fit=crop',
      ],
      transportation: [
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=300&fit=crop',
      ],
      shelter: [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1562619371-b67725b6fde2?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=300&fit=crop',
      ],
      food_water: [
        'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&h=300&fit=crop',
      ],
    };

    // Provider gallery images
    const providerGalleryImages = [
      { url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop', caption: 'Our Team at Work' },
      { url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&h=400&fit=crop', caption: 'Emergency Response' },
      { url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop', caption: 'Training Session' },
    ];

    for (const sp of serviceProviderData) {
      const user = await User.create({
        name: sp.name,
        email: sp.email,
        password: serviceProviderPassword,
        phone: '+91 ' + Math.floor(9000000000 + Math.random() * 999999999),
        role: 'service_provider',
        status: 'active',
        address: { city: sp.city, country: 'India' },
      });

      const categoryImages = serviceImages[sp.category] || serviceImages.medical;

      await ServiceProvider.create({
        userId: user._id,
        businessName: sp.businessName,
        description: `Professional ${sp.category} services for disaster relief and emergency situations.`,
        category: sp.category,
        logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop',
        coverImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=400&fit=crop',
        gallery: providerGalleryImages,
        services: [
          {
            name: `Emergency ${sp.category.replace('_', ' ')} Service`,
            description: 'Available 24/7 for emergency situations',
            price: 0,
            priceType: 'negotiable',
            isActive: true,
            images: categoryImages,
          },
          {
            name: `Standard ${sp.category.replace('_', ' ')} Support`,
            description: 'Regular support and assistance services',
            price: 500,
            priceType: 'hourly',
            isActive: true,
            images: [categoryImages[0], categoryImages[1]],
          },
        ],
        location: {
          type: 'Point',
          coordinates: [77.2090 + Math.random() * 5, 28.6139 + Math.random() * 5],
          address: '123 Service Street',
          city: sp.city,
          state: 'State',
          pincode: '110001',
        },
        rating: 4 + Math.random(),
        verified: true,
        isAvailableForEmergency: true,
      });
    }

    // Create Sample Disasters
    const disasters = [
      {
        title: 'Flood in Bihar',
        description: 'Heavy flooding in multiple districts due to excessive rainfall.',
        type: 'flood',
        severity: 'high',
        status: 'active',
        location: {
          type: 'Point',
          coordinates: [85.3131, 25.5941],
          address: 'Patna District',
          city: 'Patna',
          state: 'Bihar',
          country: 'India',
        },
        affectedArea: 150,
        affectedPopulation: 50000,
        casualties: { deaths: 12, injured: 45, missing: 8 },
        resources: { volunteersDeployed: 25, serviceProvidersEngaged: 8, fundsAllocated: 5000000 },
        reportedBy: superAdmin._id,
        startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Earthquake in Gujarat',
        description: 'Moderate earthquake measuring 5.2 on Richter scale.',
        type: 'earthquake',
        severity: 'medium',
        status: 'monitoring',
        location: {
          type: 'Point',
          coordinates: [72.8777, 19.0760],
          address: 'Kutch District',
          city: 'Bhuj',
          state: 'Gujarat',
          country: 'India',
        },
        affectedArea: 80,
        affectedPopulation: 15000,
        casualties: { deaths: 2, injured: 28, missing: 0 },
        resources: { volunteersDeployed: 15, serviceProvidersEngaged: 5, fundsAllocated: 2000000 },
        reportedBy: admin._id,
        startedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Cyclone Alert - Odisha Coast',
        description: 'Cyclone approaching eastern coast with expected landfall in 48 hours.',
        type: 'cyclone',
        severity: 'critical',
        status: 'active',
        location: {
          type: 'Point',
          coordinates: [85.8245, 20.2961],
          address: 'Coastal Odisha',
          city: 'Puri',
          state: 'Odisha',
          country: 'India',
        },
        affectedArea: 300,
        affectedPopulation: 200000,
        casualties: { deaths: 0, injured: 5, missing: 0 },
        resources: { volunteersDeployed: 100, serviceProvidersEngaged: 25, fundsAllocated: 15000000 },
        reportedBy: superAdmin._id,
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ];

    const createdDisasters = [];
    for (const disaster of disasters) {
      const created = await Disaster.create(disaster);
      createdDisasters.push(created);
    }

    // Create Sample Emergencies
    const emergencies = [
      {
        title: 'Family Trapped - Urgent Evacuation',
        description: 'Family of 5 trapped on rooftop due to rising water levels.',
        type: 'evacuation',
        priority: 'critical',
        status: 'in_progress',
        disasterId: createdDisasters[0]._id,
        location: {
          type: 'Point',
          coordinates: [85.3131, 25.5941],
          address: 'Near Patna Junction, Bihar',
        },
        requestedBy: { name: 'Rajesh Kumar', phone: '+91 9876543220' },
        assignedTo: [volunteers[0].volunteer._id],
        numberOfPeople: 5,
        specialRequirements: ['Elderly person needs wheelchair', 'Infant present'],
      },
      {
        title: 'Medical Emergency - Heart Patient',
        description: 'Heart patient needs immediate medical attention and evacuation.',
        type: 'medical',
        priority: 'critical',
        status: 'dispatched',
        disasterId: createdDisasters[0]._id,
        location: {
          type: 'Point',
          coordinates: [85.4131, 25.6941],
          address: 'Danapur Area, Bihar',
        },
        requestedBy: { name: 'Sunita Devi', phone: '+91 9876543221' },
        assignedTo: [volunteers[1].volunteer._id, volunteers[2].volunteer._id],
        numberOfPeople: 2,
        specialRequirements: ['Oxygen cylinder needed', 'Stretcher required'],
      },
      {
        title: 'Supply Delivery - Relief Camp',
        description: 'Relief camp running low on food and water supplies.',
        type: 'supply_delivery',
        priority: 'high',
        status: 'pending',
        location: {
          type: 'Point',
          coordinates: [85.2131, 25.4941],
          address: 'Community Hall, Darbhanga',
        },
        requestedBy: { name: 'Camp Coordinator', phone: '+91 9876543222' },
        numberOfPeople: 200,
        specialRequirements: ['Drinking water - 500L', 'Food packets - 400', 'Blankets - 100'],
      },
    ];

    for (const emergency of emergencies) {
      await Emergency.create(emergency);
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      data: {
        superAdmin: { email: 'superadmin@results.com', password: 'superadmin123' },
        admin: { email: 'admin@results.com', password: 'admin123' },
        volunteer: { email: 'rahul@results.com', password: 'volunteer123' },
        serviceProvider: { email: 'medical@results.com', password: 'service123' },
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed database' },
      { status: 500 }
    );
  }
}

