const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// ... (existing imports/code)

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// Helper to format cart items
const formatCart = (cartItems) => {
    return cartItems
        .filter(item => item.productId) // Remove items with deleted products
        .map(item => ({
            id: item._id,
            productId: item.productId._id,
            product: item.productId,
            quantity: item.quantity
        }));
};

// Helper to format wishlist items
const formatWishlist = (wishlistItems) => {
    return wishlistItems
        .filter(item => item.productId)
        .map(item => ({
            id: item._id,
            productId: item.productId._id,
            product: item.productId
        }));
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email })
        .populate('cart.productId')
        .populate('wishlist.productId');

    if (user && (await user.matchPassword(password))) {
        // Create session
        req.session.user = user;

        res.json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            addresses: user.addresses,
            token: generateToken(user._id), // Keep token for legacy/mobile support if needed
            cart: formatCart(user.cart),
            wishlist: formatWishlist(user.wishlist),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

// @desc    Logout user / clear session
// @route   POST /api/users/logout
// @access  Private
const logoutUser = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out' });
        }
        res.clearCookie('connect.sid'); // Default name
        res.json({ message: 'Logged out successfully' });
    });
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
    const { firstName, lastName, email, password, phoneNumber } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400).json({ message: 'User already exists' });
        return;
    }

    const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        phoneNumber,
    });

    if (user) {
        // Create session on register
        req.session.user = user;

        res.status(201).json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            token: generateToken(user._id),
            cart: [],
            wishlist: []
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id)
        .populate('cart.productId')
        .populate('wishlist.productId');

    if (user) {
        res.json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            addresses: user.addresses,
            token: generateToken(user._id), // Restore token on session refresh
            cart: formatCart(user.cart),
            wishlist: formatWishlist(user.wishlist),
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.firstName = req.body.firstName || user.firstName;
        user.lastName = req.body.lastName || user.lastName;
        user.email = req.body.email || user.email;
        user.phoneNumber = req.body.phoneNumber || user.phoneNumber;

        if (req.body.addresses) {
            user.addresses = req.body.addresses;
        }

        if (req.body.password) {
            if (!req.body.currentPassword) {
                return res.status(401).json({ message: 'Current password is required to change password' });
            }
            const isMatch = await user.matchPassword(req.body.currentPassword);
            if (!isMatch) {
                return res.status(401).json({ message: 'Incorrect current password' });
            }
            user.password = req.body.password;
        }

        await user.save();

        // Re-fetch to get populated data
        const updatedUser = await User.findById(req.user._id)
            .populate('cart.productId')
            .populate('wishlist.productId');

        res.json({
            _id: updatedUser._id,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            phoneNumber: updatedUser.phoneNumber,
            role: updatedUser.role,
            addresses: updatedUser.addresses,
            token: generateToken(updatedUser._id),
            cart: formatCart(updatedUser.cart),
            wishlist: formatWishlist(updatedUser.wishlist)
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Forgot Password
// @route   POST /api/users/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP and save to user
    const resetToken = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes

    await user.save({ validateBeforeSave: false });

    const message = `Your password reset OTP is: ${otp}\n\nThis OTP is valid for 10 minutes.`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Password Reset OTP',
            message
        });

        res.status(200).json({ success: true, data: 'OTP sent to email' });
    } catch (error) {
        console.error(error);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });

        return res.status(500).json({ message: 'Email could not be sent' });
    }
};

// @desc    Verify OTP
// @route   POST /api/users/verifyotp
// @access  Public
const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');

    const user = await User.findOne({
        email,
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
        return res.status(400).json({ message: 'Invalid OTP or expired' });
    }

    res.status(200).json({ success: true, message: 'OTP verified' });
};

// @desc    Reset Password
// @route   PUT /api/users/resetpassword
// @access  Public
const resetPassword = async (req, res) => {
    const { email, otp, password } = req.body;

    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');

    const user = await User.findOne({
        email,
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
        return res.status(400).json({ message: 'Invalid OTP or expired' });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        token: generateToken(user._id),
    });
};

// @desc    Sync Cart
// @route   PUT /api/users/cart
// @access  Private
const syncCart = async (req, res) => {
    const cartItems = req.body.cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity
    }));

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { cart: cartItems } },
        { new: true }
    );

    if (user) {
        res.json(req.body.cart);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Sync Wishlist
// @route   PUT /api/users/wishlist
// @access  Private
const syncWishlist = async (req, res) => {
    const wishlistItems = req.body.wishlist.map(item => ({
        productId: item.productId
    }));

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { wishlist: wishlistItems } },
        { new: true }
    );

    if (user) {
        res.json(req.body.wishlist);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    const matchStage = req.query.role ? { role: req.query.role } : {};

    // Use aggregation to get order counts for each user
    const users = await User.aggregate([
        { $match: matchStage },
        {
            $lookup: {
                from: 'orders',
                localField: '_id',
                foreignField: 'user',
                as: 'userOrders'
            }
        },
        {
            $addFields: {
                orderCount: { $size: '$userOrders' }
            }
        },
        {
            $project: {
                userOrders: 0,
                password: 0 // Exclude password from populated data
            }
        }
    ]);

    res.json(users);
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        await User.deleteOne({ _id: user._id });
        res.json({ message: 'User removed' });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        user.firstName = req.body.firstName || user.firstName;
        user.lastName = req.body.lastName || user.lastName;
        user.email = req.body.email || user.email;
        user.role = req.body.role || user.role;
        user.phoneNumber = req.body.phoneNumber || user.phoneNumber;

        if (req.body.password) {
            // Only update password if provided
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            phoneNumber: updatedUser.phoneNumber,
            role: updatedUser.role,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Admin create user
// @route   POST /api/users/admin-create
// @access  Private/Admin
const createUserByAdmin = async (req, res) => {
    const { firstName, lastName, email, password, phoneNumber, role } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400).json({ message: 'User already exists' });
        return;
    }

    const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        phoneNumber,
        role: role || 'user'
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Add a new address
// @route   POST /api/users/profile/addresses
// @access  Private
const addAddress = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const { type, street, city, state, postalCode, country, isDefault } = req.body;
    
    // If it's the first address or set as default, update others
    const shouldBeDefault = isDefault || user.addresses.length === 0;
    
    if (shouldBeDefault) {
        user.addresses.forEach(addr => { addr.isDefault = false; });
    }

    const newAddress = {
        type: type || 'Home',
        street,
        city,
        state,
        postalCode,
        country: country || 'India',
        isDefault: shouldBeDefault
    };

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json(user.addresses);
};

// @desc    Update address
// @route   PUT /api/users/profile/addresses/:id
// @access  Private
const updateAddress = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const address = user.addresses.id(req.params.id);
    if (!address) {
        return res.status(404).json({ message: 'Address not found' });
    }

    const { type, street, city, state, postalCode, country, isDefault } = req.body;

    if (isDefault && !address.isDefault) {
        user.addresses.forEach(addr => { addr.isDefault = false; });
    }

    address.type = type || address.type;
    address.street = street || address.street;
    address.city = city || address.city;
    address.state = state || address.state;
    address.postalCode = postalCode || address.postalCode;
    address.country = country || address.country;
    if (isDefault !== undefined) {
        address.isDefault = isDefault;
    }

    await user.save();
    res.json(user.addresses);
};

// @desc    Delete address
// @route   DELETE /api/users/profile/addresses/:id
// @access  Private
const deleteAddress = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const address = user.addresses.id(req.params.id);
    if (!address) {
        return res.status(404).json({ message: 'Address not found' });
    }

    const wasDefault = address.isDefault;
    user.addresses.pull(req.params.id);

    if (wasDefault && user.addresses.length > 0) {
        user.addresses[0].isDefault = true;
    }

    await user.save();
    res.json(user.addresses);
};

// @desc    Set default address
// @route   PUT /api/users/profile/addresses/:id/default
// @access  Private
const setDefaultAddress = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const address = user.addresses.id(req.params.id);
    if (!address) {
        return res.status(404).json({ message: 'Address not found' });
    }

    user.addresses.forEach(addr => { addr.isDefault = false; });
    address.isDefault = true;

    await user.save();
    res.json(user.addresses);
};

module.exports = {
    authUser,
    logoutUser,
    registerUser,
    getUserProfile,
    updateUserProfile,
    forgotPassword,
    verifyOTP,
    resetPassword,
    syncCart,
    syncWishlist,
    getUsers,
    deleteUser,
    updateUser,
    createUserByAdmin,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
};
