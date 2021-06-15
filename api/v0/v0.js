const express = require("express");
const router = express.Router();

router.use(function timeLog(req, res, next) {
  console.log("Time: ", new Date());
  next();
});

router.use("/tasks", require("./tasks"));
router.use("/users", require("./users"));

module.exports = router;
