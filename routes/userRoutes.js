const express = require('express');
const router = express.Router();
const {
    authUser,
    logoutUser,
    registerUser,
    getUserProfile,
    updateUserProfile,
    syncCart,
    syncWishlist,
    getUsers,
    deleteUser,
    updateUser,
    forgotPassword,
    verifyOTP,
    resetPassword,
    createUserByAdmin,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').post(registerUser).get(protect, admin, getUsers);
router.post('/admin-create', protect, admin, createUserByAdmin);
router.post('/login', authUser);
router.post('/logout', logoutUser);
router.post('/forgotpassword', forgotPassword);
router.post('/verifyotp', verifyOTP);
router.put('/resetpassword', resetPassword);

router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);
router.route('/cart').put(protect, syncCart);
router.route('/wishlist').put(protect, syncWishlist);

router.post('/profile/addresses', protect, addAddress);
router.route('/profile/addresses/:id')
    .put(protect, updateAddress)
    .delete(protect, deleteAddress);
router.put('/profile/addresses/:id/default', protect, setDefaultAddress);

router.route('/:id')
    .delete(protect, admin, deleteUser)
    .put(protect, admin, updateUser);

module.exports = router;
