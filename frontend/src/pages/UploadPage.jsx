import { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

function UploadPage() {

    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [documents, setDocuments] = useState([]);


    // FETCH DOCUMENTS
    const fetchDocuments = async () => {

        try {

            const res = await axios.get(
                'http://localhost:5000/api/upload'
            );

            setDocuments(res.data);

        } catch (error) {

            console.log(error);
        }
    };


    // LOAD DOCUMENTS ON PAGE LOAD
    useEffect(() => {

        fetchDocuments();

    }, []);


    // HANDLE FILE SELECT
    const handleFileChange = (e) => {

        const selectedFiles = Array.from(e.target.files);

        const updatedFiles = selectedFiles.map((file) => ({

            file,

            progress: 0,

            status: 'pending'
        }));

        setFiles(updatedFiles);
    };


    // HANDLE DROP
    const handleDrop = (e) => {

        e.preventDefault();

        const droppedFiles = Array.from(e.dataTransfer.files);

        const updatedFiles = droppedFiles.map((file) => ({

            file,

            progress: 0,

            status: 'pending'
        }));

        setFiles(updatedFiles);
    };


    // PREVENT DEFAULT
    const handleDragOver = (e) => {

        e.preventDefault();
    };


    // UPLOAD FILES
    const uploadFiles = async () => {

        if (files.length === 0) {

            toast.error('Select files first');

            return;
        }

        setUploading(true);

        const formData = new FormData();

        files.forEach((item) => {

            formData.append(
                'files',
                item.file
            );
        });


        try {

            await axios.post(

                'http://localhost:5000/api/upload',

                formData,

                {

                    headers: {

                        'Content-Type':
                            'multipart/form-data'
                    },

                    onUploadProgress: (progressEvent) => {

                        const percent = Math.round(

                            (progressEvent.loaded * 100)
                            /
                            progressEvent.total
                        );

                        setFiles((prev) =>

                            prev.map((file) => ({

                                ...file,

                                progress: percent,

                                status:
                                    percent === 100
                                        ? 'complete'
                                        : 'uploading'
                            }))
                        );
                    }
                }
            );

            toast.success(
                'Files uploaded successfully'
            );

            fetchDocuments();

        } catch (error) {

            toast.error('Upload failed');

            console.log(error);
        }

        setUploading(false);
    };


    return (

        <div className="min-h-screen bg-blue-50 p-8">

            <Toaster />

            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-8">

                <h1 className="text-4xl font-bold text-blue-700 mb-6">

                    SWS AI Upload System
                </h1>


                {/* DROP ZONE */}
                <div

                    onDrop={handleDrop}

                    onDragOver={handleDragOver}

                    className="border-2 border-dashed border-blue-400 rounded-xl p-10 text-center bg-blue-100"
                >

                    <p className="text-lg text-gray-700 mb-4">

                        Drag & Drop PDF files here
                    </p>

                    <input

                        type="file"

                        multiple

                        accept=".pdf"

                        onChange={handleFileChange}
                    />
                </div>


                {/* UPLOAD BUTTON */}
                <button

                    onClick={uploadFiles}

                    disabled={uploading}

                    className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"
                >

                    {
                        uploading
                            ? 'Uploading...'
                            : 'Upload Files'
                    }
                </button>


                {/* FILE LIST */}
                <div className="mt-8 space-y-4">

                    {
                        files.map((item, index) => (

                            <div

                                key={index}

                                className="bg-gray-100 p-4 rounded-xl"
                            >

                                <div className="flex justify-between mb-2">

                                    <div>

                                        <p className="font-semibold">

                                            {item.file.name}
                                        </p>

                                        <p className="text-sm text-gray-600">

                                            {
                                                (
                                                    item.file.size / 1024
                                                ).toFixed(2)
                                            } KB
                                        </p>
                                    </div>

                                    <div>

                                        <p className="text-sm">

                                            {item.status}
                                        </p>
                                    </div>
                                </div>


                                {/* PROGRESS BAR */}
                                <div className="w-full bg-gray-300 rounded-full h-4">

                                    <div

                                        className="bg-blue-600 h-4 rounded-full"

                                        style={{
                                            width:
                                                `${item.progress}%`
                                        }}
                                    >
                                    </div>
                                </div>

                                <p className="text-right text-sm mt-1">

                                    {item.progress}%
                                </p>

                            </div>
                        ))
                    }
                </div>


                {/* DOCUMENT TABLE */}
                <div className="mt-10">

                    <h2 className="text-2xl font-bold mb-4 text-blue-700">

                        Uploaded Documents
                    </h2>

                    <div className="overflow-x-auto">

                        <table className="w-full border-collapse">

                            <thead>

                                <tr className="bg-blue-200">

                                    <th className="p-3 text-left">
                                        File Name
                                    </th>

                                    <th className="p-3 text-left">
                                        Size
                                    </th>

                                    <th className="p-3 text-left">
                                        Upload Date
                                    </th>

                                    <th className="p-3 text-left">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody>

                                {
                                    documents.map((doc) => (

                                        <tr
                                            key={doc._id}
                                            className="border-b"
                                        >

                                            <td className="p-3">

                                                {doc.fileName}
                                            </td>

                                            <td className="p-3">

                                                {
                                                    (
                                                        doc.fileSize / 1024
                                                    ).toFixed(2)
                                                } KB
                                            </td>

                                            <td className="p-3">

                                                {
                                                    new Date(
                                                        doc.uploadedAt
                                                    ).toLocaleString()
                                                }
                                            </td>

                                            <td className="p-3">

                                                <a

                                                    href={
                                                        `http://localhost:5000/api/upload/download/${
                                                            doc.filePath
                                                            ? doc.filePath.split('\\').pop()
                                                            : ''
                                                        }`
                                                    }

                                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                                                >

                                                    Download
                                                </a>

                                            </td>

                                        </tr>
                                    ))
                                }

                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default UploadPage;