const router = require('express').Router();
const c = require('./favorites.controller');
const { protect } = require('../../middleware/auth');
router.use(protect);
router.get('/', c.getFavorites);
router.post('/:vendorId', c.addFavorite);
router.delete('/:vendorId', c.removeFavorite);
module.exports = router;
