    // routes/visitors.js
    const express = require("express");
    const router = express.Router();
    const visitorController = require("../controllers/visitors");

    router.get("/change", visitorController.getVisitorChange);
    router.post("/track", visitorController.trackView);

    module.exports = router;