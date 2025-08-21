#!/bin/bash

# Backend Optimization Setup Script
# This script installs required dependencies and sets up the optimized backend

echo "🚀 Setting up Ambika B2B Backend with Performance Optimizations..."
echo "================================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing new dependencies for optimization..."

# Install new performance and security dependencies
npm install compression express-rate-limit express-slow-down rate-limit-mongo nodemailer

echo "✅ Dependencies installed successfully!"

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs
touch logs/error.log
touch logs/combined.log

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p public/uploads

# Create email templates directory
echo "📁 Creating email templates directory..."
mkdir -p templates/emails

# Create basic email templates
echo "📧 Creating basic email templates..."

cat > templates/emails/welcome.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to {{companyName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to {{companyName}}!</h1>
        </div>
        <div class="content">
            <p>Dear {{name}},</p>
            <p>Welcome to our platform! We're excited to have you on board.</p>
            <p>Your account has been successfully created with the email: {{email}}</p>
            <p>You can now start exploring our products and services.</p>
            <p>If you have any questions, feel free to contact our support team.</p>
            <p>Best regards,<br>{{companyName}} Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 {{companyName}}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
EOF

cat > templates/emails/password_reset.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset Request</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <p>Dear {{name}},</p>
            <p>You requested a password reset for your account.</p>
            <p>Click the button below to reset your password:</p>
            <p><a href="{{resetUrl}}" class="button">Reset Password</a></p>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>Best regards,<br>{{companyName}} Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 {{companyName}}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
EOF

cat > templates/emails/order_confirmation.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Order Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .order-details { background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Confirmation</h1>
        </div>
        <div class="content">
            <p>Dear {{customerName}},</p>
            <p>Thank you for your order! Your order has been confirmed.</p>
            <div class="order-details">
                <h3>Order Details:</h3>
                <p><strong>Order Number:</strong> {{orderNumber}}</p>
                <p><strong>Order Total:</strong> {{orderTotal}}</p>
                <p><strong>Expected Delivery:</strong> {{deliveryDate}}</p>
            </div>
            <p>We'll send you another email when your order ships.</p>
            <p>Thank you for choosing us!</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Ambika International. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
EOF

# Set permissions
echo "🔒 Setting permissions..."
chmod 755 logs
chmod 644 logs/*.log
chmod 755 public/uploads
chmod 755 templates/emails
chmod 644 templates/emails/*.html

# Copy .env.example to .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your actual configuration values!"
fi

echo ""
echo "✅ Backend optimization setup completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Update your .env file with actual configuration values"
echo "2. Install MongoDB if not already installed"
echo "3. Run 'npm run dev' to start the development server"
echo "4. Run 'npm run start:cluster' to start with cluster mode"
echo ""
echo "🔧 Available npm scripts:"
echo "   npm run start          - Start production server"
echo "   npm run start:cluster  - Start with cluster mode"
echo "   npm run dev            - Start development server"
echo "   npm run dev:debug      - Start with debug logging"
echo "   npm run logs           - View combined logs"
echo "   npm run logs:error     - View error logs"
echo "   npm run health         - Check server health"
echo ""
echo "🎯 Performance features enabled:"
echo "   ✓ Request compression"
echo "   ✓ Rate limiting"
echo "   ✓ Memory caching"
echo "   ✓ Request logging"
echo "   ✓ Security headers"
echo "   ✓ Error handling"
echo "   ✓ Email service"
echo "   ✓ Validation utilities"
echo "   ✓ Cluster support"
echo ""
echo "🚀 Your backend is now optimized for better performance!"
