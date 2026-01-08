# Seed Volunteers and Teams Data

This script will seed your database with sample volunteer and team data.

## Prerequisites

1. Make sure your MongoDB connection string is set in `.env.local` or `.env` file:
   ```
   MONGODB_URI=your_mongodb_connection_string
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

## How to Run

### Option 1: Using npm script (Recommended)
```bash
npm run seed:volunteers
```

### Option 2: Using tsx directly
```bash
npx tsx scripts/seed-volunteers-and-teams.ts
```

### Option 3: Using ts-node (if installed)
```bash
npx ts-node scripts/seed-volunteers-and-teams.ts
```

## What Gets Created

### Teams (5 teams)
1. **Search & Rescue Alpha** - Urban and wilderness rescue operations
2. **Medical Response Team** - Emergency medical response with EMTs
3. **Logistics & Supply** - Supply chain and resource distribution
4. **Water Rescue Unit** - Water-based rescue and flood response
5. **Communication Team** - Emergency communications and coordination

### Volunteers (10 volunteers)
- 5 team leads (one per team)
- 5 team members (one per team)
- All volunteers are pre-assigned to their respective teams
- Complete profile data including:
  - Personal information
  - Skills and experience
  - Availability schedules
  - Emergency contacts
  - Health information
  - Vehicle information

## Default Credentials

All volunteers are created with the same default password:
- **Password**: `volunteer123`

You can login with any volunteer email, for example:
- `john.smith@volunteer.com` / `volunteer123`
- `sarah.johnson@volunteer.com` / `volunteer123`
- etc.

## Important Notes

⚠️ **Warning**: This script will **DELETE** all existing volunteers and teams before seeding new data.

The script will:
- Clear all existing volunteers
- Clear all existing volunteer teams
- Clear all volunteer user accounts
- Create new teams and volunteers
- Assign volunteers to teams automatically

## Troubleshooting

### Error: MONGODB_URI not set
Make sure you have a `.env.local` or `.env` file with your MongoDB connection string.

### Error: Cannot find module
Run `npm install` to install all dependencies including `tsx` and `dotenv`.

### Error: Connection failed
Check that:
- Your MongoDB server is running
- Your connection string is correct
- You have network access to your MongoDB instance

## Script Output

The script will show progress as it runs:
- 🔌 Connecting to MongoDB
- 🧹 Clearing existing data
- 👥 Creating teams
- 👤 Creating volunteers
- 🔗 Assigning volunteers to teams
- ✅ Summary of what was created

