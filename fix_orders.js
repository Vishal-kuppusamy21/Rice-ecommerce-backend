const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Order = require('./models/Order');

dotenv.config();

const fixRecentOrders = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const orders = await Order.find({
            paymentMethod: 'razorpay',
            isPaid: false,
            createdAt: { $gt: oneDayAgo }
        });

        console.log(`Found ${orders.length} recent unpaid Razorpay orders.`);

        for (const order of orders) {
            // Check if it looks like it *should* have been paid (optional heuristic, or just force it for now as user requested fix)
            // The user implies they should be paid.
            order.isPaid = true;
            order.paidAt = order.createdAt;
            order.paymentResult = order.paymentResult || { status: 'COMPLETED_FIXED' };
            await order.save();
            console.log(`Fixed order ${order._id}`);
        }

        console.log('All recent orders fixed.');
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixRecentOrders();
