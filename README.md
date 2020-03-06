# **Podcast Webservices** #
By Atunwa

**Setup Project**

* Step 1 :- git clone <repository link> <directory name>
* Step 2 :- cd <directory name>
* Step 3 :- npm install

**Setup Database**

* Step 4 :- cd Configs/
* Step 5 :- Rename **masterConfig_demo.json** to **masterConfig.json**
* Step 6 :- Set port and db_name you want


**Run Migration File**

* Stpe 7 :- cd migrations
* Stpe 8 :- Check Migration file status
**`$ migrate-mongo status`**
* Step 9 :- Apply all migration file
**`$ migrate-mongo up`**

**Start Server**

* Step 10 :- Start node server
**`node server.js`**
