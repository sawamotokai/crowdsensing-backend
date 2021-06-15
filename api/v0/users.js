require("dotenv").config();
const express = require("express");
const mongo = require("mongodb");
const router = express.Router();
const client = require("../../db");
client.connect();

/**
 * User Model
 *
 */
class User {
  constructor() {
    this._id = "";
    this.lastLoggedIn = Date();
    this.currentTaskId = "";
    // TODO: how to update user location periodically
    this.location = { lat: number, lng: number };
    this.currentStatus = "unknown";
    this.avgWalkingSpeed = 1;
  }
}

router.get("/all", async (req, res) => {
  try {
    const usersCollection = client.db("ar").collection("users");
    var ret = await usersCollection
      .aggregate([
        {
          $lookup: {
            from: "assigns",
            let: { userID: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: [{ $toString: "$$userID" }, "$userID"] },
                },
              },
            ],
            as: "assigned",
          },
        },
      ])
      .toArray()
      .catch((err) => {
        throw err;
      });
  } catch (e) {
    console.error(e);
    return res.status(400).json(e);
  } finally {
    return res.status(200).json({
      data: {
        users: ret,
      },
    });
  }
});

// router.get('/near', async (req, res) => {
//   try {
//     const {query} = req;
//     // get nearest trashbins
//     const trashbinCollection = client.db("ar").collection("trashbins");
//     const trashbins = await trashbinCollection.find().toArray().catch(err => {
//       throw err;
//     });
//     const trashbins_nearest10 = sortByDistance(query.lat, query.lng, trashbins).slice(0, 10);
//     const taskCollection = client.db("ar").collection("tasks");
//     const queryList = trashbins_nearest10.map(trashbin => String(trashbin._id));
//     var ret = await taskCollection.aggregate([{
//         $lookup: {
//           from: "trashbins",
//           let: {trashbinId: "$trashbinId", },
//           pipeline: [
//             { $match: { $expr: {$and : [{ $in: ["$$trashbinId", queryList]}, {$eq: [{$toString: "$_id"}, "$$trashbinId"]}]}}},
//           ],
//           as: "trashbin"
//         },
//       }, { $unwind: "$trashbin" },
//       { $lookup: {
//         from: "rewards",
//         let: {rewardId: "$rewardId"},
//         pipeline: [
//           { $match: { $expr: { $eq: [{$toString: "$_id"}, "$$rewardId"] }}},
//         ],
//         as: "reward"
//       }}, { $unwind: "$reward" },
//     ]).toArray().catch(err => {
//       throw err;
//     });
//   } catch (e) {
//     console.log(e)
//     console.error(e);
//     return res.status(400).json(e);
//   } finally {
//     return res.status(200).json({
//       data: {
//         tasks: ret
//       }
//     });
//   }
// })

// router.post('/complete', async (req, res) => {
//   try {
//     const {body} = req;
//     console.log(body);
//     const result = await client.db("ar").collection("completed").insertOne(body);
//     console.log(result)
//     res.status(200).json({
//       "msg": `New entry was created with the following id: ${result.insertedId}`
//     });
//   } catch (e) {
//     res.status(400).json({
//       "msg": e
//     })
//   }
// })

router.post("/new", async (req, res) => {
  try {
    const { body } = req;
    console.log(body);
    const username = body.username.trim();
    const existingUser = await client
      .db("ar")
      .collection("users")
      .findOne({ username: username });
    if (existingUser != null) {
      return res.status(400).json({
        msg: "User already exists",
      });
    }
    body.avgWalkingSpeed = 1;
    body.currentStatus = "unknown";
    const result = await client.db("ar").collection("users").insertOne(body);
    return res.status(200).json({
      msg: `New users entry was created with the following id: ${result.insertedId}`,
    });
  } catch (e) {
    res.status(400).json({
      msg: e,
    });
  }
});

module.exports = router;
