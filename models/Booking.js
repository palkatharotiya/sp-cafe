const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    date: {
        type: String,
        required: [true, 'Date is required']
    },
    slot: {
        type: String,
        required: [true, 'Time slot is required']
    },
    partySize: {
        type: Number,
        required: [true, 'Party size is required'],
        min: 1,
        max: 20
    },
    message: {
        type: String,
        trim: true,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Booking', bookingSchema);
