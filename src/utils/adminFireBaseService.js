const admin = require('firebase-admin');
const DeviceFCMToken = require('../models/deviceFcmTocken');
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

    static async sendNotifications({ fcmTokens, notification, body, type = '', activityType = '', userId = '' }) {
        const messages = [];

        fcmTokens.forEach((token) => {
            const message = {
                notification: {
                    title: notification,
                    body: body,
                },
                token: token,
                data: {
                    type: type,
                    activityType: activityType,
                    userId: userId
                }
            };

            messages.push(message);
        });
        console.log(fcmTokens);

        for (const message of messages) {
            try {

                await admin.messaging().send(message);
            } catch (error) {
                if (
                    error.code === "messaging/registration-token-not-registered" ||
                    error.code === "messaging/invalid-argument"
                ) {
                    await DeviceFCMToken.findOneAndDelete({ token: message.token });
                }
            }
        }
        console.log('All messages sent successfully');

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
