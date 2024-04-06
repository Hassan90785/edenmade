import express from "express";
import * as SpicesController from '../controllers/spices.controller.mjs'

const spicesRouter = express.Router();


spicesRouter.get("/", SpicesController.getAllSpices);


export default spicesRouter;
