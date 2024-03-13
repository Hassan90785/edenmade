import express from "express";
import * as CategoriesController from '../controllers/categories.controller.mjs';

const categoriesRouter = express.Router();

categoriesRouter.get("/", CategoriesController.getAllCategories);

export default categoriesRouter;
