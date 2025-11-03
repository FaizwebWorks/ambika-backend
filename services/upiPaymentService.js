const QRCode = require('qrcode');

class UPIPaymentService {
    constructor() {
        this.merchantUPI = process.env.MERCHANT_UPI_ID || 'webworksbyfaiz@okicici'; // Replace with your actual UPI ID
        this.merchantName = process.env.MERCHANT_NAME || 'Ambika International';
    }

    /**
     * Generate UPI payment link
     * @param {Object} params Payment parameters
     * @returns {string} UPI payment link
     */
    generateUPILink({
        amount,
        transactionId,
        description = 'Payment to Ambika International'
    }) {
        // Construct UPI URL with all parameters
        const upiUrl = `upi://pay?pa=${this.merchantUPI}&pn=${encodeURIComponent(this.merchantName)}&am=${amount}&tn=${encodeURIComponent(description)}&tr=${transactionId}`;
        return upiUrl;
    }

    /**
     * Generate QR code for the payment
     * @param {string} upiUrl UPI payment link
     * @returns {Promise<string>} Base64 encoded QR code image
     */
    async generateQRCode(upiUrl) {
        try {
            const qrImage = await QRCode.toDataURL(upiUrl, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
            return qrImage;
        } catch (error) {
            throw new Error('Failed to generate QR code: ' + error.message);
        }
    }

    /**
     * Create a complete payment request with both UPI link and QR code
     * @param {Object} paymentDetails Payment details
     * @returns {Promise<Object>} Payment request with UPI link and QR code
     */
    async createPaymentRequest({
        amount,
        orderId,
        description
    }) {
        try {
            // Generate transaction ID (you might want to use a more sophisticated method)
            const transactionId = `TXN_${Date.now()}_${orderId}`;

            // Generate UPI payment link
            const upiLink = this.generateUPILink({
                amount,
                transactionId,
                description
            });

            // Generate QR code
            const qrCode = await this.generateQRCode(upiLink);

            // Return payment details
            return {
                success: true,
                data: {
                    transactionId,
                    amount,
                    upiLink,
                    qrCode,
                    merchantUPI: this.merchantUPI,
                    merchantName: this.merchantName,
                    timestamp: new Date().toISOString(),
                    orderId,
                    description
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new UPIPaymentService();