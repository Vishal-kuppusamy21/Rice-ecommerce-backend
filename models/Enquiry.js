const mongoose = require('mongoose');

const enquirySchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        business_name: { type: String },
        quantity: { type: String },
        message: { type: String, required: true },
        subject: { type: String, default: 'Wholesale Enquiry' },
        status: { type: String, default: 'new' }, // new, contacting, closed
    },
    {
        timestamps: true,
    }
);

const Enquiry = mongoose.model('Enquiry', enquirySchema);

module.exports = Enquiry;
