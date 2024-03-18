import express from "express";
import authRouter from "./auth.router.mjs";
import ordersRouter from "./orders.router.mjs";
import categoriesRouter from "./categories.router.mjs";
import recipesRouter from "./recipes.router.mjs";
import stripeRouter from "./stripe.router.mjs";

const apiRouter = express();

apiRouter.use("/auth", authRouter);
apiRouter.use("/recipes", recipesRouter);
apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/orders", ordersRouter);
apiRouter.use("/stripe", stripeRouter);


export default apiRouter;
