const { initializeApp, applicationDefault } = require('firebase-admin/app');

const initializeFirebase = () => {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'socioverse-2025',
        storageBucket: 'gs://socioverse-2025.appspot.com',
    });
};

module.exports = initializeFirebase;
