const mongoose = require('mongoose');
const Notification = require('./models/notification');
require('dotenv').config();

const seedNotifications = [
  {
    type: 'quote_request',
    title: 'New Quote Request',
    message: 'ABC Corp requested a quote for Electric Kettle Tray Set (50 units)',
    user: 'ABC Corp',
    isRead: false,
    priority: 'high',
    data: {
      quoteId: '673e7a123456789012345678',
      productName: 'Electric Kettle Tray Set',
      quantity: 50,
      customerName: 'ABC Corp'
    }
  },
  {
    type: 'new_order',
    title: 'New Order Placed',
    message: 'Order #AMB24001 worth ₹15,750 placed by Hotel Plaza',
    user: 'Hotel Plaza',
    isRead: false,
    priority: 'medium',
    data: {
      orderId: '673e7a123456789012345679',
      orderNumber: 'AMB24001',
      amount: 15750,
      customerName: 'Hotel Plaza'
    }
  },
  {
    type: 'b2b_registration',
    title: 'New B2B Registration',
    message: 'XYZ Hotels has registered for B2B account and needs approval',
    user: 'XYZ Hotels',
    isRead: true,
    priority: 'medium',
    data: {
      companyName: 'XYZ Hotels',
      businessType: 'Hospitality',
      contactPerson: 'John Smith'
    }
  },
  {
    type: 'low_stock',
    title: 'Low Stock Alert',
    message: 'Coffee Maker (IHC-C45) is running low on stock (only 5 units left)',
    user: 'System',
    isRead: false,
    priority: 'high',
    data: {
      productName: 'Coffee Maker',
      productCode: 'IHC-C45',
      currentStock: 5,
      minThreshold: 10
    }
  },
  {
    type: 'payment_received',
    title: 'Payment Received',
    message: 'Payment of ₹25,000 received for Order #AMB24002',
    user: 'Resort Paradise',
    isRead: true,
    priority: 'low',
    data: {
      orderId: '673e7a123456789012345680',
      orderNumber: 'AMB24002',
      amount: 25000,
      paymentMethod: 'Bank Transfer'
    }
  },
  {
    type: 'system_alert',
    title: 'Server Maintenance',
    message: 'Scheduled maintenance will be performed tonight from 2:00 AM to 4:00 AM IST',
    user: 'System',
    isRead: false,
    priority: 'medium',
    data: {
      maintenanceWindow: '2:00 AM - 4:00 AM IST',
      expectedDowntime: '2 hours'
    }
  }
];

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ambika-international';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();
    
    // Clear existing notifications
    await Notification.deleteMany({});
    console.log('Existing notifications cleared');
    
    // Insert seed notifications
    await Notification.insertMany(seedNotifications);
    console.log('Seed notifications inserted successfully');
    
    console.log(`✅ ${seedNotifications.length} notifications seeded successfully`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding notifications:', error);
    process.exit(1);
  }
};

seedDatabase();
