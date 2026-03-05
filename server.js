require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const Booking = require('./models/Booking');
const Admin = require('./models/Admin');
const SlotConfig = require('./models/SlotConfig');
const Customer = require('./models/Customer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'spcafe-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Auth middleware — Admin
function requireAdmin(req, res, next) {
    if (req.session && req.session.adminId) return next();
    res.redirect('/admin/login');
}

// Auth middleware — Customer (Gatekeeper for booking)
function requireCustomerLogin(req, res, next) {
    if (req.session && req.session.customerId) {
        return next(); // They are logged in, proceed to booking
    } else {
        return res.redirect('/login'); // Not logged in, send them to the login page
    }
}

// MongoDB Connection + Seed
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        await seedData();
    })
    .catch(err => console.log('❌ MongoDB connection error:', err.message));

async function seedData() {
    // Seed default admin
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
        await Admin.create({ username: 'admin', password: 'admin123' });
        console.log('🔑 Default admin created (admin/admin123)');
    }

    // Seed default slot configs
    const slotCount = await SlotConfig.countDocuments();
    if (slotCount === 0) {
        await SlotConfig.insertMany([
            { slotId: '8-10', label: '8:00 AM – 10:00 AM', period: 'morning', capacity: 10 },
            { slotId: '10-12', label: '10:00 AM – 12:00 PM', period: 'morning', capacity: 10 },
            { slotId: '16-18', label: '4:00 PM – 6:00 PM', period: 'afternoon', capacity: 10 },
            { slotId: '18-20', label: '6:00 PM – 8:00 PM', period: 'afternoon', capacity: 10 },
        ]);
        console.log('📅 Default slot configs created');
    }
}

// ═══════════ PUBLIC ROUTES ═══════════

app.get('/', (req, res) => {
    res.render('index', {
        customer: req.session.customerId ? {
            id: req.session.customerId,
            name: req.session.customerName,
            email: req.session.customerEmail
        } : null
    });
});

// ═══════════ CUSTOMER AUTH ROUTES ═══════════

// Login page
app.get('/login', (req, res) => {
    // If already logged in, redirect to home
    if (req.session && req.session.customerId) {
        return res.redirect('/');
    }
    res.render('login', { loginError: null, loginEmail: '', signupError: null, signupSuccess: null, signupName: '', signupEmail: '' });
});

// Login form submission
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render('login', {
                loginError: 'Please enter both email and password.',
                loginEmail: email || '',
                signupError: null, signupSuccess: null, signupName: '', signupEmail: ''
            });
        }

        const customer = await Customer.findOne({ email: email.toLowerCase().trim() });
        if (!customer) {
            return res.render('login', {
                loginError: 'No account found with this email. Please sign up first.',
                loginEmail: email,
                signupError: null, signupSuccess: null, signupName: '', signupEmail: ''
            });
        }

        const isMatch = await customer.comparePassword(password);
        if (!isMatch) {
            return res.render('login', {
                loginError: 'Incorrect password. Please try again.',
                loginEmail: email,
                signupError: null, signupSuccess: null, signupName: '', signupEmail: ''
            });
        }

        // Login success — save to session
        req.session.customerId = customer._id;
        req.session.customerName = customer.name;
        req.session.customerEmail = customer.email;

        // Redirect to homepage (or back to booking section)
        const redirectTo = req.session.returnTo || '/#book';
        delete req.session.returnTo;
        res.redirect(redirectTo);

    } catch (error) {
        console.error('Login error:', error);
        res.render('login', {
            loginError: 'Something went wrong. Please try again.',
            loginEmail: '',
            signupError: null, signupSuccess: null, signupName: '', signupEmail: ''
        });
    }
});

// Signup form submission
app.post('/signup', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.render('login', {
                signupError: 'Name, email, and password are required.',
                signupName: name || '', signupEmail: email || '',
                loginError: null, loginEmail: ''
            });
        }

        if (password.length < 6) {
            return res.render('login', {
                signupError: 'Password must be at least 6 characters.',
                signupName: name, signupEmail: email,
                loginError: null, loginEmail: ''
            });
        }

        // Check if email already exists
        const existing = await Customer.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return res.render('login', {
                signupError: 'An account with this email already exists. Please sign in.',
                signupName: name, signupEmail: email,
                loginError: null, loginEmail: ''
            });
        }

        // Create new customer
        const customer = new Customer({ name, email, password, phone: phone || '' });
        await customer.save();

        // Auto-login after signup
        req.session.customerId = customer._id;
        req.session.customerName = customer.name;
        req.session.customerEmail = customer.email;

        // Redirect to homepage booking section
        const redirectTo = req.session.returnTo || '/#book';
        delete req.session.returnTo;
        res.redirect(redirectTo);

    } catch (error) {
        console.error('Signup error:', error);
        res.render('login', {
            signupError: 'Something went wrong. Please try again.',
            signupName: '', signupEmail: '',
            loginError: null, loginEmail: ''
        });
    }
});

// Customer logout
app.get('/logout', (req, res) => {
    req.session.customerId = null;
    req.session.customerName = null;
    req.session.customerEmail = null;
    res.redirect('/');
});

// Forgot Password routes
app.get('/forgot', (req, res) => {
    res.render('forgot', { error: null });
});

app.post('/forgot', async (req, res) => {
    try {
        const { email } = req.body;
        const customer = await Customer.findOne({ email: email.toLowerCase().trim() });

        if (!customer) {
            return res.render('forgot', { error: 'No account found with that email address.' });
        }

        if (customer.authProvider === 'google') {
            return res.render('forgot', { error: 'This email is linked to a Google account. Please use Google Sign-In on the login page.' });
        }

        // MVP: Just save email to session and let them reset immediately. 
        // In production, you would send an email with a unique token here.
        req.session.resetEmail = customer.email;
        res.redirect('/reset');
    } catch (error) {
        console.error('Forgot password error:', error);
        res.render('forgot', { error: 'Something went wrong. Please try again.' });
    }
});

app.get('/reset', (req, res) => {
    if (!req.session.resetEmail) {
        return res.redirect('/forgot');
    }
    res.render('reset', { error: null });
});

app.post('/reset', async (req, res) => {
    if (!req.session.resetEmail) {
        return res.redirect('/forgot');
    }

    try {
        const { password, confirmPassword } = req.body;

        if (password.length < 6) {
            return res.render('reset', { error: 'Password must be at least 6 characters.' });
        }
        if (password !== confirmPassword) {
            return res.render('reset', { error: 'Passwords do not match.' });
        }

        const customer = await Customer.findOne({ email: req.session.resetEmail });
        if (!customer) {
            return res.render('reset', { error: 'Account not found.' });
        }

        // Update password (pre-save hook in Customer.js will hash it)
        customer.password = password;
        await customer.save();

        // Clear reset session
        req.session.resetEmail = null;

        // Render login with success message
        res.render('login', {
            signupError: null, signupName: '', signupEmail: '',
            signupSuccess: 'Password reset successfully! You can now sign in with your new password.',
            loginError: null, loginEmail: ''
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.render('reset', { error: 'Something went wrong. Please try again.' });
    }
});

// Google Sign-In via Firebase (backend handler)
app.post('/auth/google', async (req, res) => {
    try {
        const { name, email, googleUid } = req.body;

        if (!email || !googleUid) {
            return res.status(400).json({ success: false, message: 'Missing Google user info.' });
        }

        // Find existing customer by email or create new one
        let customer = await Customer.findOne({ email: email.toLowerCase().trim() });

        if (customer) {
            // Update googleUid if not already set
            if (!customer.googleUid) {
                customer.googleUid = googleUid;
                customer.authProvider = 'google';
                await customer.save();
            }
        } else {
            // Create new customer from Google account (no password needed)
            customer = new Customer({
                name: name || 'Google User',
                email: email.toLowerCase().trim(),
                googleUid,
                authProvider: 'google',
                password: null
            });
            await customer.save();
        }

        // Set session
        req.session.customerId = customer._id;
        req.session.customerName = customer.name;
        req.session.customerEmail = customer.email;

        res.json({ success: true, redirect: '/#book' });

    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ success: false, message: 'Google sign-in failed. Please try again.' });
    }
});

// API: Get slots with availability for a given date
app.get('/api/slots', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: 'Date is required' });

        const slots = await SlotConfig.find().lean();
        const results = [];

        for (const slot of slots) {
            // Count bookings for this slot on this date (sum all partySize)
            const bookings = await Booking.find({ date, slot: slot.slotId });
            const booked = bookings.reduce((sum, b) => sum + b.partySize, 0);
            const remaining = Math.max(0, slot.capacity - booked);

            results.push({
                slotId: slot.slotId,
                label: slot.label,
                period: slot.period,
                capacity: slot.capacity,
                booked,
                remaining,
                isFull: remaining === 0
            });
        }

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch slots' });
    }
});

// Book a table (with capacity check) — PROTECTED: requires customer login
app.post('/book', async (req, res) => {
    // Check if customer is logged in (for API calls from frontend)
    if (!req.session || !req.session.customerId) {
        return res.status(401).json({
            success: false,
            message: 'Please log in to book a table.',
            redirect: '/login'
        });
    }

    try {
        const { name, email, phone, date, slot, partySize, message } = req.body;

        if (!name || !email || !phone || !date || !slot || !partySize) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const size = parseInt(partySize);

        // Check slot capacity
        const slotConfig = await SlotConfig.findOne({ slotId: slot });
        if (!slotConfig) {
            return res.status(400).json({ success: false, message: 'Invalid time slot.' });
        }

        const existingBookings = await Booking.find({ date, slot });
        const totalBooked = existingBookings.reduce((sum, b) => sum + b.partySize, 0);
        const remaining = slotConfig.capacity - totalBooked;

        if (size > remaining) {
            return res.status(400).json({
                success: false,
                message: remaining === 0
                    ? 'This slot is fully booked. Please choose another time.'
                    : `Only ${remaining} seat(s) left in this slot. Please reduce your party size or pick another slot.`
            });
        }

        const booking = new Booking({ name, email, phone, date, slot, partySize: size, message });
        await booking.save();

        res.json({ success: true, message: `Table booked successfully for ${slotConfig.label}! We look forward to seeing you.` });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
    }
});

// ═══════════ ADMIN ROUTES ═══════════

app.get('/admin/login', (req, res) => {
    res.render('admin-login', { error: null });
});

app.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username, password });
        if (!admin) {
            return res.render('admin-login', { error: 'Invalid username or password.' });
        }
        req.session.adminId = admin._id;
        req.session.adminName = admin.username;
        res.redirect('/admin/dashboard');
    } catch (error) {
        res.render('admin-login', { error: 'Something went wrong.' });
    }
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// Admin Dashboard
app.get('/admin/dashboard', requireAdmin, async (req, res) => {
    try {
        const filterDate = req.query.date || '';
        let bookings;
        if (filterDate) {
            bookings = await Booking.find({ date: filterDate }).sort({ createdAt: -1 }).lean();
        } else {
            bookings = await Booking.find().sort({ createdAt: -1 }).lean();
        }
        const slots = await SlotConfig.find().lean();

        // Build slot label map
        const slotMap = {};
        slots.forEach(s => { slotMap[s.slotId] = s.label; });

        res.render('admin-dashboard', {
            bookings,
            slots,
            slotMap,
            filterDate,
            adminName: req.session.adminName
        });
    } catch (error) {
        res.status(500).send('Error loading dashboard.');
    }
});

// Admin: Update slot capacity
app.post('/admin/slots/update', requireAdmin, async (req, res) => {
    try {
        const { slotId, capacity } = req.body;
        const cap = parseInt(capacity);
        if (!slotId || isNaN(cap) || cap < 1) {
            return res.status(400).json({ success: false, message: 'Invalid slot or capacity.' });
        }
        await SlotConfig.findOneAndUpdate({ slotId }, { capacity: cap });
        res.json({ success: true, message: `Capacity updated to ${cap} for slot.` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update.' });
    }
});

// Admin: Delete a booking
app.delete('/admin/bookings/:id', requireAdmin, async (req, res) => {
    try {
        const booking = await Booking.findByIdAndDelete(req.params.id);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        res.json({ success: true, message: 'Booking deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete booking.' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`☕ SP's Cafe server running at http://localhost:${PORT}`);
});
