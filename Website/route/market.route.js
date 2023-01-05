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

const upload = multer({storage: storage});

const market = require("../controllers/market.controller");

router.get("/getProducts", market.getProducts);

router.get("/details", market.details);
router.get("/sell", market.sell);
router.post("/api/sell", upload.single("image"), market.addToMarket);
router.get("/buy", market.buy);
router.get("/transactions", market.transactions);
router.get("/supply", market.supply);
router.get("/delete", market.deleteProduct);
router.get("/editProduct", market.editProduct);
router.post("/confirmProduct", upload.single("image"), market.confirmProduct);
router.get("/cart", market.cart);
router.get("/viewCart", market.viewCart);
router.get("/deleteCart", market.deleteCart);
router.get("/redirect", market.redirect);
router.get("/", market.homepage);
router.post("/review", market.review);
router.post("/confirmReview", market.confirmReview);
router.get("/deleteReview", market.deleteReview);
router.get("/stocks", market.stocks);

module.exports = router;