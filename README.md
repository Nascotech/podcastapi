# **Podcast Webservices - Node.js** #
By Atunwa

** Project Link**
https://gitlab.com/atunwa/podcast-webservices

**Setup Project**

* Step 1 :- git clone <repository link> <directory name>
* Step 2 :- cd <directory name>
* Step 3 :- npm install

**Setup Database**

* Step 4 :- cd Configs/
* Step 5 :- Rename **masterConfig_demo.json** to **masterConfig.json**
* Step 6 :- Set port and db_name you want

**Run Migration File**

* Stpe 7 :- install **`$ npm install -g migrate-mongo`** for database migration tool for MongoDB
* Stpe 8 :- cd migrations
* Stpe 9 :- Check Migration file status **`$ migrate-mongo status`**
* Step 10 :- Apply all migration file **`$ migrate-mongo up`**

**Start Server**

* Step 11 :- Start node server (local)
**`node server.js`**

**OR**

* Step 11 :- Start node server (live)
* **`$ npm install pm2 -g`**
* Start server **`$ pm2 start server.js`**
* Restart server **`$ pm2 restart server.js`**
* Check API log **`$ pm2 log`**
* Check status **`$ pm2 status`**
