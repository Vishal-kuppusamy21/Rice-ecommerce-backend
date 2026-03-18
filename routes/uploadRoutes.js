const path = require('path');
const express = require('express');
const multer = require('multer');
const router = express.Router();

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename(req, file, cb) {
        cb(
            null,
            `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
        );
    },
});

function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb('Images only!');
    }
}

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    },
});

const { protect, admin } = require('../middleware/authMiddleware');

router.post('/', protect, admin, upload.single('image'), (req, res) => {
    // Normalize path separators to forward slashes
    const imagePath = req.file.path.replace(/\\/g, '/'); // e.g. "uploads/image-123.jpg"

    // Return consistent URL format (e.g., "/uploads/image-123.jpg")
    // Since we serve "uploads" static folder at root or as /uploads, let's assume /uploads mapping.
    // Actually, if we map app.use('/uploads', ...) then we need the path relative to that, or full path.
    // req.file.path includes 'uploads/' prefix because of destination.

    res.send(`/${imagePath}`);
});

module.exports = router;
