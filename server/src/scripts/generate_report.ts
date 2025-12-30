
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function generateReport() {
    try {
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: {
                id: true,
                full_name: true,
                email: true,
                department: true,
                role: true,
                createdAt: true
            }
        });

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Credentials Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f4f4f4; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .footer { margin-top: 30px; font-size: 0.8em; color: #666; }
        .warning { color: red; font-weight: bold; margin-top: 10px; }
    </style>
</head>
<body>
    <h1>System Admin Users Report</h1>
    <p>Generated on: ${new Date().toLocaleString()}</p>
    
    <div class="warning">
        Note: Passwords are securely hashed in the database and cannot be retrieved in plain text.
        Only newly reset/created passwords are known.
    </div>

    <table>
        <thead>
            <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Created At</th>
                <th>Password Status</th>
            </tr>
        </thead>
        <tbody>
            ${admins.map(admin => {
            let passwordStatus = "hashed (Unknown)";
            if (admin.email === 'admin@example.com') {
                passwordStatus = "admin123";
            }
            return `
                <tr>
                    <td>${admin.full_name}</td>
                    <td>${admin.email}</td>
                    <td>${admin.department}</td>
                    <td>${new Date(admin.createdAt).toLocaleDateString()}</td>
                    <td>${passwordStatus}</td>
                </tr>
                `;
        }).join('')}
        </tbody>
    </table>

    <div class="footer">
        Confidential Document - Qix Ads Work Management System
    </div>
</body>
</html>
    `;

        // Save to server/public or similar accessible path, or just root
        const outputPath = path.join(process.cwd(), 'admin_report.html');
        fs.writeFileSync(outputPath, htmlContent);
        console.log(`Report generated at: ${outputPath}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

generateReport();
