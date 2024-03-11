import express from "express";
import authRouter from "./auth.router.mjs";

const apiRouter = express();

apiRouter.use("/auth", authRouter);


export default apiRouter;
