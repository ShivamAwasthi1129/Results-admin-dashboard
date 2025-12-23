import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User, Disaster, Emergency, Volunteer, ServiceProvider } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    
    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        data: { results: [] }
      });
    }

    await connectDB();

    const searchRegex = new RegExp(query, 'i');
    const results: any[] = [];

    // Search Users
    const users = await User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ]
    }).limit(5).lean();

    users.forEach(user => {
      results.push({
        id: user._id.toString(),
        type: 'user',
        title: user.name,
        subtitle: `${user.role.replace('_', ' ')} • ${user.email}`,
        link: `/dashboard/users?search=${user.name}`,
        icon: 'user'
      });
    });

    // Search Disasters
    const disasters = await Disaster.find({
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { type: searchRegex },
        { 'location.city': searchRegex },
        { 'location.state': searchRegex }
      ]
    }).limit(5).lean();

    disasters.forEach(disaster => {
      results.push({
        id: disaster._id.toString(),
        type: 'disaster',
        title: disaster.title,
        subtitle: `${disaster.type} • ${disaster.location?.city || 'Unknown'}, ${disaster.location?.state || ''}`,
        link: `/dashboard/disasters?search=${disaster.title}`,
        icon: 'disaster'
      });
    });

    // Search Emergencies
    const emergencies = await Emergency.find({
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { type: searchRegex },
        { contactName: searchRegex },
        { 'location.city': searchRegex }
      ]
    }).limit(5).lean();

    emergencies.forEach(emergency => {
      results.push({
        id: emergency._id.toString(),
        type: 'emergency',
        title: emergency.title,
        subtitle: `${emergency.type?.replace('_', ' ')} • ${emergency.priority} priority`,
        link: `/dashboard/emergencies?search=${emergency.title}`,
        icon: 'emergency'
      });
    });

    // Search Volunteers
    const volunteers = await Volunteer.find({
      $or: [
        { skills: searchRegex },
        { 'location.city': searchRegex },
        { 'location.state': searchRegex }
      ]
    }).populate('userId', 'name email').limit(5).lean();

    volunteers.forEach((volunteer: any) => {
      results.push({
        id: volunteer._id.toString(),
        type: 'volunteer',
        title: volunteer.userId?.name || 'Unknown Volunteer',
        subtitle: `${volunteer.skills?.slice(0, 2).join(', ')} • ${volunteer.availability}`,
        link: `/dashboard/volunteers?search=${volunteer.userId?.name}`,
        icon: 'volunteer'
      });
    });

    // Search Service Providers
    const providers = await ServiceProvider.find({
      $or: [
        { businessName: searchRegex },
        { serviceType: searchRegex },
        { category: searchRegex },
        { description: searchRegex }
      ]
    }).populate('userId', 'name email').limit(5).lean();

    providers.forEach((provider: any) => {
      results.push({
        id: provider._id.toString(),
        type: 'service',
        title: provider.businessName,
        subtitle: `${provider.category} • ${provider.serviceType}`,
        link: `/dashboard/services?search=${provider.businessName}`,
        icon: 'service'
      });
    });

    // Sort by relevance (exact matches first)
    results.sort((a, b) => {
      const aExact = a.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      const bExact = b.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      return bExact - aExact;
    });

    return NextResponse.json({
      success: true,
      data: {
        results: results.slice(0, 15), // Limit total results
        query,
        total: results.length
      }
    });

  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}

