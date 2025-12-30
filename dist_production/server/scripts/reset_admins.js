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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
function resetAndReport() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // 1. Hash the new password
            const newPassword = 'admin@123';
            const salt = yield bcryptjs_1.default.genSalt(10);
            const passwordHash = yield bcryptjs_1.default.hash(newPassword, salt);
            // 2. Update Admins (excluding admin@example.com)
            const updateResult = yield prisma.user.updateMany({
                where: {
                    role: 'ADMIN',
                    NOT: {
                        email: 'admin@example.com'
                    }
                },
                data: {
                    password_hash: passwordHash
                }
            });
            console.log(`Updated ${updateResult.count} admin users with password '${newPassword}'.`);
            // 3. Fetch all admins for the report
            const admins = yield prisma.user.findMany({
                where: { role: 'ADMIN' },
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                    department: true,
                    role: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'asc' }
            });
            // 4. Generate HTML Report
            const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Credentials Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; background-color: #f9fafb; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-radius: 8px; }
        h1 { color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #e5e7eb; padding: 12px 16px; text-align: left; }
        th { background-color: #f3f4f6; color: #374151; font-weight: 600; text-transform: uppercase; font-size: 0.85em; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .footer { margin-top: 40px; font-size: 0.8em; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        .warning { background-color: #fef2f2; color: #991b1b; padding: 16px; border-radius: 6px; margin-bottom: 24px; border-left: 4px solid #ef4444; }
        .cred-box { font-family: monospace; background: #eff6ff; padding: 2px 6px; rounded: 4px; color: #1e40af; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>System Admin Users Report</h1>
        <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
        
        <div class="warning">
            <strong>Action Taken:</strong> Passwords for all admins (except 'admin@example.com') have been reset to default values using a secure hashing algorithm.
        </div>

        <table>
            <thead>
                <tr>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Current Password</th>
                </tr>
            </thead>
            <tbody>
                ${admins.map(admin => {
                let passwordDisplay = '<span class="cred-box">admin@123</span>'; // Default reset
                if (admin.email === 'admin@example.com') {
                    passwordDisplay = '<span class="cred-box">admin123</span> (Unchanged)';
                }
                return `
                    <tr>
                        <td>${admin.full_name}</td>
                        <td>${admin.email}</td>
                        <td>${admin.department}</td>
                        <td>${passwordDisplay}</td>
                    </tr>
                    `;
            }).join('')}
            </tbody>
        </table>

        <div class="footer">
            Confidential Document - Qix Ads Work Management System<br>
            Please distribute securely.
        </div>
    </div>
</body>
</html>
    `;
            const outputPath = path_1.default.join(process.cwd(), 'admin_report.html');
            fs_1.default.writeFileSync(outputPath, htmlContent);
            console.log(`Report generated at: ${outputPath}`);
        }
        catch (error) {
            console.error('Error:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
resetAndReport();
