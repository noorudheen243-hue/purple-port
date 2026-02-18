import { Request, Response } from 'express';
import { AttendanceService } from './service';

export class AttendanceController {

    static async checkIn(req: Request, res: Response) {
        try {
            const userId = req.user?.id; // Assuming auth middleware populates this
            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

            const record = await AttendanceService.checkIn(userId);
            res.status(200).json(record);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async checkOut(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

            const record = await AttendanceService.checkOut(userId);
            res.status(200).json(record);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async getSummary(req: Request, res: Response) {
        try {
            let userId = req.user?.id;
            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

            // Allow Admin/Manager to view others
            if ((req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER' || req.user?.role === 'DEVELOPER_ADMIN') && req.query.userId) {
                userId = req.query.userId as string;
            }

            const { start, end } = req.query;
            const startDate = start ? new Date(start as string) : new Date();
            const endDate = end ? new Date(end as string) : new Date();

            const data = await AttendanceService.getAttendance(userId, startDate, endDate);
            res.status(200).json(data);
        } catch (error: any) {
            console.error('Error in getSummary:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async requestRegularisation(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

            const { date, type, reason } = req.body;
            const request = await AttendanceService.requestRegularisation(userId, new Date(date), type, reason);
            res.status(201).json(request);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async getTeamSummary(req: Request, res: Response) {
        try {
            // Role check is done in middleware usually, but good to be safe
            // if (req.user?.role !== 'ADMIN') ...

            const { month, year } = req.query;
            // Calculate start and end of month
            const y = parseInt(year as string) || new Date().getFullYear();
            const m = parseInt(month as string) || new Date().getMonth() + 1; // 1-12 convention from frontend usually

            const start = new Date(y, m - 1, 1);
            const end = new Date(y, m, 0); // Last day of month

            const data = await AttendanceService.getTeamAttendance(start, end, req.user);
            res.status(200).json(data);
        } catch (error: any) {
            console.error('Error in getTeamSummary:', error);
            res.status(500).json({ message: error.message });
        }
    }
    static async getRegularisationRequests(req: Request, res: Response) {
        try {
            // If admin, fetch all? Or allow filtering.
            // For now, let's allow fetching pending by default or all.
            const { status, userId } = req.query;
            const requests = await AttendanceService.getRegularisationRequests(userId as string, status as string);
            res.status(200).json(requests);
        } catch (error: any) {
            console.error('Error in getRegularisationRequests:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async updateRegularisationStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status } = req.body; // APPROVED or REJECTED
            const approverId = req.user?.id;

            if (!approverId) return res.status(401).json({ message: 'Unauthorized' });

            const result = await AttendanceService.updateRegularisationStatus(id, approverId, status);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async updateRegularisationRequest(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { date, type, reason } = req.body;
            // Admin only or owner? Assuming Admin for "Approvals" page edits
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && req.user?.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: 'Forbidden' });
            }

            const result = await AttendanceService.updateRegularisationRequest(id, {
                date: date ? new Date(date) : undefined,
                type,
                reason
            });
            res.status(200).json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async deleteRegularisationRequest(req: Request, res: Response) {
        try {
            const { id } = req.params;
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && req.user?.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: 'Forbidden' });
            }
            await AttendanceService.deleteRegularisationRequest(id);
            res.status(204).send();
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async getRegularisationHistory(req: Request, res: Response) {
        try {
            const { month, year, status } = req.query;
            const history = await AttendanceService.getRegularisationHistory(
                parseInt(month as string),
                parseInt(year as string),
                status as string
            );
            res.status(200).json(history);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async revertRegularisationStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            // Admin/Manager only
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && req.user?.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: 'Forbidden' });
            }

            const updated = await AttendanceService.revertRegularisationStatus(id);
            res.status(200).json(updated);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async getMonthlyCalendar(req: Request, res: Response) {
        try {
            const { month, year } = req.query;
            let userId = req.user?.id;

            // Admin override
            if ((req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER' || req.user?.role === 'DEVELOPER_ADMIN') && req.query.userId) {
                userId = req.query.userId as string;
            }

            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

            const m = parseInt(month as string) || new Date().getMonth() + 1;
            const y = parseInt(year as string) || new Date().getFullYear();

            const data = await AttendanceService.getMonthlyCalendar(userId, m, y);
            res.status(200).json(data);
        } catch (error: any) {
            console.error('Error in getMonthlyCalendar:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async adminUpdateAttendance(req: Request, res: Response) {
        try {
            // Strictly Admin/Manager
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && req.user?.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: 'Forbidden' });
            }

            const { userId, date, status, check_in, check_out } = req.body;
            const result = await AttendanceService.adminUpdateAttendance(userId, date, { status, check_in, check_out });
            res.status(200).json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }
    static async syncBiometricData(req: Request, res: Response) {
        try {
            // Admin or API Key check
            let authorized = false;
            if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'DEVELOPER_ADMIN')) {
                authorized = true;
            } else {
                const apiKey = req.headers['x-api-key'];
                const envKey = process.env.BIOMETRIC_API_KEY;
                if (apiKey && envKey && apiKey === envKey) {
                    authorized = true;
                }
            }

            if (!authorized) {
                return res.status(403).json({ message: 'Forbidden: Invalid Auth or API Key' });
            }

            const { logs } = req.body; // Expecting { logs: [{ staff_number, timestamp }] }
            if (!Array.isArray(logs)) return res.status(400).json({ message: "Invalid format. 'logs' must be an array." });

            const result = await AttendanceService.processBiometricLogs(logs);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Manual Trigger for Device Sync (from UI)
    static async triggerDeviceSync(req: Request, res: Response) {
        try {
            // Strictly Admin/Manager
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && req.user?.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: 'Forbidden' });
            }

            // Lazy Import to avoid circular deps if any, though service should be fine
            const { syncBiometrics } = require('./biometric.service');
            await syncBiometrics();

            res.status(200).json({ message: 'Biometric Sync Completed Successfully' });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getBiometricLogs(req: Request, res: Response) {
        try {
            const { start, end } = req.query;
            let userId = req.query.userId as string; // Optional filter from Admin

            // Access Control
            const currentUser = req.user;
            if (!currentUser) return res.status(401).json({ message: 'Unauthorized' });

            const isAdminOrManager = ['ADMIN', 'MANAGER', 'DEVELOPER_ADMIN'].includes(currentUser.role);

            // If NOT admin, force view only OWN logs
            if (!isAdminOrManager) {
                userId = currentUser.id;
            }
            // If Admin AND no specific user requested, fetch all (userId remains undefined)

            const startDate = start ? new Date(start as string) : new Date();
            const endDate = end ? new Date(end as string) : new Date();

            // Default to today if only start provided or invalid
            if (isNaN(startDate.getTime())) {
                const today = new Date();
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
            }

            const logs = await AttendanceService.getBiometricLogs(startDate, endDate, userId);
            res.status(200).json(logs);
        } catch (error: any) {
            console.error('Error in getBiometricLogs:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async uploadUsersToDevice(req: Request, res: Response) {
        try {
            // Strictly Admin/Manager
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && req.user?.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: 'Forbidden' });
            }

            const { biometricControl } = require('./biometric.service');
            const result = await biometricControl.uploadUsersToDevice();
            res.status(200).json(result);
        } catch (error: any) {
            console.error('Error in uploadUsersToDevice:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async importUsersFromDevice(req: Request, res: Response) {
        try {
            // Strictly Admin/Manager
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && req.user?.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: 'Forbidden' });
            }

            const { biometricControl } = require('./biometric.service');
            const result = await biometricControl.importUsersFromDevice();
            res.status(200).json(result);
        } catch (error: any) {
            console.error('Error in importUsersFromDevice:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async editDeviceUser(req: Request, res: Response) {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && req.user?.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: 'Forbidden' });
            }

            const { staffNumber, name, role } = req.body;
            if (!staffNumber || !name) return res.status(400).json({ message: 'Staff Number and Name are required' });

            const { biometricControl } = require('./biometric.service');
            const result = await biometricControl.setUserOnDevice(staffNumber, name, role); // role: 14=Admin, 0=User
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async deleteDeviceUser(req: Request, res: Response) {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && req.user?.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: 'Forbidden' });
            }

            const { staffNumber } = req.params;
            if (!staffNumber) return res.status(400).json({ message: 'Staff Number is required' });

            const { biometricControl } = require('./biometric.service');
            const result = await biometricControl.deleteUserFromDevice(staffNumber);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // --- Missing Endpoints for Console ---

    static async getDeviceInfo(req: Request, res: Response) {
        try {
            // Strictly Admin/Manager
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && req.user?.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: 'Forbidden' });
            }
            const { biometricControl } = require('./biometric.service');
            const result = await biometricControl.getDeviceInfo();
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getDeviceUsers(req: Request, res: Response) {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && req.user?.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: 'Forbidden' });
            }
            const { biometricControl } = require('./biometric.service');
            const result = await biometricControl.getDeviceUsers();
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async restartDevice(req: Request, res: Response) {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && req.user?.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: 'Forbidden' });
            }
            const { biometricControl } = require('./biometric.service');
            const result = await biometricControl.restartDevice();
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async syncTime(req: Request, res: Response) {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && req.user?.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: 'Forbidden' });
            }
            const { biometricControl } = require('./biometric.service');
            const result = await biometricControl.syncDeviceTime();
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async clearLogs(req: Request, res: Response) {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && req.user?.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: 'Forbidden' });
            }
            const { biometricControl } = require('./biometric.service');
            const result = await biometricControl.clearAttendanceLogs();
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Manual ADD User (for console)
    static async addDeviceUser(req: Request, res: Response) {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && req.user?.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: 'Forbidden' });
            }
            const { uid, name, userId, role } = req.body; // uid numeric, userId string
            const { biometricControl } = require('./biometric.service');

            // We reuse setUserOnDevice, but it expects staff number. 
            // If manual add, we might be bypassing staff profile. 
            // Let's use the setUser method directly via control service logic or adapt.
            // BiometricService.setUserOnDevice uses regex match on staffNumber to get UID.
            // If we have manual UID, we need a method that accepts UID directly or modify setUserOnDevice.
            // Actually, `setUser` on ZKLib takes (uid, userid, name...).
            // Let's call the raw method helper or update service.

            // For now, let's assume we use the exposed `setUserOnDevice` and require `userId` (StaffNumber) to match digits for UID
            // OR better, create `addDeviceUser` in service?
            // User requested: `addUserMutation.mutate({ uid: parseInt(uid), name, userId: userid });`
            // Let's add a direct method in controller that uses the connection.
            // BUT strict mode says we should use service. 
            // `setUserOnDevice` in service parses UID from StaffNumber.
            // If manual input has separate UID, we need `setUserRaw` or similar.

            // Re-reading service refactor: `setUserOnDevice` does parsing internally.
            // If user provides UID=1 and UserId="QIX001", and we pass "QIX001", it parses "1".
            // If user manually enters "999" and "Guest", it parses 999.
            // So we can use `setUserOnDevice(userId, name, role)`.
            // Ignoring the manually passed `uid` from frontend if we strictly follow regex?
            // Frontend sends: `{ uid: ..., name: ..., userId: ... }`.
            // Let's just use `setUserOnDevice` with the userId.

            const result = await biometricControl.setUserOnDevice(userId, name, role || 0);
            res.status(200).json(result);

        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getSyncAudit(req: Request, res: Response) {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER' && req.user?.role !== 'DEVELOPER_ADMIN') {
                return res.status(403).json({ message: 'Forbidden' });
            }
            const { biometricControl } = require('./biometric.service');
            const result = await biometricControl.auditUserSync();
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async startEnrollment(req: Request, res: Response) {
        try {
            const { biometricControl } = require('./biometric.service');
            const { staffNumber, fingerIndex } = req.body;
            const result = await biometricControl.startEnrollment(staffNumber, fingerIndex || 0);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async syncTemplates(req: Request, res: Response) {
        try {
            const { biometricControl } = require('./biometric.service');
            const result = await biometricControl.syncTemplates();
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    // Bulk recalculate ALL attendance records (fixes historical PRESENT → HALF_DAY for late punchers)
    static async bulkRecalculateAll(req: Request, res: Response) {
        try {
            const db = (await import('../../utils/prisma')).default;

            // Get all staff
            const allStaff = await db.staffProfile.findMany({
                select: { user_id: true, staff_number: true }
            });

            let totalUpdated = 0;
            const errors: string[] = [];

            for (const staff of allStaff) {
                try {
                    // Recalculate last 6 months by default (or use query params)
                    const endDate = new Date();
                    const startDate = new Date();
                    startDate.setMonth(startDate.getMonth() - 6);

                    const result = await AttendanceService.recalculateAttendance(staff.user_id, startDate, endDate);
                    totalUpdated += result.updatedCount || 0;
                } catch (e: any) {
                    errors.push(`${staff.staff_number}: ${e.message}`);
                }
            }

            res.json({
                message: `Bulk recalculation complete. Updated ${totalUpdated} records.`,
                totalUpdated,
                staffProcessed: allStaff.length,
                errors: errors.length > 0 ? errors : undefined
            });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}
