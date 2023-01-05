var express = require("express");
var router = express.Router();
const path = require("path");
const multer = require("multer");

// Stores specifications about our files.
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./public/images")
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname))
    }

});

const upload = multer({storage: storage})

const registration = require("../controllers/registration.controller");

router.get("/register", registration.register);
router.post("/login", registration.login);
router.post("/signUp", registration.signUp);
router.get("/profile", registration.profile);
router.post("/editProfile", upload.single('image'), registration.editProfile);

module.exports = router;