import express from "express";
import {
  userCount,
  brokersWithFullData,
  allLeads,
  updateBrokerStatus,
  updateLeadStatus,
  updateApplication,
  createAdmin,
  exportData,
  getRelationshipManager,
  updateRelationshipManager,
  getAdminAccessDetails,
  allClients,
  timelineActivity,
  getLenderRates,
  updateLenderRates,
  getPlatformSettings,
  updatePlatformSettings,
  getDashboardBundle
} from "../controllers/admin.controller.js";

import { verifyUser, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

/* ---------- DASHBOARD SINGLE BATCH BUNDLE ---------- */
router.get("/dashboard-bundle", verifyUser, isAdmin, getDashboardBundle);

/* ---------- DASHBOARD STATS ---------- */
router.get("/stats", verifyUser, isAdmin, userCount);

/* ---------- BROKERS (FULL DATA) ---------- */
router.get("/brokers", verifyUser, isAdmin, brokersWithFullData);

/* ---------- LEADS (FULL DATA) ---------- */
router.get("/leads", verifyUser, isAdmin, allLeads);

/* ---------- ACTIONS ---------- */
router.post("/broker-status", verifyUser, isAdmin, updateBrokerStatus);
router.post("/lead-status", verifyUser, isAdmin, updateLeadStatus);
router.put("/leads/:id", verifyUser, isAdmin, updateApplication);
router.post("/leads/:id", verifyUser, isAdmin, updateApplication);

/* ---------- ADMIN BOOTSTRAP ---------- */
router.post("/create-admin", createAdmin);

router.get("/export", verifyUser, isAdmin, exportData);

/* ---------- SETTINGS ---------- */
router.get("/relationship-manager", verifyUser, isAdmin, getRelationshipManager);
router.post("/relationship-manager", verifyUser, isAdmin, updateRelationshipManager);
router.get("/admin-access-details", verifyUser, isAdmin, getAdminAccessDetails);

/* ---------- BORROWERS, TIMELINE, RATES ---------- */
router.get("/clients", verifyUser, isAdmin, allClients);
router.get("/timeline", verifyUser, isAdmin, timelineActivity);
router.get("/lender-rates", verifyUser, isAdmin, getLenderRates);
router.post("/lender-rates", verifyUser, isAdmin, updateLenderRates);
router.get("/platform-settings", verifyUser, isAdmin, getPlatformSettings);
router.post("/platform-settings", verifyUser, isAdmin, updatePlatformSettings);

export default router;
