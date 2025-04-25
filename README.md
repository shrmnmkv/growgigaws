GROWGIG: A Freelance Market Place platform

->Made for 3rd year minor project.
->Created to enable freelancer and employers to find each other and work on projects. Includes project management system, messaging system, escrow payment and other features.

->To run the server:
    pm2 start npm --name "growgig" -- run server

->To run frontend:
    Configure nginx with the build directory
    nginx configuration file content:
    server {
        listen 80;
        listen [::]:80;

        server_name your-instance-ip-or-dns; # Replace later with domain

        # Path to your BUILT frontend files
        root /home/ec2-user/your-app/dist; # Adjust username if needed (e.g., ubuntu)
        index index.html index.htm;

        location / {
            try_files $uri /index.html;
        }

        # Proxy API requests (assuming they start with /api)
        location /api {
            proxy_pass http://localhost:5000; # Match PORT in server/.env
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
    
->Change the ip address in the capacitor config file 
  run npx capacitor run to test
  run npx capacitor open to open andoriod build on AS
  build an apk file and install on phone
->.env file requires:
    PORT
    MONGODB_URI
    AWS_REGION
    AWS_S3_BUCKET_NAME
    JWT_SECRET_KEY
    (there are two .env files one in main directory and the other in the server directory; configure both)

->To create mobile app:
    Use capacitor to build android app files and create apk file with android studio; it will not work without server running since capacitor is just a runtime
    
