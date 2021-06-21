require("dotenv").config();
const express = require("express");
const { ObjectID } = require("mongodb");
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
    this.username = "";
    this.lastLoggedIn = Date();
    this.currentTaskId = "";
    // TODO: how to update user location periodically
    this.location = { lat: number, lng: number };
    this.currentStatus = "unknown";
    this.avgWalkingSpeed = 1;
  }
}

router.get("/", async (req, res) => {
  try {
    const { query } = req;
    const { username } = query;
    const usersCollection = client.db("ar").collection("users");
    var ret = await usersCollection
      .aggregate([
        { $match: { username: username } },
        {
          $lookup: {
            from: "assigns",
            let: { username: "$username" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$$username", "$username"] },
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
        user: ret[0],
      },
    });
  }
});

router.get("/all", async (req, res) => {
  try {
    const usersCollection = client.db("ar").collection("users");
    var ret = await usersCollection
      .aggregate([
        {
          $lookup: {
            from: "assigns",
            let: { username: "$username" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$$username", "$username"] },
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
        users: ret,
      },
    });
  }
});

router.put("/wait_for_task", async (req, res) => {
  try {
    const { body } = req;
    let result = await client
      .db("ar")
      .collection("users")
      .updateOne(
        { username: body.username },
        {
          $set: {
            status: "waiting",
          },
        }
      );
    res.status(200).json({
      msg: `set the status of ${body.username} to waiting`,
    });
  } catch (e) {
    console.error(e);
    res.status(400).json(e);
  }
});

router.get("/currentTask", async (req, res) => {
  try {
    const { query } = req;
    const { username } = query;
    // get task id of the assigned task
    const q = {
      username: username,
      isCompleted: false,
      isValid: true,
    };
    const assignment = await client.db("ar").collection("assigns").findOne(q);
    if (!assignment) {
      return res.status(400).json({
        msg: "No tasks were found.",
      });
    }
    const { taskID } = assignment;
    var task = await client
      .db("ar")
      .collection("tasks")
      .aggregate([
        { $match: { _id: ObjectID(taskID) } },
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
      ])
      .toArray()
      .catch((err) => {
        throw err;
      });
    return res.status(200).json({
      data: {
        task: task[0],
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json(e);
  }
});

router.post("/", async (req, res) => {
  try {
    const { body } = req;
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
    body.status = "unknown";
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

router.put("/location", async (req, res) => {
  try {
    const { body } = req;
    const { username, lat, lng } = body;
    let result = await client
      .db("ar")
      .collection("users")
      .updateOne(
        { username: username },
        {
          $set: {
            "location.lat": lat,
            "location.lng": lng,
          },
        }
      );
    res.status(200).json({
      msg: `Set the location of ${username} to lat: ${lat} lng: ${lng}`,
    });
  } catch (e) {
    console.error(e);
    res.status(400).json(e);
  }
});

module.exports = router;
