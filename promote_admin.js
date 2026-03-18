const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const promoteUser = async () => {
    try {
        const email = 'info.shreekumaravel@gmail.com';
        const user = await User.findOne({ email });

        if (user) {
            user.role = 'admin';
            await user.save();
            console.log(`Successfully promoted ${email} to admin.`);
        } else {
            console.log(`User with email ${email} not found.`);

            // Check for sengo as well just in case
            const sengo = await User.findOne({ firstName: 'Sengo' });
            if (sengo) {
                sengo.role = 'admin';
                await sengo.save();
                console.log(`Successfully promoted Sengo to admin.`);
            }
        }
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

promoteUser();
