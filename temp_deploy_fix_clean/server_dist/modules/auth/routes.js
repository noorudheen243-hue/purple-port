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
router.post('/change-password', middleware_1.protect, controller_1.changePassword);
router.get('/emergency-reset', controller_1.emergencyReset);
router.get('/emergency-reset', controller_1.registerUser); // Typo protection: NO. Need to import it first. 
// Wait, I need to export it from controller first.
// And checking imports in lines 1-3.
// Let's do imports first or assume it's there? No, need to be careful.
// Actually, I can just use 'any' casting if needed but better to import.
// Let's replace the import line too.
exports.default = router;
