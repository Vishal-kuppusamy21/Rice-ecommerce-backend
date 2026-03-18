const Razorpay = require('razorpay');
// @desc    Create Razorpay Order
// @route   POST /api/payment/process
// @access  Private
const processPayment = async (req, res) => {
    try {
        // Initialize Razorpay
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_ID === 'YOUR_RAZORPAY_KEY_ID') {
            console.error('Razorpay keys missing in .env');
            return res.status(503).json({ message: 'Payment service unavailable (Configuration Error)' });
        }

        // ... inside processPayment
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const amountInPaise = Math.round(req.body.amount * 100);
        console.log(`[Payment] Initiating order. Amount: ${req.body.amount} (Paise: ${amountInPaise})`);

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: "receipt_order_" + Date.now(),
        };

        const order = await razorpay.orders.create(options);
        console.log('[Payment] Order created successfully:', order.id);

        res.json({
            id: order.id,
            currency: order.currency,
            amount: order.amount,
            key: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error("Payment Controller Error:", error);
        // Log detailed parsing of razorpay error if available
        if (error.error) {
            console.error("Razorpay Error Details:", JSON.stringify(error.error, null, 2));
        }
        res.status(500).json({ message: 'Payment initiation failed', error: error.message });
    }
}

// @desc Verify Payment (Optional, can be added for extra security)
const verifyPayment = async (req, res) => {
    // Logic to verify signature
    res.json({ status: 'success' });
}

module.exports = { processPayment, verifyPayment };
