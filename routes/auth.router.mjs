import express from "express";
import * as AuthController from '../controllers/auth.controller.mjs'
import {social_login, updateCustomerDetails} from "../controllers/auth.controller.mjs";

const authRouter = express.Router();


authRouter.post("/login", AuthController.login);
authRouter.post("/social_login", AuthController.social_login);
authRouter.post("/signup", AuthController.signUp);
authRouter.post("/updateCustomerDetails", AuthController.updateCustomerDetails);


export default authRouter;
