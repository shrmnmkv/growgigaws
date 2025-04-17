GROWGIG: A Freelance Market Place platform

->Made for 3rd year minor project.
->Created to enable freelancer and employers to find each other and work on projects. Includes project management system, messaging system, escrow payment and other features.

->To run the server:
    pm2 start npm --name "growgig" -- run server

->To run frontend:
    Configure nginx with the build directory

->.env file requires:
    PORT
    MONGODB_URI
    AWS_REGION
    AWS_S3_BUCKET_NAME
    (there are two .env files one in main directory and the other in the server directory; configure both)

->To create mobile app:
    Use capacitor to build android app files and create apk file with android studio; it will not work without server running since capacitor is just a runtime