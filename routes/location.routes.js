import express from "express";
import { getStates, getDistricts, getCities } from "../controllers/location.controller.js";

const router = express.Router();

router.get("/states", getStates);
router.get("/districts/:stateId", getDistricts);
router.get("/cities/:districtId", getCities);

export default router;
