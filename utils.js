const mysql = require('mysql');
require('dotenv').config();
module.exports.dbConnect = async function dbConnect(){
    try{
        const db = mysql.createConnection({
            host: process.env.HOST,
            user: process.env.USER,
            password: process.env.PASSWORD,
            database: process.env.DATABASE
        });
        
        db.connect(function(err) {
            if (err) throw err;
            console.log("Connected!");
        });

        return db;
    } catch (error) {
        console.error('Error Connecting to Database:', error);
    }
}