const express = require('express')
const {sortByDistance, } = require("./utils");
const app = express()
const port = process.env.PORT || 3000
app.use(express.json());
require('dotenv').config();


const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect();

// /getCompletionRateOfTasks

app.get('/', async (req, res) => {
  try {
    console.log('connected...')
    const collection = client.db("ar").collection("users");
    var some = await collection.findOne();
  } catch (err) {
    console.error(err);
    return res.status(400).json(e);
  } finally {
    return res.send('hey ho');
  }
})

app.get('/tasks/near', async (req, res) => {
  try {
    const {query} = req;
    // get nearest trashbins
    const trashbinCollection = client.db("ar").collection("trashbins");
    const trashbins = await trashbinCollection.find().toArray().catch(err => {
      throw err;
    });
    const trashbins_nearest10 = sortByDistance(query.lat, query.lng, trashbins).slice(0, 10);
    const taskCollection = client.db("ar").collection("tasks");
    const queryList = trashbins_nearest10.map(trashbin => String(trashbin._id));
    var ret = await taskCollection.aggregate([{ 
        $lookup: {
          from: "trashbins",
          let: {trashbinId: "$trashbinId", },
          pipeline: [
            { $match: { $expr: {$and : [{ $in: ["$$trashbinId", queryList]}, {$eq: [{$toString: "$_id"}, "$$trashbinId"]}]}}},
          ],
          as: "trashbin"
        },
      }, { $unwind: "$trashbin" }, 
      { $lookup: {
        from: "rewards",
        let: {rewardId: "$rewardId"},
        pipeline: [
          { $match: { $expr: { $eq: [{$toString: "$_id"}, "$$rewardId"] }}},
        ],
        as: "reward"
      }}, { $unwind: "$reward" },
    ]).toArray().catch(err => {
      throw err;
    });
  } catch (e) {
    console.log(e)
    console.error(e);
    return res.status(400).json(e);
  } finally {
    return res.status(200).json({
      data: {
        tasks: ret
      }
    });
  }
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
