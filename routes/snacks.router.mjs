import express from "express";
import * as snacksController from '../controllers/snacks.controller.mjs';
import {getSnackOrder} from "../controllers/snacks.controller.mjs";

const snacksRouter = express.Router();

snacksRouter.get("/", snacksController.getAllSnacks);
snacksRouter.get("/getSnackOrder", snacksController.getSnackOrder);
snacksRouter.post("/addSnacksMapping", snacksController.addNewSnacksMapping);

export default snacksRouter;
