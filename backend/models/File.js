const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({

    fileName: {
        type: String,
        required: true
    },

    filePath: {
        type: String,
        required: true
    },

    fileSize: {
        type: Number,
        required: true
    },

    fileType: {
        type: String,
        required: true
    },

    uploadStatus: {
        type: String,

        enum: [
            'pending',
            'uploading',
            'complete',
            'failed'
        ],

        default: 'pending'
    },

    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model(
    'File',
    fileSchema
);