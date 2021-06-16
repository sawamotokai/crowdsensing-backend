require("dotenv").config();
const express = require("express");
const { ObjectID } = require("mongodb");
const router = express.Router();
const client = require("../../db");
const { sortByDistance } = require("../../utils");
client.connect();

router.get("/", async (req, res) => {
  const { query } = req;
  try {
    const taskCollection = client.db("ar").collection("tasks");
    var ret = await taskCollection
      .aggregate([
        { $match: { _id: ObjectID(query._id) } },
        {
          $lookup: {
            from: "trashbins",
            let: { trashbinId: "$trashbinId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$$trashbinId", { $toString: "$_id" }] },
                },
              },
            ],
            as: "trashbin",
          },
        },
        { $unwind: "$trashbin" },
        {
          $lookup: {
            from: "rewards",
            let: { rewardId: "$rewardId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: [{ $toString: "$_id" }, "$$rewardId"] },
                },
              },
            ],
            as: "reward",
          },
        },
        { $unwind: "$reward" },
        {
          $lookup: {
            from: "assigns",
            let: { taskID: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: [{ $toString: "$$taskID" }, "$taskID"] },
                },
              },
            ],
            as: "assignment",
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
        task: ret[0],
      },
    });
  }
});

router.get("/all", async (req, res) => {
  try {
    const taskCollection = client.db("ar").collection("tasks");
    var ret = await taskCollection
      .aggregate([
        {
          $lookup: {
            from: "trashbins",
            let: { trashbinId: "$trashbinId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$$trashbinId", { $toString: "$_id" }] },
                },
              },
            ],
            as: "trashbin",
          },
        },
        { $unwind: "$trashbin" },
        {
          $lookup: {
            from: "rewards",
            let: { rewardId: "$rewardId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: [{ $toString: "$_id" }, "$$rewardId"] },
                },
              },
            ],
            as: "reward",
          },
        },
        { $unwind: "$reward" },
        {
          $lookup: {
            from: "assigns",
            let: { taskID: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: [{ $toString: "$$taskID" }, "$taskID"] },
                },
              },
            ],
            as: "assignment",
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
        tasks: ret,
      },
    });
  }
});

router.get("/near", async (req, res) => {
  try {
    const { query } = req;
    // get nearest trashbins
    const trashbinCollection = client.db("ar").collection("trashbins");
    const trashbins = await trashbinCollection
      .find()
      .toArray()
      .catch((err) => {
        throw err;
      });
    const trashbins_nearest10 = sortByDistance(
      query.lat,
      query.lng,
      trashbins
    ).slice(0, 10);
    const taskCollection = client.db("ar").collection("tasks");
    const queryList = trashbins_nearest10.map((trashbin) =>
      String(trashbin._id)
    );
    var ret = await taskCollection
      .aggregate([
        {
          $lookup: {
            from: "trashbins",
            let: { trashbinId: "$trashbinId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$$trashbinId", queryList] },
                      { $eq: [{ $toString: "$_id" }, "$$trashbinId"] },
                    ],
                  },
                },
              },
            ],
            as: "trashbin",
          },
        },
        { $unwind: "$trashbin" },
        {
          $lookup: {
            from: "rewards",
            let: { rewardId: "$rewardId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: [{ $toString: "$_id" }, "$$rewardId"] },
                },
              },
            ],
            as: "reward",
          },
        },
        { $unwind: "$reward" },
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
        tasks: ret,
      },
    });
  }
});

/**
 * @arg {Object} req.body
 * @arg {string} req.body.userID
 * @arg {string} req.body.taskID
 */
router.post("/assign", async (req, res) => {
  try {
    const { body } = req;
    const doc = {
      userID: body.userID,
      taskID: body.taskID,
      isCompleted: false,
      assignedTime: new Date(),
      completedTime: null,
    };
    let result = await client.db("ar").collection("assigns").insertOne(doc);
    let result2 = await client
      .db("ar")
      .collection("tasks")
      .updateOne(
        { _id: ObjectID(body.taskID) },
        {
          $set: {
            lastUpdateTime: new Date(),
          },
        }
      );
    let result3 = await client
      .db("ar")
      .collection("users")
      .updateOne(
        { _id: ObjectID(body.userID) },
        {
          $set: {
            status: "busy",
          },
        }
      );
    res.status(200).json({
      msg: `Created a new assigns entry with id: ${result.insertedId}`,
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({
      msg: e,
    });
  }
});

// TODO: change to PUT method
router.put("/complete", async (req, res) => {
  try {
    const { body } = req;
    let result = await client
      .db("ar")
      .collection("assigns")
      .updateOne(
        { taskID: body.taskID, userID: body.userID },
        {
          $set: {
            isCompleted: true,
            completedTime: new Date(),
          },
        }
      );
    let result2 = await client
      .db("ar")
      .collection("tasks")
      .updateOne(
        { _id: ObjectID(body.taskID) },
        {
          $set: {
            lastUpdateTime: new Date(),
          },
        }
      );
    let result3 = await client
      .db("ar")
      .collection("users")
      .updateOne(
        { _id: ObjectID(body.userID) },
        {
          $set: {
            status: "idle",
          },
        }
      );
    res.status(200).json({
      msg: `Modified ${result.modifiedCount} entry`,
    });
  } catch (e) {
    res.status(400).json({
      msg: e,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { body } = req;
    body.lastUpdateTime = new Date();
    const result = await client.db("ar").collection("tasks").insertOne(body);
    res.status(200).json({
      msg: `New entry was created with the following id: ${result.insertedId}`,
    });
  } catch (e) {
    res.status(400).json({
      msg: e,
    });
  }
});

module.exports = router;
