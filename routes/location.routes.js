import express from "express";
import { getStates, getDistricts, getCities, getLocationByPincode } from "../controllers/location.controller.js";

const router = express.Router();

router.get("/states", getStates);
router.get("/districts/:stateId", getDistricts);
router.get("/cities/:districtId", getCities);
router.get("/pincode/:pincode", getLocationByPincode);

export default router;
