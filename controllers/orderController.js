const Order = require('../models/Order');
const Product = require('../models/Product');
const StockHistory = require('../models/StockHistory');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const sendEmail = require('../utils/sendEmail');

const addOrderItems = async (req, res) => {
    const {
        orderItems,
        shippingAddress,
        paymentMethod,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        paymentResult,
        paymentStatus
    } = req.body;

    if (orderItems && orderItems.length === 0) {
        res.status(400).json({ message: 'No order items' });
        return;
    } else {
        // Check inventory and decrement
        for (const item of orderItems) {
            if (!item.product) {
                console.error('Order item missing product ID:', item);
                res.status(400).json({ message: `Invalid product data for ${item.name}` });
                return;
            }
            const product = await Product.findById(item.product);
            if (!product) {
                console.error(`Product not found in DB. ID: ${item.product}, Name: ${item.name}`);
                res.status(404).json({ message: `Product not found: ${item.name}` });
                return;
            }
            if (product.quantity < item.qty) {
                res.status(400).json({ message: `Insufficient total quantity for ${item.name}` });
                return;
            }

            // Check bag-specific stock
            const weightEntry = product.availableWeights.find(w => w.weight === item.selectedWeight);
            if (weightEntry && weightEntry.stock < item.qty) {
                res.status(400).json({ message: `Insufficient stock for ${item.name} (${item.selectedWeight})` });
                return;
            }
        }

        // If check passes, process order
        const order = new Order({
            orderItems,
            user: req.user._id,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            taxPrice,
            shippingPrice,
            totalPrice,
            isPaid: paymentStatus === 'completed' || (paymentResult && paymentResult.status === 'completed'),
            paidAt: (paymentStatus === 'completed' || (paymentResult && paymentResult.status === 'completed')) ? Date.now() : null,
            paymentResult: paymentResult ? {
                id: paymentResult.id || paymentResult.paymentId, // Normalize ID access
                status: 'COMPLETED',
                update_time: Date.now().toString(),
                email_address: req.user.email
            } : {},
        });

        console.log('Creating order with Body:', req.body);
        console.log('Payment Status:', paymentStatus);
        console.log('Is Paid:', order.isPaid);

        const createdOrder = await order.save();

        // Decrement inventory and log history
        for (const item of orderItems) {
            const product = await Product.findById(item.product);

            // Deduct from weight-specific stock
            const weightIndex = product.availableWeights.findIndex(w => w.weight === item.selectedWeight);
            if (weightIndex !== -1) {
                const prevStock = product.availableWeights[weightIndex].stock || 0;
                const newStock = prevStock - item.qty;
                product.availableWeights[weightIndex].stock = newStock;

                // Log history
                await StockHistory.create({
                    productId: product._id,
                    productName: product.name,
                    bagSize: item.selectedWeight || 'N/A',
                    quantityChange: -item.qty,
                    newStock: newStock,
                    reason: 'Order Placed',
                    performedBy: req.user ? req.user.firstName + ' ' + req.user.lastName : 'Customer'
                });
            }

            // Re-calculate total quantity
            product.quantity = product.availableWeights.reduce((sum, w) => sum + (w.stock || 0), 0);

            // Auto-disable if out of stock
            if (product.quantity === 0) {
                product.isAvailable = false;
            }

            await product.save();
        }

        // Send Invoice Email
        try {
            const orderDate = new Date().toLocaleDateString();
            const itemsHtml = orderItems.map(item => `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.qty}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">₹${item.price}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">₹${item.price * item.qty}</td>
                </tr>
            `).join('');

            const emailMessage = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #D97706;">Order Confirmation</h2>
                    <p>Dear ${req.user.firstName},</p>
                    <p>Thank you for your order! We have received your order <strong>#${createdOrder._id}</strong> placed on ${orderDate}.</p>
                    
                    <h3>Order Summary</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Product</th>
                                <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Qty</th>
                                <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Price</th>
                                <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div style="margin-top: 20px; text-align: right;">
                        <p><strong>Subtotal:</strong> ₹${itemsPrice}</p>
                        <p><strong>Shipping:</strong> ₹${shippingPrice}</p>
                        <p style="font-size: 18px; color: #D97706;"><strong>Total: ₹${totalPrice}</strong></p>
                    </div>

                    <h3>Shipping Address</h3>
                    <p>
                        ${shippingAddress.fullName}<br>
                        ${shippingAddress.addressLine1}<br>
                        ${shippingAddress.addressLine2 ? shippingAddress.addressLine2 + '<br>' : ''}
                        ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}<br>
                        Phone: ${shippingAddress.phone}
                    </p>

                    <p>We will notify you once your order is shipped.</p>
                    <p>Best Regards,<br>Shree Kumaravel Rice</p>
                </div>
            `;

            await sendEmail({
                email: req.user.email,
                subject: `Order Confirmation - #${createdOrder._id}`,
                message: emailMessage,
                to_name: req.user.firstName
            });
            console.log(`Order confirmation email sent to ${req.user.email}`);
        } catch (emailError) {
            console.error('Failed to send order email:', emailError);
            // Don't fail the order just because email failed, but log it
        }

        res.status(201).json(createdOrder);
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'firstName lastName email')
        .populate({ path: 'orderItems.product', select: 'name name_ta' });

    if (order) {
        res.json(order);
    } else {
        res.status(404).json({ message: 'Order not found' });
    }
};

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = {
            id: req.body.id,
            status: req.body.status,
            update_time: req.body.update_time,
            email_address: req.body.email_address,
        };

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } else {
        res.status(404).json({ message: 'Order not found' });
    }
};

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const updateOrderToDelivered = async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
        order.status = 'Delivered';

        const updatedOrder = await order.save();

        // Populate user to get email
        await order.populate('user', 'firstName email');

        // Send Delivery Email
        try {
            const emailMessage = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #10B981;">Order Delivered!</h2>
                    <p>Dear ${order.user.firstName},</p>
                    <p>Your order <strong>#${order._id}</strong> has been successfully delivered.</p>
                    <p>We hope you enjoy your purchase!</p>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Delivered on:</strong> ${new Date().toLocaleString()}</p>
                    </div>

                    <p>If you have any feedback, please let us know.</p>
                    <p>Best Regards,<br>Shree Kumaravel Rice</p>
                </div>
            `;

            await sendEmail({
                email: order.user.email,
                subject: `Order Delivered - #${order._id}`,
                message: emailMessage,
                to_name: order.user.firstName
            });
            console.log(`Delivery email sent to ${order.user.email}`);
        } catch (emailError) {
            console.error('Failed to send delivery email:', emailError);
        }

        res.json(updatedOrder);
    } else {
        res.status(404).json({ message: 'Order not found' });
    }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
    const orders = await Order.find({ user: req.user._id })
        .populate({ path: 'orderItems.product', select: 'name name_ta' })
        .sort({ createdAt: -1 });
    res.json(orders);
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = async (req, res) => {
    const orders = await Order.find({})
        .populate('user', 'id firstName lastName email')
        .sort({ createdAt: -1 });
    res.json(orders);
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized to cancel this order' });
        }

        const status = order.status ? order.status.toLowerCase() : '';
        if (status !== 'pending' && status !== 'confirmed') {
            return res.status(400).json({ message: 'Cannot cancel order at this stage' });
        }

        // Refund Logic
        if (order.paymentMethod === 'razorpay' && order.isPaid && order.paymentResult && order.paymentResult.id) {
            try {
                const Razorpay = require('razorpay');
                const razorpay = new Razorpay({
                    key_id: process.env.RAZORPAY_KEY_ID,
                    key_secret: process.env.RAZORPAY_KEY_SECRET
                });

                // Razorpay expects amount in paise, but refunding full amount doesn't strictly require amount if payment_id is passed, 
                // but providing it is safer. 
                // However, the `payments.refund` method signature is (paymentId, options).
                // If we don't pass amount, it refunds full.
                await razorpay.payments.refund(order.paymentResult.id, {
                    speed: 'normal',
                    notes: {
                        reason: 'User requested cancellation',
                        order_id: order._id.toString()
                    }
                });

                order.paymentResult.status = 'REFUNDED'; // Update internal payment status
                console.log(`Refund initiated for order ${order._id}`);
            } catch (error) {
                console.error('Razorpay Refund Failed:', error);
                // We might still want to cancel the order locally, or fail?
                // Usually better to fail cancellation if refund fails to avoid inconsistency, 
                // OR mark as "Cancellation Requested - Refund Failed".
                // For this demo, let's return error.
                return res.status(500).json({ message: 'Refund failed. Please contact support.' });
            }
        }

        order.status = 'Cancelled';
        const updatedOrder = await order.save();

        // Restore inventory and log history
        for (const item of order.orderItems) {
            const product = await Product.findById(item.product);
            if (product) {
                const weightIndex = product.availableWeights.findIndex(w => w.weight === item.selectedWeight);
                if (weightIndex !== -1) {
                    const prevStock = product.availableWeights[weightIndex].stock || 0;
                    const newStock = prevStock + item.qty;
                    product.availableWeights[weightIndex].stock = newStock;

                    // Log history
                    await StockHistory.create({
                        productId: product._id,
                        productName: product.name,
                        bagSize: item.selectedWeight || 'N/A',
                        quantityChange: +item.qty,
                        newStock: newStock,
                        reason: 'Order Cancelled',
                        performedBy: 'System'
                    });
                }
                product.quantity = product.availableWeights.reduce((sum, w) => sum + (w.stock || 0), 0);

                // Auto-enable if stock restored
                if (!product.isAvailable && product.quantity > 0) {
                    product.isAvailable = true;
                }

                await product.save();
            }
        }

        res.json(updatedOrder);
    } else {
        res.status(404).json({ message: 'Order not found' });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        const { status } = req.body;
        order.status = status;

        if (status === 'Delivered') {
            order.isDelivered = true;
            order.deliveredAt = Date.now();

            // Populate user information to get email
            await order.populate('user', 'firstName email');

            // Send Delivery Email
            try {
                const emailMessage = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #10B981;">Order Delivered!</h2>
                        <p>Dear ${order.user.firstName},</p>
                        <p>Your order <strong>#${order._id}</strong> has been successfully delivered.</p>
                        <p>We hope you enjoy your purchase!</p>
                        
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>Delivered on:</strong> ${new Date().toLocaleString()}</p>
                        </div>

                        <p>If you have any feedback, please let us know.</p>
                        <p>Best Regards,<br>Shree Kumaravel Rice</p>
                    </div>
                `;

                await sendEmail({
                    email: order.user.email,
                    subject: `Order Delivered - #${order._id}`,
                    message: emailMessage,
                    to_name: order.user.firstName
                });
                console.log(`Delivery email sent to ${order.user.email}`);
            } catch (emailError) {
                console.error('Failed to send delivery email:', emailError);
            }
        }

        // Handle other statuses if needed, e.g., reset delivered if changed back? 
        if (status !== 'Delivered' && order.isDelivered) {
            // Optional: If admin changes back from Delivered to Shipped, should we unset deliveredAt?
            // Usually yes.
            order.isDelivered = false;
            order.deliveredAt = null;
        }

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } else {
        res.status(404).json({ message: 'Order not found' });
    }
};

// @desc    Update order to paid (Admin)
// @route   PUT /api/orders/:id/pay-admin
// @access  Private/Admin
const markOrderAsPaidAdmin = async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = {
            id: `ADMIN_COD_${Date.now()}`,
            status: 'COMPLETED',
            update_time: Date.now().toString(),
            email_address: req.user.email,
            method: 'COD_COLLECTED_BY_ADMIN'
        };

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } else {
        res.status(404).json({ message: 'Order not found' });
    }
};

module.exports = {
    addOrderItems,
    getOrderById,
    updateOrderToPaid,
    updateOrderToDelivered,
    getMyOrders,
    getOrders,
    cancelOrder,
    updateOrderStatus,
    markOrderAsPaidAdmin
};
