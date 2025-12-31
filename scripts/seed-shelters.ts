import mongoose from 'mongoose';
import Shelter from '../src/models/Shelter';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/results';

const sampleShelters = [
  {
    name: 'Government School Relief Camp',
    address: '123 Main Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    capacity: 500,
    currentOccupancy: 320,
    contactPerson: 'Rajesh Kumar',
    contactPhone: '+91 98765 43210',
    facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets'],
    status: 'active',
    type: 'relief_camp',
    coordinates: {
      lat: 19.0760,
      lng: 72.8777,
    },
  },
  {
    name: 'Community Hall Shelter',
    address: '45 Park Street',
    city: 'Delhi',
    state: 'Delhi',
    capacity: 200,
    currentOccupancy: 198,
    contactPerson: 'Amit Singh',
    contactPhone: '+91 87654 32109',
    facilities: ['Food', 'Water', 'Toilets'],
    status: 'full',
    type: 'temporary',
    coordinates: {
      lat: 28.6139,
      lng: 77.2090,
    },
  },
  {
    name: 'Stadium Emergency Shelter',
    address: '789 Sports Complex',
    city: 'Chennai',
    state: 'Tamil Nadu',
    capacity: 1000,
    currentOccupancy: 450,
    contactPerson: 'Priya Devi',
    contactPhone: '+91 76543 21098',
    facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets', 'Charging Points'],
    status: 'active',
    type: 'emergency',
    coordinates: {
      lat: 13.0827,
      lng: 80.2707,
    },
  },
  {
    name: 'Dharamshala Permanent Shelter',
    address: '321 Temple Road',
    city: 'Kolkata',
    state: 'West Bengal',
    capacity: 150,
    currentOccupancy: 0,
    contactPerson: 'Biswas Roy',
    contactPhone: '+91 65432 10987',
    facilities: ['Food', 'Water', 'Toilets', 'Sleeping Area'],
    status: 'closed',
    type: 'permanent',
    coordinates: {
      lat: 22.5726,
      lng: 88.3639,
    },
  },
  {
    name: 'City Convention Center',
    address: '567 Downtown Avenue',
    city: 'Bangalore',
    state: 'Karnataka',
    capacity: 800,
    currentOccupancy: 520,
    contactPerson: 'Suresh Reddy',
    contactPhone: '+91 91234 56789',
    facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets', 'WiFi', 'Charging Points'],
    status: 'active',
    type: 'temporary',
    coordinates: {
      lat: 12.9716,
      lng: 77.5946,
    },
  },
];

async function seedShelters() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing shelters (optional - comment out if you want to keep existing data)
    // await Shelter.deleteMany({});
    // console.log('Cleared existing shelters');

    // Insert sample shelters
    const inserted = await Shelter.insertMany(sampleShelters);
    console.log(`Successfully inserted ${inserted.length} shelters`);

    // Display inserted shelters
    inserted.forEach((shelter, index) => {
      console.log(`${index + 1}. ${shelter.name} - ${shelter.city}, ${shelter.state}`);
      console.log(`   Capacity: ${shelter.capacity}, Occupancy: ${shelter.currentOccupancy}, Status: ${shelter.status}`);
    });

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding shelters:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedShelters();

