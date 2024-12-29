# SocioVerse Backend

## Overview
The backend of SocioVerse is a robust and scalable server-side implementation built using **Node.js** and **Express.js**. It provides APIs and services to support the core functionality of the SocioVerse app, such as authentication, real-time communication, content management, and search capabilities.

## Features
- **Authentication**:
  - Email/Password login.
  - OTP verification.
  - JWT-based secure authentication with SHA-512 encryption.
- **Post Management**:
  - Feeds, threads, and stories with privacy controls.
  - Hashtag and location tagging.
- **Real-Time Communication**:
  - Messaging powered by **Socket.IO**.
- **Search Functionalities**:
  - Search by hashtags, locations, and user profiles.
- **Notifications**:
  - Push notifications for interactions like likes, comments, and messages.

## Folder Structure
```
.
│   .env                    # Environment variables
│   .gitignore              # Git ignore file
│   package-lock.json       # NPM lock file
│   package.json            # NPM configuration
├───.vscode                 # IDE settings
│       settings.json
├───secrets                 # Sensitive keys
│       firebase-serviceAccountKey.js
└───src                     # Source code
    │   app.js              # App initialization
    │   index.js            # Entry point
    ├───config              # Config files
    │       fireBaseAdmin.js
    │       mongoDB.js
    │       nodeMailer.js
    │       socketIO.js
    ├───constants           # Static data
    │       emailTemplates.js
    ├───controllers         # Request handlers
    │       activityController.js
    │       feedsController.js
    │       hashtagController.js
    │       ...
    ├───helpers             # Utility functions
    │       customResponse.js
    ├───listeners           # Event listeners
    │       messageListener.js
    ├───middlewares         # Middleware functions
    │       auth.js
    │       bigPromise.js
    │       socketPopulate.js
    ├───models              # Database models
    │       chatRoomModel.js
    │       usersModel.js
    │       ...
    ├───routes              # API routes
    │       encryption.js
    ├───services            # Business logic
    │       activityServices.js
    │       usersServices.js
    │       ...
    └───utils               # Utility services
            jwtService.js
            adminFireBaseService.js
            ...
```

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/SocioVerse/SocioVerse-Backend.git
   ```

2. Navigate to the project directory:
   ```bash
   cd SocioVerse-Backend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Configure environment variables:
   - Create a `.env` file in the root directory.
   - Add the following variables:
     ```env
     PORT=<your_port>
     DB_URL=<your_mongodb_connection_url>
     JWT_SECRET_KEY=<your_jwt_secret_key>
     ACCESS_TOKEN_KEY=<your_access_token_key>
     REFRESH_TOKEN_KEY=<your_refresh_token_key>
     SECRET_KEY=<your_secret_key>
     SECRET_IV=<your_secret_iv>
     ECNRYPTION_METHOD=<your_encryption_method>
     FIREBASE_PROJECT_ID=<your_firebase_project_id>
     FIREBASE_STORAGE_BUCKET=<your_firebase_storage_bucket>
     FIREBASE_TYPE=<your_firebase_type>
     FIREBASE_PRIVATE_KEY_ID=<your_firebase_private_key_id>
     FIREBASE_PRIVATE_KEY=<your_firebase_private_key>
     FIREBASE_CLIENT_EMAIL=<your_firebase_client_email>
     FIREBASE_CLIENT_ID=<your_firebase_client_id>
     FIREBASE_AUTH_URI=<your_firebase_auth_uri>
     FIREBASE_TOKEN_URI=<your_firebase_token_uri>
     FIREBASE_AUTH_PROVIDER_CERT=<your_firebase_auth_provider_cert>
     FIREBASE_CLIENT_CERT=<your_firebase_client_cert>
     FIREBASE_UNIVERSE_DOMAIN=<your_firebase_universe_domain>

     ```

5. Start the server:
   - Development:
     ```bash
     npm run dev
     ```
   - Production:
     ```bash
     npm run start
     ```


## Tech Stack
- **Backend Framework**: Node.js with Express.js
- **Database**: MongoDB
- **Real-Time Communication**: Socket.IO
- **Authentication**: JWT with SHA-512 encryption
- **Email Services**: NodeMailer

## Development Guidelines
- Follow the **MVC pattern** for organizing code.
- Use **ESLint** to ensure code quality.
- Add new routes under the `/src/routes` directory.
- Implement new business logic in the `/src/services` directory.
- Test changes before pushing to the repository.


## Contributions
We welcome contributions! Please open an issue or submit a pull request with your proposed changes.

---

For more details, visit the repository: [SocioVerse Backend](https://github.com/SocioVerse/SocioVerse-Backend)
