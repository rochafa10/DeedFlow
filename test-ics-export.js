/**
 * Test script for ICS calendar export functionality
 * Run with: node test-ics-export.js
 */

const { createEvents } = require('ics');
const fs = require('fs');

// Mock auction data for testing
const mockAuctions = [
  {
    id: 'test-1',
    county: 'Blair',
    state: 'PA',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    type: 'Tax Deed',
    platform: 'Bid4Assets',
    location: 'Online Auction',
    propertyCount: 45,
    registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    depositRequired: '$2,500',
  },
  {
    id: 'test-2',
    county: 'Centre',
    state: 'PA',
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    type: 'Tax Lien',
    platform: 'GovEase',
    location: 'County Courthouse',
    propertyCount: 78,
    registrationDeadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days from now
    depositRequired: '$5,000',
  },
];

// Convert ISO date to array format [year, month, day, hour, minute]
function dateToArray(dateString) {
  const date = new Date(dateString);
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours() || 9,
    date.getMinutes() || 0,
  ];
}

// Create auction event
function createAuctionEvent(auction) {
  const startDate = dateToArray(auction.date);
  const endDate = new Date(auction.date);
  endDate.setHours(endDate.getHours() + 3);

  return {
    title: `${auction.county}, ${auction.state} Tax Auction`,
    start: startDate,
    end: dateToArray(endDate.toISOString()),
    description: [
      `Tax Deed Auction - ${auction.county} County, ${auction.state}`,
      `Type: ${auction.type}`,
      `Platform: ${auction.platform}`,
      `Properties: ${auction.propertyCount}`,
      auction.depositRequired ? `Deposit: ${auction.depositRequired}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    location: auction.location,
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    categories: ['Tax Auction', 'Investment'],
    url: 'http://localhost:3000/auctions',
    alarms: [
      {
        action: 'display',
        trigger: { minutes: 4320, before: true }, // 3 days
        description: `Tax auction in ${auction.county}, ${auction.state} starting soon`,
      },
      {
        action: 'display',
        trigger: { minutes: 1440, before: true }, // 1 day
        description: `Tax auction in ${auction.county}, ${auction.state} starting soon`,
      },
      {
        action: 'display',
        trigger: { minutes: 360, before: true }, // 6 hours
        description: `Tax auction in ${auction.county}, ${auction.state} starting soon`,
      },
    ],
  };
}

// Create registration deadline event
function createRegistrationDeadlineEvent(auction) {
  if (!auction.registrationDeadline) {
    return null;
  }

  const startDate = dateToArray(auction.registrationDeadline);
  const endDate = new Date(auction.registrationDeadline);
  endDate.setHours(17, 0, 0, 0); // 5 PM

  return {
    title: `Registration Deadline - ${auction.county}, ${auction.state}`,
    start: startDate,
    end: dateToArray(endDate.toISOString()),
    description: [
      `Registration deadline for ${auction.county} County, ${auction.state} tax auction`,
      `Auction Date: ${new Date(auction.date).toLocaleDateString()}`,
      `Platform: ${auction.platform}`,
      auction.depositRequired ? `Deposit Required: ${auction.depositRequired}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    location: auction.platform,
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    categories: ['Tax Auction', 'Deadline'],
    url: 'http://localhost:3000/auctions',
    alarms: [
      {
        action: 'display',
        trigger: { minutes: 4320, before: true }, // 3 days
        description: `Registration deadline approaching for ${auction.county}, ${auction.state}`,
      },
      {
        action: 'display',
        trigger: { minutes: 1440, before: true }, // 1 day
        description: `Registration deadline approaching for ${auction.county}, ${auction.state}`,
      },
      {
        action: 'display',
        trigger: { minutes: 360, before: true }, // 6 hours
        description: `Registration deadline approaching for ${auction.county}, ${auction.state}`,
      },
    ],
  };
}

// Generate test ICS file
console.log('🧪 Testing ICS Calendar Export...\n');

const events = [];

// Create events for each auction
for (const auction of mockAuctions) {
  events.push(createAuctionEvent(auction));

  const registrationEvent = createRegistrationDeadlineEvent(auction);
  if (registrationEvent) {
    events.push(registrationEvent);
  }
}

console.log(`✅ Created ${events.length} events:`);
events.forEach((event, i) => {
  console.log(`   ${i + 1}. ${event.title}`);
});

// Generate ICS content
const { error, value } = createEvents(events);

if (error) {
  console.error('\n❌ Error creating calendar events:', error);
  process.exit(1);
}

if (!value) {
  console.error('\n❌ No ICS content generated');
  process.exit(1);
}

// Save to file
const filename = `test-calendar-${new Date().toISOString().split('T')[0]}.ics`;
fs.writeFileSync(filename, value);

console.log(`\n✅ ICS file generated successfully!`);
console.log(`   File: ${filename}`);
console.log(`   Size: ${value.length} bytes`);

// Display first few lines
console.log('\n📄 ICS Content Preview:');
console.log('─'.repeat(60));
console.log(value.split('\n').slice(0, 25).join('\n'));
console.log('...');
console.log('─'.repeat(60));

// Validate ICS structure
const validationChecks = [
  { name: 'Starts with BEGIN:VCALENDAR', test: value.includes('BEGIN:VCALENDAR') },
  { name: 'Ends with END:VCALENDAR', test: value.includes('END:VCALENDAR') },
  { name: 'Contains VEVENT blocks', test: value.includes('BEGIN:VEVENT') },
  { name: 'Contains event titles', test: value.includes('SUMMARY:') },
  { name: 'Contains event dates', test: value.includes('DTSTART:') },
  { name: 'Contains event locations', test: value.includes('LOCATION:') },
  { name: 'Contains alarms', test: value.includes('BEGIN:VALARM') },
  { name: 'Contains categories', test: value.includes('CATEGORIES:') },
];

console.log('\n🔍 ICS Validation:');
let allPassed = true;
validationChecks.forEach((check) => {
  const status = check.test ? '✅' : '❌';
  console.log(`   ${status} ${check.name}`);
  if (!check.test) allPassed = false;
});

if (allPassed) {
  console.log('\n✅ All validation checks passed!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Import the generated .ics file into Google Calendar');
  console.log('   2. Import the generated .ics file into Apple Calendar');
  console.log('   3. Verify events appear with correct dates and times');
  console.log('   4. Verify reminder alarms are configured (3 days, 1 day, 6 hours)');
  process.exit(0);
} else {
  console.log('\n❌ Some validation checks failed!');
  process.exit(1);
}
