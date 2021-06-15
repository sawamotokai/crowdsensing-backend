// setup mongodb
const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
module.exports = client;
