import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ServiceProvider from '@/models/ServiceProvider';
import User from '@/models/User';
import { verifyAuth, canPerform, hashPassword } from '@/lib/auth';

// GET - List all service providers
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'viewServiceProviders')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const verified = searchParams.get('verified');

    const query: Record<string, unknown> = {};
    if (category) query.category = category;
    if (verified !== null && verified !== '') {
      query.verified = verified === 'true';
    }

    const skip = (page - 1) * limit;

    let serviceProviders = await ServiceProvider.find(query)
      .sort({ verified: -1, rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email phone status address');

    // Filter by search if needed
    if (search) {
      const searchLower = search.toLowerCase();
      serviceProviders = serviceProviders.filter((sp: any) =>
        (sp.providerId && sp.providerId.toLowerCase().includes(searchLower)) ||
        (sp.businessName && sp.businessName.toLowerCase().includes(searchLower)) ||
        (sp.userId?.name && sp.userId.name.toLowerCase().includes(searchLower)) ||
        (sp.location?.city && sp.location.city.toLowerCase().includes(searchLower)) ||
        (sp.category && sp.category.toLowerCase().includes(searchLower)) ||
        (sp.serviceType && sp.serviceType.toLowerCase().includes(searchLower))
      );
    }

    const total = await ServiceProvider.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        serviceProviders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + serviceProviders.length < total,
        },
      },
    });
  } catch (error) {
    console.error('Get service providers error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new service provider
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'manageServiceProviders')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();
    const body = await request.json();

    // Check if user exists for this provider or create one
    let userId = body.userId;
    
    if (!userId && body.contactPerson?.email) {
      // Check if email already exists
      let existingUser = await User.findOne({ email: body.contactPerson.email });
      
      if (!existingUser) {
        // Create user account for service provider
        const hashedPassword = await hashPassword(body.password || 'provider123');
        existingUser = await User.create({
          name: body.contactPerson.name || body.businessName,
          email: body.contactPerson.email,
          phone: body.contactPerson.phone,
          password: hashedPassword,
          role: 'service_provider',
          status: 'active',
          address: body.location,
        });
      }
      userId = existingUser._id;
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID or contact email is required' },
        { status: 400 }
      );
    }

    // Ensure location has proper GeoJSON format - USA based
    const locationData = body.location ? {
      type: 'Point',
      coordinates: body.location.coordinates || [0, 0],
      address: body.location.address || '',
      suite: body.location.suite || '',
      city: body.location.city || '',
      state: body.location.state || '',
      zipCode: body.location.zipCode || '',
      country: body.location.country || 'United States',
    } : undefined;

    // Create service provider with ALL fields
    const serviceProvider = await ServiceProvider.create({
      userId,
      businessName: body.businessName,
      businessType: body.businessType,
      einNumber: body.einNumber, // EIN Number for USA businesses
      registrationNumber: body.registrationNumber,
      stateRegistration: body.stateRegistration,
      description: body.description,
      tagline: body.tagline,
      logo: body.logo,
      coverImage: body.coverImage,
      gallery: body.gallery || [],
      contactPerson: body.contactPerson, // Includes firstName, lastName, designation, phone, email, alternatePhone
      website: body.website,
      socialLinks: body.socialLinks,
      category: body.category,
      subcategories: body.subcategories || [],
      serviceType: body.serviceType,
      services: body.services || [],
      equipmentAvailable: body.equipmentAvailable || [],
      teamSize: body.teamSize || 1,
      vehiclesAvailable: body.vehiclesAvailable || [],
      location: locationData,
      serviceAreas: body.serviceAreas || [],
      maxServiceRadius: body.maxServiceRadius || 50,
      operatingHours: body.operatingHours || [],
      is24x7Available: body.is24x7Available || false,
      pricing: body.pricing,
      paymentMethods: body.paymentMethods || [],
      isAvailableForEmergency: body.isAvailableForEmergency ?? true,
      emergencyCharges: body.emergencyCharges || 0,
      emergencyResponseTime: body.emergencyResponseTime,
      yearsOfExperience: body.yearsOfExperience || 0,
      certifications: body.certifications || [],
      licenses: body.licenses || [],
      insuranceDetails: body.insuranceDetails,
      documents: body.documents || [], // Category-based required documents
      status: body.status || 'active',
    });

    const populatedProvider = await ServiceProvider.findById(serviceProvider._id)
      .populate('userId', 'name email phone status');

    return NextResponse.json({
      success: true,
      data: { serviceProvider: populatedProvider },
      message: 'Service provider created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create service provider error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update service provider
export async function PUT(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'manageServiceProviders')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Service provider ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Ensure location has proper GeoJSON format - USA based
    const locationData = body.location ? {
      type: 'Point',
      coordinates: body.location.coordinates || [0, 0],
      address: body.location.address || '',
      suite: body.location.suite || '',
      city: body.location.city || '',
      state: body.location.state || '',
      zipCode: body.location.zipCode || '',
      country: body.location.country || 'United States',
    } : undefined;

    // Update service provider with ALL fields
    const serviceProvider = await ServiceProvider.findByIdAndUpdate(
      id,
      {
        businessName: body.businessName,
        businessType: body.businessType,
        einNumber: body.einNumber, // EIN Number
        registrationNumber: body.registrationNumber,
        stateRegistration: body.stateRegistration,
        description: body.description,
        tagline: body.tagline,
        logo: body.logo,
        coverImage: body.coverImage,
        gallery: body.gallery || [],
        contactPerson: body.contactPerson, // firstName, lastName, designation, phone, email, alternatePhone
        website: body.website,
        socialLinks: body.socialLinks,
        category: body.category,
        subcategories: body.subcategories || [],
        serviceType: body.serviceType,
        services: body.services,
        equipmentAvailable: body.equipmentAvailable,
        teamSize: body.teamSize,
        vehiclesAvailable: body.vehiclesAvailable,
        location: locationData,
        serviceAreas: body.serviceAreas,
        maxServiceRadius: body.maxServiceRadius,
        operatingHours: body.operatingHours,
        is24x7Available: body.is24x7Available,
        pricing: body.pricing,
        paymentMethods: body.paymentMethods,
        isAvailableForEmergency: body.isAvailableForEmergency,
        emergencyCharges: body.emergencyCharges,
        emergencyResponseTime: body.emergencyResponseTime,
        yearsOfExperience: body.yearsOfExperience,
        certifications: body.certifications,
        licenses: body.licenses,
        insuranceDetails: body.insuranceDetails,
        documents: body.documents || [], // Category-based documents
        status: body.status,
      },
      { new: true }
    ).populate('userId', 'name email phone status');

    if (!serviceProvider) {
      return NextResponse.json(
        { success: false, error: 'Service provider not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { serviceProvider },
      message: 'Service provider updated successfully'
    });

  } catch (error: any) {
    console.error('Update service provider error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete service provider
export async function DELETE(request: NextRequest) {
  try {
    const tokenPayload = await verifyAuth(request);

    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerform(tokenPayload.role, 'manageServiceProviders')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Service provider ID required' },
        { status: 400 }
      );
    }

    const serviceProvider = await ServiceProvider.findById(id);
    if (!serviceProvider) {
      return NextResponse.json(
        { success: false, error: 'Service provider not found' },
        { status: 404 }
      );
    }

    // Delete service provider profile
    await ServiceProvider.findByIdAndDelete(id);

    // Optionally deactivate user account
    await User.findByIdAndUpdate(serviceProvider.userId, { status: 'inactive' });

    return NextResponse.json({
      success: true,
      message: 'Service provider deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete service provider error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
