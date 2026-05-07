const express = require('express');
const multer = require('multer');

const File = require('../models/File');
const Notification = require('../models/Notification');

const router = express.Router();


// STORAGE
const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, 'uploads/');
    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() + '-' + file.originalname;

        cb(null, uniqueName);
    }
});


// PDF FILTER
const fileFilter = (req, file, cb) => {

    if (file.mimetype === 'application/pdf') {

        cb(null, true);

    } else {

        cb(new Error('Only PDF files allowed'), false);
    }
};


// MULTER CONFIG
const upload = multer({

    storage: storage,

    fileFilter: fileFilter
});


// UPLOAD API
router.post(
    '/',
    upload.array('files', 10),

    async (req, res) => {

        try {

            const uploadedFiles = [];

            for (const file of req.files) {

                const newFile = new File({

                    fileName: file.originalname,

                    filePath: file.path,

                    fileSize: file.size,

                    fileType: file.mimetype,

                    uploadStatus: 'complete'
                });

                await newFile.save();

                uploadedFiles.push(newFile);
            }


            // BULK NOTIFICATION
            if (req.files.length > 3) {

                const notification =
                    new Notification({

                        message:
                            `${req.files.length} files uploaded successfully`,

                        type: 'success'
                    });

                await notification.save();

                const io = req.app.get('io');

                io.emit(
                    'new-notification',
                    notification
                );
            }

            res.status(200).json({

                success: true,

                files: uploadedFiles
            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message: error.message
            });
        }
    }
);


// GET FILES
router.get('/', async (req, res) => {

    try {

        const files =
            await File.find()
            .sort({ uploadedAt: -1 });

        res.json(files);

    } catch (error) {

        res.status(500).json({

            message: error.message
        });
    }
});


// DOWNLOAD FILE
router.get('/download/:filename', (req, res) => {

    const filePath =
        `uploads/${req.params.filename}`;

    res.download(filePath);
});


module.exports = router;