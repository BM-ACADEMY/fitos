const router = require('express').Router();
const masterAuth = require('../middleware/masterAuth');
const { getOverview, listGyms, overridePlan, suspendGym, getRevenue, waHealth, broadcast, listCoupons, createCoupon, deactivateCoupon, getAnalytics } = require('../controllers/masterController');

router.get('/overview', masterAuth, getOverview);
router.get('/gyms', masterAuth, listGyms);
router.patch('/gyms/:id/plan', masterAuth, overridePlan);
router.patch('/gyms/:id/suspend', masterAuth, suspendGym);
router.get('/revenue', masterAuth, getRevenue);
router.get('/wa-health', masterAuth, waHealth);
router.post('/broadcast', masterAuth, broadcast);
router.get('/coupons', masterAuth, listCoupons);
router.post('/coupons', masterAuth, createCoupon);
router.patch('/coupons/:id/deactivate', masterAuth, deactivateCoupon);
router.get('/analytics', masterAuth, getAnalytics);

module.exports = router;
