const mongoose = require('mongoose');

const paymentPlanSchema = new mongoose.Schema({
    positionLevel: {
        type: String,
        required: true,
        enum: ['India', 'Zone', 'State', 'Division', 'District', 'Tehsil', 'Pincode', 'Village']
    },
    options: [{
        pay: {
            type: Number,
            required: true
        },
        profit: {
            type: Number,
            required: true
        },
        credit: {
            type: Number,
            required: true
        },
        visibleFor: [{
            type: String,
            enum: ['India', 'Zone', 'State', 'Division', 'District', 'Tehsil', 'Pincode', 'Village']
        }]
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('PaymentPlan', paymentPlanSchema);
