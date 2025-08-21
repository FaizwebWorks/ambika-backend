const NotificationService = require('../services/notificationService');

// Create test notifications
const createTestNotifications = async () => {
  try {
    // Test quote request notification
    const mockQuoteRequest = {
      _id: '673e7a123456789012345678',
      totalEstimatedValue: 25000,
      items: [{ urgency: 'Urgent' }],
      priority: 'High'
    };
    
    const mockUser = {
      _id: '673e7a123456789012345679',
      name: 'Test Company',
      company: 'Test Corp Ltd',
      email: 'test@testcorp.com'
    };

    await NotificationService.createQuoteRequestNotification(mockQuoteRequest, mockUser);
    
    // Test system alert
    await NotificationService.createSystemAlert(
      'System Update Available',
      'A new system update is available. Please schedule maintenance.',
      'medium',
      { version: '2.1.4', releaseDate: new Date() }
    );

    console.log('Test notifications created successfully');
    return { success: true };
  } catch (error) {
    console.error('Error creating test notifications:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { createTestNotifications };
