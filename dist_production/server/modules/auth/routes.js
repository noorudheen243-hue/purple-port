"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const middleware_1 = require("./middleware");
const router = express_1.default.Router();
router.post('/register', controller_1.registerUser);
router.post('/login', controller_1.loginUser);
router.post('/logout', controller_1.logoutUser);
router.get('/me', middleware_1.protect, controller_1.getMe);
exports.default = router;
