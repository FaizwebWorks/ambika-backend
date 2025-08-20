const mongoose = require('mongoose');
const User = require('./models/user');
const Subscription = require('./models/subscription');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const seedSubscriptionData = async () => {
  try {
    console.log('🌱 Seeding subscription data...');

    // Find an admin user (or create one if needed)
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('No admin user found. Creating test admin user...');
      adminUser = new User({
        username: 'testadmin',
        email: 'admin@test.com',
        password: 'admin123', // This will be hashed automatically
        name: 'Test Admin',
        role: 'admin',
        isVerified: true
      });
      await adminUser.save();
      console.log('✅ Test admin user created');
    }

    // Check if admin already has an active subscription
    const existingSubscription = await Subscription.findOne({ 
      user: adminUser._id, 
      status: 'active' 
    });

    if (existingSubscription) {
      console.log('✅ Admin already has an active subscription');
      console.log('📊 Subscription details:', {
        plan: existingSubscription.planDetails.name,
        status: existingSubscription.status,
        endDate: existingSubscription.endDate,
        daysRemaining: existingSubscription.getDaysRemaining()
      });
    } else {
      // Create a test active subscription for the admin
      const testSubscription = new Subscription({
        user: adminUser._id,
        plan: 'professional',
        planDetails: {
          name: 'Professional',
          price: 4999,
          currency: 'INR',
          duration: 30,
          features: [
            'Unlimited Products',
            'Advanced Analytics',
            'Priority Support',
            'Custom Branding',
            'API Access'
          ]
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'active',
        amount: 4999,
        paymentStatus: 'completed',
        paymentDate: new Date(),
        razorpayOrderId: 'test_order_' + Date.now(),
        razorpayPaymentId: 'test_payment_' + Date.now(),
        razorpaySignature: 'test_signature_' + Date.now(),
        paymentHistory: [
          {
            date: new Date(),
            amount: 4999,
            status: 'completed',
            razorpayPaymentId: 'test_payment_' + Date.now(),
            description: 'Professional Plan - Monthly Subscription'
          }
        ]
      });

      await testSubscription.save();
      console.log('✅ Test subscription created for admin');
      console.log('📊 Subscription details:', {
        plan: testSubscription.planDetails.name,
        status: testSubscription.status,
        endDate: testSubscription.endDate,
        daysRemaining: testSubscription.getDaysRemaining()
      });
    }

    console.log('🎉 Subscription data seeding completed!');
    
  } catch (error) {
    console.error('❌ Error seeding subscription data:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the seeding
seedSubscriptionData();
