"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_GROUPS = exports.ROLES = void 0;
exports.ROLES = {
    DEVELOPER_ADMIN: 'DEVELOPER_ADMIN', // Implicit super-admin
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    DM_EXECUTIVE: 'DM_EXECUTIVE',
    WEB_SEO_EXECUTIVE: 'WEB_SEO_EXECUTIVE',
    MARKETING_EXEC: 'MARKETING_EXEC', // Added
    CREATIVE_DESIGNER: 'CREATIVE_DESIGNER',
    OPERATIONS_EXECUTIVE: 'OPERATIONS_EXECUTIVE',
    CLIENT: 'CLIENT',
};
exports.ROLE_GROUPS = {
    ALL_ADMINS: [exports.ROLES.DEVELOPER_ADMIN, exports.ROLES.ADMIN],
    MANAGEMENT: [exports.ROLES.DEVELOPER_ADMIN, exports.ROLES.ADMIN, exports.ROLES.MANAGER],
    STAFF: [
        exports.ROLES.MANAGER,
        exports.ROLES.DM_EXECUTIVE,
        exports.ROLES.WEB_SEO_EXECUTIVE,
        exports.ROLES.CREATIVE_DESIGNER,
        exports.ROLES.OPERATIONS_EXECUTIVE
    ],
    ALL_INTERNAL: [
        exports.ROLES.DEVELOPER_ADMIN,
        exports.ROLES.ADMIN,
        exports.ROLES.MANAGER,
        exports.ROLES.DM_EXECUTIVE,
        exports.ROLES.WEB_SEO_EXECUTIVE,
        exports.ROLES.CREATIVE_DESIGNER,
        exports.ROLES.OPERATIONS_EXECUTIVE
    ]
};
