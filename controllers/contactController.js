// @desc    Send contact email (Deprecated - Moved to Frontend)
// @route   POST /api/contact
// @access  Public
const sendContactEmail = async (req, res) => {
    res.status(410).json({ message: 'This endpoint is deprecated. Contact form now uses EmailJS on the client side.' });
};

module.exports = { sendContactEmail };
