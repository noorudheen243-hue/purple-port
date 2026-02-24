"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const middleware_1 = require("../auth/middleware");
const controller_1 = require("./controller");
const roles_1 = require("../auth/roles");
const router = express_1.default.Router();
// Only DEVELOPER_ADMIN can deploy
router.post('/deploy', middleware_1.protect, (0, middleware_1.authorize)(roles_1.ROLES.DEVELOPER_ADMIN), controller_1.triggerDeployment);
exports.default = router;
