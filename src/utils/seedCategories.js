require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Category = require('../models/Category');

// Mirrors the categories/sub-services hardcoded in the Flutter app's mock data
// (lib/core/providers/app_state_providers.dart) so the app has real data to browse.
const CATEGORIES = [
  {
    name: 'Plumber',
    icon: 'plumbing_rounded',
    description: 'Fix leakages, pipe blockages, taps, and sanitary fittings.',
    subServices: [
      { name: 'Leakage Repair', basePrice: 249, description: 'Fixing dripping taps, pipeline leaks and drainage drips.' },
      { name: 'Tap/Mixer Installation', basePrice: 199, description: 'Replacing or installing new bathroom and kitchen fittings.' },
      { name: 'Drain Unclogging', basePrice: 349, description: 'Clearing clogged sinks, bathroom drains and sewer lines.' },
    ],
  },
  {
    name: 'Electrician',
    icon: 'electric_bolt_rounded',
    description: 'Complete wiring, switch repairs, appliances, and fan installations.',
    subServices: [
      { name: 'Short Circuit Repair', basePrice: 299, description: 'Diagnosing power outages, trip issues and wiring faults.' },
      { name: 'Ceiling Fan Installation', basePrice: 149, description: 'Mounting, wiring, and testing ceiling fans.' },
      { name: 'Switchboard Repair', basePrice: 99, description: 'Fixing sparks, socket defects and installing new switch boards.' },
    ],
  },
  {
    name: 'Carpenter',
    icon: 'construction_rounded',
    description: 'Furniture assembly, lock repair, and custom woodwork adjustments.',
    subServices: [
      { name: 'Door & Lock Repair', basePrice: 199, description: 'Fixing door alignment, squeaking hinges, and lock replacements.' },
      { name: 'Furniture Assembly', basePrice: 399, description: 'Assembling beds, wardrobes, desks, and shelves.' },
      { name: 'General Woodwork Touchup', basePrice: 249, description: 'Polishing, drawer adjustments, and minor custom alterations.' },
    ],
  },
  {
    name: 'Painter',
    icon: 'format_paint_rounded',
    description: 'Wall touch-ups, single rooms, interior wall coatings, and damping treatment.',
    subServices: [
      { name: 'Wall Damage Touchup', basePrice: 499, description: 'Plaster repairing and spot-painting scratches or cracks.' },
      { name: 'Single Room Painting', basePrice: 2999, description: 'Complete premium painting of a single room walls & ceiling.' },
      { name: 'Waterproofing & Damping', basePrice: 999, description: 'Applying wall sealers to cure damp patches and mould growth.' },
    ],
  },
  {
    name: 'Maid & Cleaning',
    icon: 'cleaning_services_rounded',
    description: 'Full house deep cleaning, kitchen sanitizing, and dry cleaning.',
    subServices: [
      { name: 'Full House Deep Cleaning', basePrice: 1999, description: 'Intense floor scrubbing, bathroom descaling, and dust removal.' },
      { name: 'Kitchen Chimney & Deep Clean', basePrice: 899, description: 'Degreasing stoves, slabs, exhaust fans, and cabinet interiors.' },
      { name: 'Sofa Vacuum & Shampooing', basePrice: 599, description: 'Removing stains and deep vacuuming fabric sofa seats.' },
    ],
  },
  {
    name: 'AC Repair & Service',
    icon: 'ac_unit_rounded',
    description: 'Filter cleaning, gas charging, leak repairs, and complete installations.',
    subServices: [
      { name: 'AC Jet Cleaning', basePrice: 399, description: 'Complete pressure cleaning of indoor/outdoor unit filters and fins.' },
      { name: 'Refrigerant Gas Top-Up', basePrice: 1499, description: 'Fixing leaks and refilling AC gas to restore cooling performance.' },
      { name: 'AC Installation / Removal', basePrice: 999, description: 'Secure mounting and copper piping connection for split/window ACs.' },
    ],
  },
  {
    name: 'RO Purifier Service',
    icon: 'water_drop_rounded',
    description: 'Water taste restoration, filter replacements, and membrane diagnostics.',
    subServices: [
      { name: 'Annual Filter Replacement', basePrice: 799, description: 'Changing pre-filters, carbon blocks, and sediment filters.' },
      { name: 'TDS Adjustment & Service', basePrice: 299, description: 'Cleaning storage tank and tuning water mineralization index.' },
    ],
  },
  {
    name: 'Refrigerator Repair',
    icon: 'kitchen_rounded',
    description: 'Fix cooling failures, compressor issues, and door seal repairs.',
    subServices: [
      { name: 'Cooling Restoration', basePrice: 349, description: 'Fixing frost accumulation, thermostat defects, and fan noises.' },
      { name: 'Compressor Diagnostics', basePrice: 999, description: 'Testing startup issues and replacing faulty relay capacitors.' },
    ],
  },
  {
    name: 'Grocery & Errands',
    icon: 'shopping_cart_rounded',
    description: 'Heavy item moving, furniture lifting, and emergency nearby shopping.',
    subServices: [
      { name: 'Heavy Item Lifting/Moving', basePrice: 249, description: 'Enlisting a helper to move furniture or packages within the house.' },
      { name: 'Emergency Errands Run', basePrice: 149, description: 'Getting urgent items purchased and delivered from nearby shops.' },
    ],
  },
  {
    name: 'Medical & Care',
    icon: 'medical_services_rounded',
    description: 'Physiotherapist sessions, patient care assistants, and health help.',
    subServices: [
      { name: 'Physiotherapy Session', basePrice: 599, description: '45-minute home session for posture correction, pain, or rehabilitation.' },
      { name: 'Patient Care Assistance', basePrice: 399, description: 'Providing companion assistance, vitals check, and drug schedules.' },
    ],
  },
];

async function run() {
  await connectDB();

  for (const cat of CATEGORIES) {
    const slug = cat.name.trim().toLowerCase().replace(/\s+/g, '-');
    await Category.findOneAndUpdate(
      { slug },
      { name: cat.name, slug, icon: cat.icon, description: cat.description, subServices: cat.subServices },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`Upserted category: ${cat.name}`);
  }

  await mongoose.connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
