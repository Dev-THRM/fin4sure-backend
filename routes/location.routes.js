import express from "express";
import { getStates, getDistricts, getCities, getLocationByPincode, getPublicSettings } from "../controllers/location.controller.js";

const router = express.Router();

router.get("/states", getStates);
router.get("/districts/:stateId", getDistricts);
router.get("/cities/:districtId", getCities);
router.get("/pincode/:pincode", getLocationByPincode);
router.get("/public-settings", getPublicSettings);

export default router;
