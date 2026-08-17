const express = require("express");
const router = express.Router();
const controller = require("../controllers/reunionController");
const planController = require("../controllers/reunionPlanController");
const { verifyReunionAdmin } = require("../middleware/reunionAdmin");
const { verifyReunionMember } = require("../middleware/reunionMember");
const { writeLimiter } = require("../middleware/rateLimiter");

router.get("/registrations", controller.listRegistrations);
router.post("/registrations", writeLimiter, controller.createRegistration);
router.get("/plans", planController.listPlans);
router.post(
  "/plans",
  verifyReunionMember,
  writeLimiter,
  planController.createPlan,
);
router.post(
  "/plans/:id/vote",
  verifyReunionMember,
  writeLimiter,
  planController.toggleVote,
);
router.delete(
  "/plans/:id",
  verifyReunionMember,
  writeLimiter,
  planController.deletePlan,
);
router.post("/admin/login", writeLimiter, controller.adminLogin);
router.post("/admin/logout", controller.adminLogout);
router.get("/admin/status", controller.adminStatus);
router.patch(
  "/admin/registrations/:id/participants",
  verifyReunionAdmin,
  writeLimiter,
  controller.updateParticipantCount,
);
router.patch(
  "/admin/registrations/:id/payment",
  verifyReunionAdmin,
  writeLimiter,
  controller.updatePaymentStatus,
);
router.patch(
  "/admin/registrations/:id/amount",
  verifyReunionAdmin,
  writeLimiter,
  controller.updateAmount,
);

module.exports = router;
