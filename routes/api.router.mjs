import express from "express";
import authRouter from "./auth.router.mjs";
import ordersRouter from "./orders.router.mjs";
import categoriesRouter from "./categories.router.mjs";
import recipesRouter from "./recipes.router.mjs";

const apiRouter = express();

apiRouter.use("/auth", authRouter);
apiRouter.use("/recipes", recipesRouter);
apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/orders", ordersRouter);


export default apiRouter;
