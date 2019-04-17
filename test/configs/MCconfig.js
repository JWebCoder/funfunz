export default {
  "mysql": {
    "host": "localhost",
    "database": "test_db",
    "user": "root",
    "password": process.env.DB_PASSWORD || ""
  },
  "server": {
    "port": 3004
  }
}