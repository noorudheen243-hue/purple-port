"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const middleware_1 = require("../auth/middleware");
const router = express_1.default.Router();
router.use(middleware_1.protect); // All task routes are protected
router.route('/')
    .post(controller_1.createTask)
    .get(controller_1.getTasks);
router.route('/:id')
    .get(controller_1.getTask)
    .put(controller_1.updateTask)
    .delete(controller_1.deleteTask);
exports.default = router;
