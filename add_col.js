const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database/database.sqlite');
db.serialize(() => {
    db.run("ALTER TABLE billing_plans ADD COLUMN allowed_alert_channels TEXT DEFAULT '[\"email\"]'", (err) => {
        if (err) {
            console.log("Error:", err.message);
        } else {
            console.log("Column added successfully!");
        }
    });
});
db.close();
