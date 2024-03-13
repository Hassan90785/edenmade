import express from "express";
import * as RecipesController from '../controllers/recipes.controller.mjs';

const recipesRouter = express.Router();

recipesRouter.get("/", RecipesController.getAllRecipes);
recipesRouter.get("/:categoryId", RecipesController.getRecipesByCategory);

export default recipesRouter;
