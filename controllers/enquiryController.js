const Enquiry = require('../models/Enquiry');
const sendEmail = require('../utils/sendEmail');

// @desc    Create new enquiry
// @route   POST /api/enquiries
// @access  Public
const createEnquiry = async (req, res) => {
    const { name, email, phone, business_name, quantity, message, subject } = req.body;

    try {
        // 1. Save to Database
        const enquiry = await Enquiry.create({
            name,
            email,
            phone,
            business_name,
            quantity,
            message,
            subject: subject || 'Wholesale Enquiry'
        });

        // 2. Format message for email
        const emailContent = `
            <h3>New Wholesale Enquiry</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Business:</strong> ${business_name || 'N/A'}</p>
            <p><strong>Expected Quantity:</strong> ${quantity || 'N/A'}</p>
            <p><strong>Message:</strong></p>
            <pre>${message}</pre>
        `;

        // 3. Try to send email via EmailJS (via our sendEmail util which uses Private Key)
        try {
            await sendEmail({
                email: 'info.shreekumaravel@gmail.com', // Recipient (Admin)
                to_name: 'Shree Kumaravel Admin',
                subject: `NEW ENQUIRY: ${subject || 'Wholesale/Bulk Request'} - ${name}`,
                message: emailContent,
            });
            console.log('Enquiry email sent successfully');
        } catch (emailError) {
            console.error('Email failed but enquiry saved to DB:', emailError.message);
            // We DON'T return error to user because it's saved in DB
        }

        res.status(201).json({
            message: 'Enquiry received successfully',
            enquiry
        });
    } catch (error) {
        console.error('Enquiry creation error:', error);
        res.status(400).json({ message: 'Failed to process enquiry' });
    }
};

// @desc    Get all enquiries
// @route   GET /api/enquiries
// @access  Private/Admin
const getEnquiries = async (req, res) => {
    try {
        const enquiries = await Enquiry.find({}).sort({ createdAt: -1 });
        res.json(enquiries);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createEnquiry,
    getEnquiries
};
