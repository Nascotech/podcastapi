# **Podcast Webservices - Node.js** #

This is source code for web Services, which we use for data manipulation & retrieval and SGRecast related communication (sync collections, podcasts, podcast episodes and groups through cronjob) with all logical operation for the Atunwa Digital Platform.

**Project Link** : https://gitlab.com/atunwa/podcast-webservices

**Streamguys collection** : http://example.streamguys.com/sgrecast/api/docs/html/doc.html
We have used below function in streamguys.

* Auth token: POST /oauth/token
* Fetch collection: GET /api/v1/collections
* Fetch podcasts: GET /api/v1/collections/view/:collection_id
* Fetch episodes: GET api/v1/sgrecast/podcasts/feeds/episodes/:podcast_id
* Fetch groups: GET /api/v1/groups

**Postman collection** : https://documenter.getpostman.com/view/1417628/SWT7CfSP

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
**`$ node server.js`**

**OR**

* Step 11 :- Start node server (live)
* Install PM2 **`$ npm install pm2 -g`**
* Start server **`$ pm2 start server.js`**
* Restart server **`$ pm2 restart server.js`**
* Check API log **`$ pm2 log`**
* Check status **`$ pm2 status`**

**Server location**
* Step 12: Go to directory **`$ cd /var/www/atunwapodcasts.com/api`**
