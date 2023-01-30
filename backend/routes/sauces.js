const express = require("express");
const auth = require("../middleware/auth");
const multer = require("../middleware/multer-config");
const router = express.Router();
const sauceCtrl = require("../controllers/sauce");

router.get("/", auth, sauceCtrl.displayAllSauces);
router.post("/", auth, multer, sauceCtrl.createSauce);
router.delete("/:id", auth, sauceCtrl.deleteSauce);
router.put("/:id", auth, multer, sauceCtrl.modifySauce);
router.get("/:id", sauceCtrl.displayOneSauce);
router.post("/:id/like", auth, sauceCtrl.likeToggleSauce);

module.exports = router;