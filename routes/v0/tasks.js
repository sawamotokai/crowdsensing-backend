require('dotenv').config();
const express = require('express');
const router = express.Router();
const client = require('../../db');
const {sortByDistance, } = require("../../utils");
client.connect();


router.get('/near', async (req, res) => {
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


module.exports = router;