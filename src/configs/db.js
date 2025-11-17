const fp = require("fastify-plugin");
const sqlite3 = require("sqlite3");
const { v4: uuidv4 } = require("uuid");

async function dbConnector(fastify, options) {
  var db = new sqlite3.Database(
    "sqlitecloud://cq3bxqoivz.g2.sqlite.cloud:8860/test?apikey=NlbVPbh54tLp1AMbmMelAWr6JDgOacIdUapdgXUDoTc"
  );

  db.serialize(function () {
    db.run(
      "CREATE TABLE IF NOT EXISTS users ( \
  id TEXT PRIMARY KEY, \
  username TEXT UNIQUE NOT NULL, \
  password TEXT NOT NULL, \
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')) \
);"
    );

    db.run(
      "CREATE TABLE IF NOT EXISTS sessions ( \
  id TEXT PRIMARY KEY, \
  user_id TEXT NOT NULL, \
  token TEXT UNIQUE NOT NULL, \
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')), \
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
