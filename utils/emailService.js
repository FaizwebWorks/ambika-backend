// Email service utility for sending various types of emails

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const { EMAIL_TEMPLATES, ERROR_MESSAGES } = require('./constants');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  // Initialize email transporter
  async initializeTransporter() {
    try {
      // Gmail configuration
      if (process.env.EMAIL_SERVICE === 'gmail') {
        this.transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD // Use app password for Gmail
          }
        });
      }
      // SMTP configuration
      else {
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          }
        });
      }

      // Verify transporter configuration
      await this.transporter.verify();
      logger.info('Email transporter initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      throw new Error('Email service initialization failed');
    }
  }

  // Load email template
  async loadTemplate(templateName, variables = {}) {
    try {
      const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
      let template = await fs.readFile(templatePath, 'utf8');

      // Replace variables in template
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(regex, variables[key]);
      });

      return template;
    } catch (error) {
      logger.error(`Failed to load email template ${templateName}:`, error);
      
      // Return basic template if file doesn't exist
      return this.getBasicTemplate(templateName, variables);
    }
  }

  // Get basic template as fallback
  getBasicTemplate(templateName, variables = {}) {
    const basicTemplates = {
      welcome: `
        <h2>Welcome to Ambika B2B!</h2>
        <p>Dear ${variables.name || 'Customer'},</p>
        <p>Welcome to our platform. We're excited to have you on board!</p>
        <p>Best regards,<br>Ambika B2B Team</p>
      `,
      password_reset: `
        <h2>Password Reset Request</h2>
        <p>Dear ${variables.name || 'User'},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="${variables.resetUrl}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      order_confirmation: `
        <h2>Order Confirmation</h2>
        <p>Dear ${variables.customerName || 'Customer'},</p>
        <p>Your order #${variables.orderNumber} has been confirmed!</p>
        <p>Order Total: ${variables.orderTotal}</p>
        <p>Expected Delivery: ${variables.deliveryDate}</p>
        <p>Thank you for your business!</p>
      `,
      order_shipped: `
        <h2>Order Shipped</h2>
        <p>Dear ${variables.customerName || 'Customer'},</p>
        <p>Your order #${variables.orderNumber} has been shipped!</p>
        <p>Tracking Number: ${variables.trackingNumber}</p>
        <p>Expected Delivery: ${variables.deliveryDate}</p>
      `,
      order_delivered: `
        <h2>Order Delivered</h2>
        <p>Dear ${variables.customerName || 'Customer'},</p>
        <p>Your order #${variables.orderNumber} has been delivered!</p>
        <p>We hope you're satisfied with your purchase.</p>
        <p>Please leave a review if you enjoyed our service.</p>
      `,
      invoice: `
        <h2>Invoice</h2>
        <p>Dear ${variables.customerName || 'Customer'},</p>
        <p>Please find your invoice for order #${variables.orderNumber}</p>
        <p>Invoice Number: ${variables.invoiceNumber}</p>
        <p>Amount: ${variables.amount}</p>
        <p>Due Date: ${variables.dueDate}</p>
      `
    };

    return basicTemplates[templateName] || '<p>Email content not available.</p>';
  }

  // Send email
  async sendEmail({ to, subject, template, variables = {}, attachments = [] }) {
    try {
      if (!this.transporter) {
        await this.initializeTransporter();
      }

      const html = await this.loadTemplate(template, variables);

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Ambika B2B'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Email sent successfully to ${to}`, {
        messageId: result.messageId,
        template,
        subject
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  // Send welcome email
  async sendWelcomeEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to Ambika B2B!',
      template: EMAIL_TEMPLATES.WELCOME,
      variables: {
        name: user.name,
        email: user.email,
        companyName: process.env.COMPANY_NAME || 'Ambika B2B'
      }
    });
  }

  // Send password reset email
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    return this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      template: EMAIL_TEMPLATES.PASSWORD_RESET,
      variables: {
        name: user.name,
        resetUrl,
        companyName: process.env.COMPANY_NAME || 'Ambika B2B'
      }
    });
  }

  // Send order confirmation email
  async sendOrderConfirmationEmail(order, user) {
    return this.sendEmail({
      to: user.email,
      subject: `Order Confirmation - #${order.orderNumber}`,
      template: EMAIL_TEMPLATES.ORDER_CONFIRMATION,
      variables: {
        customerName: user.name,
        orderNumber: order.orderNumber,
        orderTotal: order.totalAmount,
        deliveryDate: order.estimatedDelivery,
        orderItems: order.items,
        shippingAddress: order.shippingAddress
      }
    });
  }

  // Send order shipped email
  async sendOrderShippedEmail(order, user) {
    return this.sendEmail({
      to: user.email,
      subject: `Order Shipped - #${order.orderNumber}`,
      template: EMAIL_TEMPLATES.ORDER_SHIPPED,
      variables: {
        customerName: user.name,
        orderNumber: order.orderNumber,
        trackingNumber: order.trackingNumber,
        deliveryDate: order.estimatedDelivery,
        courierName: order.courierPartner
      }
    });
  }

  // Send order delivered email
  async sendOrderDeliveredEmail(order, user) {
    return this.sendEmail({
      to: user.email,
      subject: `Order Delivered - #${order.orderNumber}`,
      template: EMAIL_TEMPLATES.ORDER_DELIVERED,
      variables: {
        customerName: user.name,
        orderNumber: order.orderNumber,
        deliveryDate: new Date().toLocaleDateString(),
        reviewUrl: `${process.env.FRONTEND_URL}/orders/${order._id}/review`
      }
    });
  }

  // Send invoice email
  async sendInvoiceEmail(order, user, invoicePdf = null) {
    const attachments = [];
    
    if (invoicePdf) {
      attachments.push({
        filename: `invoice-${order.orderNumber}.pdf`,
        content: invoicePdf
      });
    }

    return this.sendEmail({
      to: user.email,
      subject: `Invoice - #${order.orderNumber}`,
      template: EMAIL_TEMPLATES.INVOICE,
      variables: {
        customerName: user.name,
        orderNumber: order.orderNumber,
        invoiceNumber: order.invoiceNumber,
        amount: order.totalAmount,
        dueDate: order.paymentDue || 'Paid'
      },
      attachments
    });
  }

  // Send bulk emails
  async sendBulkEmails(recipients, { subject, template, variables = {} }) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail({
          to: recipient.email,
          subject,
          template,
          variables: { ...variables, ...recipient }
        });
        
        results.push({
          email: recipient.email,
          success: true,
          messageId: result.messageId
        });
      } catch (error) {
        logger.error(`Failed to send email to ${recipient.email}:`, error);
        results.push({
          email: recipient.email,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Send notification email to admin
  async sendAdminNotification(subject, message, data = {}) {
    const adminEmails = process.env.ADMIN_EMAILS 
      ? process.env.ADMIN_EMAILS.split(',')
      : ['admin@ambikab2b.com'];

    return this.sendEmail({
      to: adminEmails,
      subject: `[Admin] ${subject}`,
      template: 'admin_notification',
      variables: {
        subject,
        message,
        data: JSON.stringify(data, null, 2),
        timestamp: new Date().toISOString()
      }
    });
  }

  // Test email configuration
  async testEmailConfiguration() {
    try {
      const testEmail = process.env.TEST_EMAIL || 'test@example.com';
      
      await this.sendEmail({
        to: testEmail,
        subject: 'Email Configuration Test',
        template: 'welcome',
        variables: {
          name: 'Test User',
          companyName: 'Ambika B2B'
        }
      });

      return { success: true, message: 'Test email sent successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
