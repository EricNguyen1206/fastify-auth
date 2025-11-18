const fp = require("fastify-plugin");
const sqlite3 = require("sqlite3");
const { v4: uuidv4 } = require("uuid");

async function dbConnector(fastify, options) {
    console.log("TEST", process.env.DB_PATH);
    
  var db = new sqlite3.Database(
    process.env.DB_PATH || ":memory:"
  );

  db.serialize(function () {
    db.run(
      "CREATE TABLE IF NOT EXISTS users ( \
  id TEXT PRIMARY KEY, \
  email TEXT UNIQUE NOT NULL, \
  username TEXT UNIQUE NOT NULL, \
  password TEXT NOT NULL, \
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP \
);"
    );

    db.run(
      "CREATE TABLE IF NOT EXISTS sessions ( \
  id TEXT PRIMARY KEY, \
  user_id TEXT NOT NULL, \
  token TEXT UNIQUE NOT NULL, \
  expires_at DATETIME NOT NULL, \
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, \
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE \
);"
    );
  });

  const sqlite = {};
  sqlite.db = db;
  sqlite.generateUUID = uuidv4;

  fastify.decorate("sqlite", sqlite);
}

module.exports = fp(dbConnector);
