#!/bin/bash

echo "🚀 Setting up Ambika International Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first."
    echo "   You can start it with: sudo systemctl start mongod"
    echo "   Or use MongoDB Atlas for cloud database."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your configuration."
else
    echo "✅ Environment file already exists."
fi

# Ask if user wants to seed the database
read -p "🌱 Do you want to seed the database with sample data? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    npm run seed
    echo "✅ Database seeded successfully!"
    echo ""
    echo "📝 Login credentials:"
    echo "   Admin: admin@ambikainternational.com / admin123"
    echo "   Customer: rajesh@hotelparadise.com / password123"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the development server:"
echo "   npm run dev"
echo ""
echo "To start the production server:"
echo "   npm start"
echo ""
echo "API will be available at: http://localhost:5000"
echo "Health check: http://localhost:5000/health"
