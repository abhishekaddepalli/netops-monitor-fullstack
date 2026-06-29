const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve('backend/database/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error(err);
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS network_maps (
        id VARCHAR(36) PRIMARY KEY,
        organization_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        background_image VARCHAR(255),
        created_at DATETIME,
        updated_at DATETIME,
        FOREIGN KEY(organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS network_map_nodes (
        id VARCHAR(36) PRIMARY KEY,
        network_map_id VARCHAR(36) NOT NULL,
        monitor_id VARCHAR(36),
        label VARCHAR(255),
        x_pos REAL DEFAULT 0,
        y_pos REAL DEFAULT 0,
        icon_type VARCHAR(255) DEFAULT 'server',
        created_at DATETIME,
        updated_at DATETIME,
        FOREIGN KEY(network_map_id) REFERENCES network_maps(id) ON DELETE CASCADE,
        FOREIGN KEY(monitor_id) REFERENCES monitors(id) ON DELETE SET NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS network_map_links (
        id VARCHAR(36) PRIMARY KEY,
        network_map_id VARCHAR(36) NOT NULL,
        source_node_id VARCHAR(36) NOT NULL,
        target_node_id VARCHAR(36) NOT NULL,
        monitor_id VARCHAR(36),
        label VARCHAR(255),
        interface_name VARCHAR(255),
        color VARCHAR(255) DEFAULT '#94a3b8',
        style VARCHAR(255) DEFAULT 'solid',
        created_at DATETIME,
        updated_at DATETIME,
        FOREIGN KEY(network_map_id) REFERENCES network_maps(id) ON DELETE CASCADE,
        FOREIGN KEY(source_node_id) REFERENCES network_map_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY(target_node_id) REFERENCES network_map_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY(monitor_id) REFERENCES monitors(id) ON DELETE SET NULL
    )`, (err) => {
        if (err) console.error("Error creating tables:", err);
        else console.log("Tables created successfully.");
    });
});

db.close();
