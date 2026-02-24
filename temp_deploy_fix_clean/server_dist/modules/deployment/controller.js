"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerDeployment = void 0;
const service_1 = require("./service");
const roles_1 = require("../auth/roles");
const triggerDeployment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Double check authorized role just in case middleware fails (Defense in Depth)
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== roles_1.ROLES.DEVELOPER_ADMIN) {
            return res.status(403).json({ message: 'Unauthorized: Only Developer Admin can deploy updates.' });
        }
        console.log(`User ${req.user.id} (${req.user.role}) initiated deployment.`);
        // Determine if we should wait or return immediately. 
        // Deployment might take time (npm install, build). 
        // For better UX, we await it but ensure client has a long timeout or handle async.
        // Given it's an admin feature, awaiting is cleaner for immediate feedback 
        // unless it takes > 30s (likely will).
        // However, standard request timeout might kill it. 
        // Ensure we handle this.
        const result = yield (0, service_1.deployToVPS)();
        if (result.success) {
            res.status(200).json({
                message: 'Deployment successful.',
                logs: result.logs
            });
        }
        else {
            res.status(500).json({
                message: 'Deployment failed.',
                logs: result.logs,
                error: result.error
            });
        }
    }
    catch (error) {
        console.error('Deployment Controller Error:', error);
        res.status(500).json({ message: 'Internal Server Error during deployment.', error: error.message });
    }
});
exports.triggerDeployment = triggerDeployment;
