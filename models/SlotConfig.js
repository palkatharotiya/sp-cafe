const mongoose = require('mongoose');

const slotConfigSchema = new mongoose.Schema({
    slotId: {
        type: String,
        required: true,
        unique: true
    },
    label: {
        type: String,
        required: true
    },
    period: {
        type: String,
        enum: ['morning', 'afternoon'],
        required: true
    },
    capacity: {
        type: Number,
        required: true,
        default: 10,
        min: 0
    }
});

module.exports = mongoose.model('SlotConfig', slotConfigSchema);
