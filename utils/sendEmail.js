const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"Shree Kumaravel Rice" <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.message,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully via Nodemailer to:', options.email);
    } catch (error) {
        console.error('Email send error:', error.message);
        throw new Error('Email could not be sent');
    }
};

module.exports = sendEmail;
