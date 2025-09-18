require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const User = require('../models/User');
const Client = require('../models/Client');
const Activity = require('../models/Activity');

// Support non-interactive mode
const autoConfirm = process.argv.includes('--yes') || process.env.SEED_FORCE === 'true';

// Create readline interface for user confirmation (only if needed)
const rl = autoConfirm
  ? null
  : readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

// Helper function to get random element from array
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

// Helper function to get random number between min and max
const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to generate phone numbers matching schema regex (e.g., 555-123-4567)
const generatePhone = () => `555-${String(getRandomNumber(100, 999))}-${String(getRandomNumber(1000, 9999))}`;

// Helper function to generate random date within last N days
const getRandomDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
};

// Sample data arrays
const firstNames = [
  'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa',
  'James', 'Mary', 'William', 'Patricia', 'Richard', 'Jennifer', 'Thomas'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Wilson', 'Moore'
];

const departments = ['Sales', 'Marketing', 'Support', 'Engineering', 'Operations', 'Finance'];

const companyNames = [
  'TechCorp Solutions', 'Global Innovations Inc', 'Digital Dynamics', 'Future Systems LLC',
  'Smart Solutions Group', 'NextGen Technologies', 'Cloud Services Pro', 'Data Insights Corp',
  'Mobile First Inc', 'AI Innovations Lab', 'Quantum Computing Co', 'Blockchain Ventures',
  'Green Energy Solutions', 'HealthTech Partners', 'FinTech Innovations', 'EduTech Systems',
  'Retail Solutions Inc', 'Manufacturing Plus', 'Logistics Pro', 'Real Estate Tech',
  'Media Productions', 'Gaming Studios Inc', 'Security Systems Corp', 'IoT Solutions',
  'Robotics International', 'Space Tech Ventures', 'Bio Tech Labs', 'Nano Systems',
  'Virtual Reality Co', 'Augmented World Inc', 'Smart Home Tech', 'Auto Drive Systems',
  'Solar Power Inc', 'Wind Energy Corp', 'Hydro Solutions', 'Nuclear Tech Co',
  'Pharma Innovations', 'Medical Devices Inc', 'Dental Tech Pro', 'Vision Care Systems',
  'Insurance Tech Co', 'Banking Solutions', 'Investment Partners', 'Trading Systems Inc',
  'Legal Tech Pro', 'HR Solutions Corp', 'Payroll Systems', 'Accounting Plus',
  'Marketing Automation', 'Sales Force Pro', 'Customer Success Inc', 'Support Systems Co'
];

const industries = [
  'Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing',
  'Education', 'Real Estate', 'Transportation', 'Energy', 'Entertainment',
  'Telecommunications', 'Agriculture', 'Construction', 'Hospitality', 'Insurance'
];

const companyTypes = ['Startup', 'SMB', 'Enterprise', 'Non-Profit', 'Government'];

const cities = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
  'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
  'Austin', 'Jacksonville', 'San Francisco', 'Columbus', 'Indianapolis',
  'Seattle', 'Denver', 'Boston', 'Nashville', 'Portland'
];

const states = [
  'NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA', 'TX', 'CA',
  'TX', 'FL', 'CA', 'OH', 'IN', 'WA', 'CO', 'MA', 'TN', 'OR'
];

const activityOutcomes = [
  'Successful - Client interested',
  'Left voicemail',
  'No answer',
  'Scheduled follow-up',
  'Client requested more information',
  'Discussed pricing',
  'Demo scheduled',
  'Proposal sent'
];

const meetingLocations = [
  'Client Office', 'Our Office', 'Video Call', 'Coffee Shop', 'Restaurant'
];

const emailSubjects = [
  'Introduction to Our Services',
  'Follow-up on Our Discussion',
  'Proposal for Your Review',
  'Meeting Confirmation',
  'Thank You for Your Time',
  'Product Demo Information',
  'Pricing Details',
  'Contract for Review'
];

// Generate sample users
const generateUsers = () => {
  const users = [];
  
  // Create 2 admins
  users.push({
    email: 'admin@rebelx.com',
    name: 'Admin User',
    password: 'admin123',
    role: 'admin',
    department: 'Operations',
    phone: generatePhone(),
    hourlyRate: 150,
    status: 'active'
  });
  
  users.push({
    email: 'superadmin@rebelx.com',
    name: 'Super Admin',
    password: 'admin123',
    role: 'admin',
    department: 'Engineering',
    phone: generatePhone(),
    hourlyRate: 175,
    status: 'active'
  });
  
  // Create 3 managers
  for (let i = 0; i < 3; i++) {
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    users.push({
      email: `manager${i + 1}@rebelx.com`,
      name: `${firstName} ${lastName}`,
      password: 'manager123',
      role: 'manager',
      department: getRandomElement(departments),
      phone: generatePhone(),
      hourlyRate: getRandomNumber(80, 120),
      status: i === 2 ? 'inactive' : 'active' // One inactive manager
    });
  }
  
  // Create 10 employees
  for (let i = 0; i < 10; i++) {
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    users.push({
      email: `employee${i + 1}@rebelx.com`,
      name: `${firstName} ${lastName}`,
      password: 'employee123',
      role: 'employee',
      department: getRandomElement(departments),
      phone: generatePhone(),
      hourlyRate: getRandomNumber(40, 80),
      status: i >= 8 ? 'inactive' : 'active' // Two inactive employees
    });
  }
  
  return users;
};

// Generate sample clients
const generateClients = (users) => {
  const clients = [];
  const activeUsers = users.filter(u => u.status === 'active');
  
  // Distribution of clients by status
  const statusDistribution = [
    { status: 'New', count: 25 },
    { status: 'Attempted', count: 20 },
    { status: 'Contacted', count: 15 },
    { status: 'Qualified', count: 15 },
    { status: 'Unqualified', count: 10 },
    { status: 'Customer', count: 15 }
  ];
  
  let clientIndex = 0;
  
  for (const { status, count } of statusDistribution) {
    for (let i = 0; i < count; i++) {
      const cityIndex = getRandomNumber(0, cities.length - 1);
      const companyName = companyNames[clientIndex % companyNames.length];
      const contactPerson = `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
      const owner = getRandomElement(activeUsers);
      
      const client = {
        name: companyName,
        description: `Leading provider of ${getRandomElement(['innovative', 'cutting-edge', 'advanced', 'modern'])} solutions in the ${getRandomElement(industries).toLowerCase()} industry`,
        ownedBy: owner.email,
        contactStatus: status,
        contactType: getRandomElement(['Email', 'Phone', 'LinkedIn', 'Referral', 'Website']),
        companyType: getRandomElement(companyTypes),
        phone: generatePhone(),
        email: `contact@${companyName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/gi, '')}.com`,
        address: `${getRandomNumber(100, 9999)} ${getRandomElement(['Main', 'Oak', 'Elm', 'Market', 'Park'])} Street`,
        city: cities[cityIndex],
        state: states[cityIndex],
        postalCode: String(getRandomNumber(10000, 99999)),
        website: `https://www.${companyName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/gi, '')}.com`,
        facebookPage: Math.random() > 0.3 ? `https://facebook.com/${companyName.toLowerCase().replace(/\s+/g, '')}` : undefined,
        industry: getRandomElement(industries),
        forecastedAmount: status === 'Customer' ? getRandomNumber(10000, 500000) : getRandomNumber(1000, 100000),
        interactionCount: status === 'New' ? 0 : getRandomNumber(1, 20),
        fullName: contactPerson,
        lastNote: status !== 'New' ? `Last contact: ${getRandomElement(['Discussed requirements', 'Sent proposal', 'Awaiting decision', 'Budget approval pending', 'Technical evaluation in progress'])}` : undefined,
        projectedCloseDate: ['Qualified', 'Customer'].includes(status) ? getRandomDate(-30) : undefined
      };
      
      // Add payment methods for some customers
      if (status === 'Customer' && Math.random() > 0.3) {
        client.paymentMethod = {
          stripeCustomerId: `cus_test_${clientIndex}`,
          paymentMethods: [{
            id: `pm_test_${clientIndex}`,
            brand: getRandomElement(['visa', 'mastercard', 'amex', 'discover']),
            last4: String(getRandomNumber(1000, 9999)),
            expMonth: getRandomNumber(1, 12),
            expYear: getRandomNumber(2024, 2028),
            nameOnCard: contactPerson,
            billingZip: client.postalCode,
            isDefault: true,
            createdAt: getRandomDate(180)
          }]
        };
      }
      
      // Add status history
      if (status !== 'New') {
        client.statusHistory = [];
        const statuses = ['New', 'Attempted', 'Contacted', 'Qualified', 'Unqualified', 'Customer'];
        const currentIndex = statuses.indexOf(status);
        
        for (let j = 0; j <= Math.min(currentIndex, getRandomNumber(1, currentIndex)); j++) {
          client.statusHistory.push({
            status: statuses[j],
            changedAt: getRandomDate(60 - (j * 10)),
            changedBy: getRandomElement(activeUsers).email,
            notes: `Status updated to ${statuses[j]}`
          });
        }
      }
      
      clients.push(client);
      clientIndex++;
    }
  }
  
  return clients;
};

// Generate sample activities
const generateActivities = async (clients, users) => {
  const activities = [];
  const activeUsers = users.filter(u => u.status === 'active');
  
  for (const client of clients) {
    const activityCount = client.interactionCount || 0;
    
    // Always create a 'created' activity
    activities.push({
      clientId: client._id,
      userId: client.ownedBy,
      type: 'created',
      description: `Client "${client.name}" was created`,
      metadata: {
        clientName: client.name,
        createdAt: getRandomDate(60)
      },
      createdAt: getRandomDate(60)
    });
    
    // Generate random activities based on interaction count
    for (let i = 0; i < activityCount; i++) {
      const user = getRandomElement(activeUsers);
      const activityType = getRandomElement(['note_added', 'email_sent', 'call_made', 'meeting_scheduled', 'status_changed']);
      const activityDate = getRandomDate(50);
      
      let activity = {
        clientId: client._id,
        userId: user.email,
        type: activityType,
        createdAt: activityDate
      };
      
      switch (activityType) {
        case 'note_added':
          const noteContent = getRandomElement([
            'Client expressed interest in our premium package',
            'Budget constraints discussed, considering payment plans',
            'Technical requirements gathered',
            'Competitor comparison requested',
            'Decision maker identified',
            'Follow-up scheduled for next week',
            'Demo went well, positive feedback received',
            'Contract negotiations in progress'
          ]);
          activity.description = noteContent.substring(0, 100);
          activity.metadata = {
            fullNote: noteContent,
            addedAt: activityDate
          };
          break;
          
        case 'email_sent':
          const subject = getRandomElement(emailSubjects);
          activity.description = `Email sent: "${subject}"`;
          activity.metadata = {
            subject: subject,
            recipientEmail: client.email,
            sentAt: activityDate
          };
          break;
          
        case 'call_made':
          const duration = getRandomNumber(5, 45);
          const outcome = getRandomElement(activityOutcomes);
          activity.description = `Call made (${duration} minutes)`;
          activity.metadata = {
            duration: duration,
            outcome: outcome,
            calledAt: activityDate
          };
          break;
          
        case 'meeting_scheduled':
          const meetingDate = new Date(activityDate);
          meetingDate.setDate(meetingDate.getDate() + getRandomNumber(1, 14));
          const location = getRandomElement(meetingLocations);
          activity.description = `Meeting scheduled for ${meetingDate.toLocaleDateString()}`;
          activity.metadata = {
            meetingDate: meetingDate,
            location: location,
            agenda: getRandomElement(['Product Demo', 'Requirements Discussion', 'Contract Review', 'Kick-off Meeting']),
            scheduledAt: activityDate
          };
          break;
          
        case 'status_changed':
          const statuses = ['New', 'Attempted', 'Contacted', 'Qualified', 'Unqualified', 'Customer'];
          const oldStatus = getRandomElement(statuses);
          const newStatus = client.contactStatus;
          activity.description = `Status changed from ${oldStatus} to ${newStatus}`;
          activity.metadata = {
            oldStatus: oldStatus,
            newStatus: newStatus,
            notes: 'Status updated based on client interaction'
          };
          break;
      }
      
      activities.push(activity);
    }
  }
  
  return activities;
};

// Main seed function
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rebelx-v3', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    
    // Ask for confirmation unless auto-confirmed
    const answer = autoConfirm
      ? 'yes'
      : await new Promise((resolve) => {
          rl.question('\n⚠️  This will DELETE all existing data. Are you sure? (yes/no): ', resolve);
        });
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Seed operation cancelled');
      process.exit(0);
    }
    
    // Clear existing data
    console.log('\n🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Client.deleteMany({});
    await Activity.deleteMany({});
    console.log('✅ Existing data cleared');
    
    // Generate and insert users
    console.log('\n👥 Creating users...');
    const userData = generateUsers();
    const users = await User.insertMany(userData);
    console.log(`✅ Created ${users.length} users`);
    
    // Display user summary
    const adminCount = users.filter(u => u.role === 'admin').length;
    const managerCount = users.filter(u => u.role === 'manager').length;
    const employeeCount = users.filter(u => u.role === 'employee').length;
    const activeCount = users.filter(u => u.status === 'active').length;
    
    console.log(`   - Admins: ${adminCount}`);
    console.log(`   - Managers: ${managerCount}`);
    console.log(`   - Employees: ${employeeCount}`);
    console.log(`   - Active users: ${activeCount}`);
    console.log(`   - Inactive users: ${users.length - activeCount}`);
    
    // Generate and insert clients
    console.log('\n🏢 Creating clients...');
    const clientData = generateClients(userData);
    const clients = await Client.insertMany(clientData);
    console.log(`✅ Created ${clients.length} clients`);
    
    // Display client summary
    const statusCounts = {};
    clients.forEach(client => {
      statusCounts[client.contactStatus] = (statusCounts[client.contactStatus] || 0) + 1;
    });
    
    console.log('   Client distribution by status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });
    
    const clientsWithPayment = clients.filter(c => c.paymentMethod && c.paymentMethod.paymentMethods && c.paymentMethod.paymentMethods.length > 0).length;
    console.log(`   - Clients with payment methods: ${clientsWithPayment}`);
    
    // Generate and insert activities
    console.log('\n📊 Creating activities...');
    const activityData = await generateActivities(clients, userData);
    const activities = await Activity.insertMany(activityData);
    console.log(`✅ Created ${activities.length} activities`);
    
    // Display activity summary
    const activityTypes = {};
    activities.forEach(activity => {
      activityTypes[activity.type] = (activityTypes[activity.type] || 0) + 1;
    });
    
    console.log('   Activity distribution by type:');
    Object.entries(activityTypes).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });
    
    // Display final summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY! 🎉');
    console.log('='.repeat(50));
    console.log('\n📈 Summary:');
    console.log(`   Total Users: ${users.length}`);
    console.log(`   Total Clients: ${clients.length}`);
    console.log(`   Total Activities: ${activities.length}`);
    console.log('\n🔐 Login Credentials:');
    console.log('   Admin: admin@rebelx.com / admin123');
    console.log('   Manager: manager1@rebelx.com / manager123');
    console.log('   Employee: employee1@rebelx.com / employee123');
    console.log('\n💳 Test Payment Cards:');
    console.log('   Use Stripe test card numbers for testing');
    console.log('   Example: 4242 4242 4242 4242');
    console.log('\n✨ Your database is now ready for development!');
    
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    if (rl) rl.close();
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
};

// Run the seed function
seedDatabase();