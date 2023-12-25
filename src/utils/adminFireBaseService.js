const admin = require('firebase-admin');
function extractEncodedStringFromURL(url) {
    const parsedURL = new URL(url);
    const path = parsedURL.pathname; // Get the path part of the URL

    // Extract the encoded string from the path
    const encodedString = path.split('/o/')[1].split('?')[0];

    // Decode the extracted string
    const decodedString = decodeURIComponent(encodedString);

    return decodedString;
}
class FirebaseAdminService {

    static async sendNotification({ fcmToken, notification, body }) {
        const message = {
            notification: {
                title: notification,
                body: body,

            },
            token: fcmToken,
        };

        try {
            await admin.messaging().send(message);
            console.log('Successfully sent message');
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    static async deleteFilesFromStorageByUrls(urls) {
        const bucket = admin.storage().bucket();
        const deletePromises = [];

        for (const url of urls) {
            const file = bucket.file(extractEncodedStringFromURL(url));
            deletePromises.push(file.delete());
        }

        try {
            await Promise.all(deletePromises);
            console.log('Files deleted successfully.');
        } catch (error) {
            console.error('Error deleting files:', error);
            throw error;
        }
    }
}

module.exports = FirebaseAdminService;
