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
    const usersCollection = client.db("ar").collection("users");
    var ret = await usersCollection
      .aggregate([
        { $match: { _id: ObjectID(query._id) } },
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
      msg: `Set the status of ${body.username} to waiting`,
    });
  } catch (e) {
    console.error(e);
    res.status(400).json(e);
  }
});

router.post("/new", async (req, res) => {
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
