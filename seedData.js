const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Import models
const User = require("./models/user");
const Category = require("./models/category");
const Product = require("./models/product");
const Order = require("./models/order");

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Sample data
const users = [
  {
    username: "admin",
    email: "admin@ambikainternational.com",
    password: "admin123",
    role: "admin",
    name: "Admin User",
    phone: "+91 98765 43210"
  },
  {
    username: "rajesh.hotel",
    email: "rajesh@hotelparadise.com",
    password: "password123",
    role: "user",
    name: "Rajesh Kumar",
    phone: "+91 98765 43211",
    address: "Hotel Paradise, Mumbai, Maharashtra"
  },
  {
    username: "priya.resort",
    email: "priya@beachresort.com",
    password: "password123",
    role: "user",
    name: "Priya Sharma",
    phone: "+91 87654 32109",
    address: "Beach Resort, Goa"
  },
  {
    username: "hotel.manager",
    email: "manager@grandplaza.com",
    password: "password123",
    role: "user",
    name: "Hotel Manager",
    phone: "+91 76543 21098",
    address: "Grand Plaza Hotel, Delhi"
  }
];

const categories = [
  {
    name: "Room Amenities",
    description: "Essential items for guest room comfort and convenience",
    image: "/cleaning.jpeg",
    isActive: true
  },
  {
    name: "Bathroom Essentials",
    description: "Complete bathroom amenities and supplies",
    image: "/hair-dryer.jpeg",
    isActive: true
  },
  {
    name: "Kitchen Appliances",
    description: "Modern kitchen equipment for hotels and resorts",
    image: "/kettle.jpg",
    isActive: true
  },
  {
    name: "Security Systems",
    description: "Door locks, safes and security equipment",
    image: "/door-lock.jpeg",
    isActive: true
  },
  {
    name: "Cleaning Supplies",
    description: "Professional cleaning equipment and supplies",
    image: "/dustbin.jpeg",
    isActive: true
  },
  {
    name: "Welcome Amenities",
    description: "Guest welcome items and presentation sets",
    image: "/welcome-tray.jpeg",
    isActive: true
  }
];

const products = [
  {
    title: "Professional Hair Dryer",
    description: "High-quality wall-mounted hair dryer perfect for hotel bathrooms. Features quiet operation and energy efficiency.",
    price: 2500,
    stock: 50,
    images: ["/hair-dryer.jpeg"],
    sizes: ["Standard"],
    quality: "Premium",
    featured: true,
    isActive: true
  },
  {
    title: "Electric Kettle - 1.2L",
    description: "Stainless steel electric kettle with auto shut-off feature. Perfect for in-room tea and coffee service.",
    price: 1800,
    stock: 75,
    images: ["/kettle.jpg"],
    sizes: ["1.2L", "1.5L"],
    quality: "Standard",
    featured: true,
    isActive: true
  },
  {
    title: "Digital Door Lock",
    description: "Smart card access door lock system with master key override. Ideal for hotel room security.",
    price: 8500,
    stock: 25,
    images: ["/door-lock.jpeg", "/door-lock2.jpg"],
    sizes: ["Standard"],
    quality: "Premium",
    featured: true,
    isActive: true
  },
  {
    title: "Room Safe",
    description: "Compact electronic safe for guest valuables. Digital keypad with master override.",
    price: 12000,
    stock: 30,
    images: ["/room-safe.jpg"],
    sizes: ["Small", "Medium", "Large"],
    quality: "Premium",
    featured: false,
    isActive: true
  },
  {
    title: "Mini Refrigerator",
    description: "Energy-efficient mini fridge perfect for hotel rooms. Quiet operation and reliable cooling.",
    price: 15000,
    stock: 20,
    images: ["/fridge.jpg"],
    sizes: ["50L", "65L", "80L"],
    quality: "Premium",
    featured: true,
    isActive: true
  },
  {
    title: "Dustbin with Sensor",
    description: "Automatic sensor dustbin with silent operation. Ideal for hotel rooms and public areas.",
    price: 3500,
    stock: 40,
    images: ["/dustbin.jpeg", "/dustbin-2.jpeg"],
    sizes: ["10L", "15L", "20L"],
    quality: "Standard",
    featured: false,
    isActive: true
  },
  {
    title: "Welcome Amenities Tray",
    description: "Elegant welcome tray with assorted amenities for guest rooms. Creates a premium first impression.",
    price: 850,
    stock: 100,
    images: ["/welcome-tray.jpeg"],
    sizes: ["Standard", "Premium"],
    quality: "Premium",
    featured: false,
    isActive: true
  },
  {
    title: "Cleaning Supply Kit",
    description: "Complete cleaning kit with eco-friendly supplies. Perfect for housekeeping departments.",
    price: 1200,
    stock: 60,
    images: ["/cleaning.jpeg"],
    sizes: ["Basic", "Standard", "Premium"],
    quality: "Standard",
    featured: false,
    isActive: true
  }
];

// Function to create sample orders
const createSampleOrders = async (users, products) => {
  const orders = [];
  const statuses = ['delivered', 'shipped', 'processing', 'pending', 'confirmed'];
  const paymentMethods = ['cod', 'online', 'bank_transfer'];
  const paymentStatuses = ['completed', 'pending'];

  // Create 20 sample orders
  for (let i = 0; i < 20; i++) {
    const randomUser = users[Math.floor(Math.random() * (users.length - 1)) + 1]; // Exclude admin
    const randomProducts = products.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 1);
    
    const items = randomProducts.map(product => ({
      product: product._id,
      productInfo: {
        title: product.title,
        price: product.price,
        image: product.images[0]
      },
      quantity: Math.floor(Math.random() * 5) + 1,
      price: product.price
    }));

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.18;
    const shipping = 100;
    const total = subtotal + tax + shipping;

    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

    // Create random date within last 3 months
    const randomDate = new Date();
    randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 90));

    orders.push({
      customer: randomUser._id,
      customerInfo: {
        name: randomUser.name,
        email: randomUser.email,
        phone: randomUser.phone,
        company: randomUser.address?.split(',')[0] || 'Hotel Business',
        address: {
          street: `${Math.floor(Math.random() * 999) + 1} Business Street`,
          city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'][Math.floor(Math.random() * 5)],
          state: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal'][Math.floor(Math.random() * 5)],
          pincode: `${Math.floor(Math.random() * 900000) + 100000}`,
          country: 'India'
        }
      },
      items,
      pricing: {
        subtotal,
        tax,
        shipping,
        total
      },
      payment: {
        method: paymentMethod,
        status: paymentStatus,
        paidAt: paymentStatus === 'completed' ? randomDate : null
      },
      status,
      shipping: {
        method: ['standard', 'express'][Math.floor(Math.random() * 2)],
        trackingNumber: status === 'shipped' || status === 'delivered' ? `AMB${Math.random().toString(36).substr(2, 9).toUpperCase()}` : null,
        shippedAt: status === 'shipped' || status === 'delivered' ? randomDate : null,
        deliveredAt: status === 'delivered' ? new Date(randomDate.getTime() + 3 * 24 * 60 * 60 * 1000) : null
      },
      createdAt: randomDate,
      updatedAt: randomDate
    });
  }

  return orders;
};

// Seed function
const seedData = async () => {
  try {
    console.log("🌱 Starting database seeding...");

    // Clear existing data
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    console.log("✅ Cleared existing data");

    // Create users with hashed passwords
    const hashedUsers = await Promise.all(
      users.map(async (user) => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        return { ...user, password: hashedPassword };
      })
    );

    const createdUsers = await User.insertMany(hashedUsers);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Create categories
    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ Created ${createdCategories.length} categories`);

    // Assign categories to products
    const productsWithCategories = products.map((product, index) => ({
      ...product,
      category: createdCategories[index % createdCategories.length]._id
    }));

    const createdProducts = await Product.insertMany(productsWithCategories);
    console.log(`✅ Created ${createdProducts.length} products`);

    // Create sample orders
    const sampleOrders = await createSampleOrders(createdUsers, createdProducts);
    const createdOrders = await Order.insertMany(sampleOrders);
    console.log(`✅ Created ${createdOrders.length} orders`);

    console.log("🎉 Database seeding completed successfully!");
    console.log("\n📝 Login credentials:");
    console.log("Admin: admin@ambikainternational.com / admin123");
    console.log("Customer: rajesh@hotelparadise.com / password123");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    mongoose.connection.close();
  }
};

// Run seeding
const runSeed = async () => {
  await connectDB();
  await seedData();
};

// Check if script is run directly
if (require.main === module) {
  runSeed();
}

module.exports = { seedData };
