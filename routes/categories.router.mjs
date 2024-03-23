import express from "express";
import * as CategoriesController from '../controllers/categories.controller.mjs';
import {getAllCategoriesWithRecipes} from "../controllers/categories.controller.mjs";

const categoriesRouter = express.Router();

categoriesRouter.get("/", CategoriesController.getAllCategories);
categoriesRouter.get("/categorieswithrecipes", CategoriesController.getAllCategoriesWithRecipes);

export default categoriesRouter;
