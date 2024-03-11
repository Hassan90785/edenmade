import express from "express";
import * as AuthController from '../controllers/auth.controller.mjs'

const authRouter = express.Router();


authRouter.post("/login", AuthController.login);
authRouter.post("/signup", AuthController.signUp);


export default authRouter;
