const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve('backend/database/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error(err);
});
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='network_maps'", (err, rows) => {
    if (err) console.error(err);
    console.log("Found tables:", rows);
});
db.close();
