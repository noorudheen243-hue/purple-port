"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./app"));
dotenv_1.default.config();
const PORT = process.env.PORT || 4001;
// Override the app's default CORS if possible, or just rely on having updated it in app.ts?
// Actually, CORS is set in app.ts. Modifying server.ts won't change middleware order.
// I need to modify app.ts, NOT server.ts.
// But wait, my previous view showed CORS in `app.ts`.
// Let's modify `app.ts` via write_to_file to be sure.
app_1.default.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
