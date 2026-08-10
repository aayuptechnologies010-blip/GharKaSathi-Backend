require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Category = require('../models/Category');
const ServiceProvider = require('../models/ServiceProvider');

// Demo, pre-approved providers mirroring the Flutter app's mock provider list
// (lib/core/providers/app_state_providers.dart), so the app has real providers to browse/book
// against. Each can log in for real via POST /api/auth/send-otp + verify-otp (role: "provider")
// to drive bookings forward during manual testing, since there is no provider-side app yet.
// Coordinates are placed around central Bengaluru to match the app's default saved addresses.
const PROVIDERS = [
  {
    name: 'Rajesh Kumar',
    phone: '9000000001',
    categorySlug: 'plumber',
    bio: 'Highly experienced plumber offering quick and durable leak fixing. Known for cleanliness and transparent pricing.',
    skills: ['Leakage Repair', 'Drain Clog Fixes', 'Bathroom Fitting', 'Grouting'],
    languages: ['Hindi', 'English', 'Bhojpuri'],
    experienceYears: 6,
    baseHourlyRate: 250,
    ratingAvg: 4.8,
    ratingCount: 142,
    completedJobs: 924,
    coordinates: [77.6046, 12.9616],
  },
  {
    name: 'Anil Sharma',
    phone: '9000000002',
    categorySlug: 'electrician',
    bio: 'Certified electrician specializing in critical wiring and quick short circuit diagnostics. Priority emergency callouts.',
    skills: ['Short Circuits', 'Ceiling Fans', 'Inverter Wiring', 'LED Panel Sets'],
    languages: ['Hindi', 'English', 'Punjabi'],
    experienceYears: 8,
    baseHourlyRate: 280,
    ratingAvg: 4.9,
    ratingCount: 218,
    completedJobs: 1350,
    coordinates: [77.5896, 12.9766],
  },
  {
    name: 'Mohammad Farhan',
    phone: '9000000003',
    categorySlug: 'carpenter',
    bio: 'Passionate wood artisan capable of assembling heavy modular furniture as well as resolving squeaks in your wooden panels.',
    skills: ['Door Locks', 'Wardrobes', 'Kitchen Cabinet Repair', 'Table Polish'],
    languages: ['Hindi', 'Urdu'],
    experienceYears: 5,
    baseHourlyRate: 220,
    ratingAvg: 4.7,
    ratingCount: 89,
    completedJobs: 412,
    coordinates: [77.5796, 12.9816],
  },
  {
    name: 'Satish Yadav',
    phone: '9000000004',
    categorySlug: 'ac-repair-&-service',
    bio: 'Expert AC Technician. Fast and efficient gas refilling and deep coil washing services to keep your cooling optimal.',
    skills: ['AC Jet Wash', 'Gas Recharge', 'Drain Pipe Leakage', 'AC Bracket Fitting'],
    languages: ['Hindi'],
    experienceYears: 4,
    baseHourlyRate: 200,
    ratingAvg: 4.6,
    ratingCount: 65,
    completedJobs: 310,
    coordinates: [77.6146, 12.9516],
  },
  {
    name: 'Neha Verma',
    phone: '9000000005',
    categorySlug: 'maid-&-cleaning',
    bio: 'Specialist in hyper-clean environment. I use organic disinfectants to sterilize kitchen chimneys and bathrooms carefully.',
    skills: ['Deep Home Cleaning', 'Kitchen Sanitizing', 'Bathroom Acid wash', 'Sofa Wet Wash'],
    languages: ['Hindi', 'English'],
    experienceYears: 7,
    baseHourlyRate: 180,
    ratingAvg: 4.9,
    ratingCount: 176,
    completedJobs: 820,
    coordinates: [77.5946, 12.9666],
  },
];

async function run() {
  await connectDB();

  for (const p of PROVIDERS) {
    const category = await Category.findOne({ slug: p.categorySlug });
    if (!category) {
      console.warn(`Skipping ${p.name}: category "${p.categorySlug}" not found — run seed:categories first`);
      continue;
    }

    await ServiceProvider.findOneAndUpdate(
      { phone: p.phone },
      {
        name: p.name,
        phone: p.phone,
        categories: [category._id],
        location: { type: 'Point', coordinates: p.coordinates },
        bio: p.bio,
        skills: p.skills,
        languages: p.languages,
        experienceYears: p.experienceYears,
        baseHourlyRate: p.baseHourlyRate,
        ratingAvg: p.ratingAvg,
        ratingCount: p.ratingCount,
        completedJobs: p.completedJobs,
        isApproved: true,
        isAvailable: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`Upserted provider: ${p.name} (${p.phone})`);
  }

  await mongoose.connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
