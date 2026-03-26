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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMeeting = exports.updateMeeting = exports.getMeetingReports = exports.reviewMoM = exports.getAdminInbox = exports.getMoM = exports.submitMoM = exports.getMeetingDetails = exports.getMyMeetings = exports.getMeetings = exports.scheduleMeeting = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const service_1 = require("../notifications/service");
const scheduleMeeting = (organizerId, data) => __awaiter(void 0, void 0, void 0, function* () {
    const { participants, presentations, organizer_id } = data, meetingData = __rest(data, ["participants", "presentations", "organizer_id"]);
    // By default, the creator is the organizer. However, they can override it natively as 'Controlled By'
    const finalOrganizer = organizer_id || organizerId;
    const meeting = yield prisma_1.default.meeting.create({
        data: Object.assign(Object.assign({}, meetingData), { organizer_id: finalOrganizer, participants: {
                create: participants.map((userId) => ({
                    user_id: userId
                }))
            }, presentations: {
                create: (presentations === null || presentations === void 0 ? void 0 : presentations.map((p) => ({
                    presenter_id: p.presenter_id,
                    topic: p.topic
                }))) || []
            } }),
        include: {
            participants: true
        }
    });
    // Notify participants
    for (const part of meeting.participants) {
        if (part.user_id !== organizerId) {
            yield (0, service_1.createNotification)(part.user_id, 'MEETING_SCHEDULED', `You have been invited to a meeting: ${meeting.title}`, `/dashboard/meetings/${meeting.id}`);
            yield prisma_1.default.meetingNotification.create({
                data: {
                    meeting_id: meeting.id,
                    user_id: part.user_id,
                    message: `You have been invited to a meeting: ${meeting.title}`,
                    type: 'SCHEDULED'
                }
            });
        }
    }
    return meeting;
});
exports.scheduleMeeting = scheduleMeeting;
const getMeetings = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.meeting.findMany({
        include: {
            organizer: { select: { id: true, full_name: true } },
            participants: { include: { user: { select: { id: true, full_name: true } } } },
            mom: { select: { status: true } }
        },
        orderBy: { date: 'desc' }
    });
});
exports.getMeetings = getMeetings;
const getMyMeetings = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.meeting.findMany({
        where: {
            OR: [
                { organizer_id: userId },
                { participants: { some: { user_id: userId } } }
            ]
        },
        include: {
            organizer: { select: { id: true, full_name: true } },
            participants: { include: { user: { select: { id: true, full_name: true } } } },
            mom: { select: { status: true } }
        },
        orderBy: { date: 'desc' }
    });
});
exports.getMyMeetings = getMyMeetings;
const getMeetingDetails = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.meeting.findUnique({
        where: { id },
        include: {
            organizer: { select: { id: true, full_name: true, avatar_url: true } },
            participants: { include: { user: { select: { id: true, full_name: true, avatar_url: true } } } },
            mom: {
                include: {
                    performance_reviews: { include: { user: { select: { id: true, full_name: true } } } },
                    creator: { select: { id: true, full_name: true } }
                }
            },
            presentations: { include: { presenter: { select: { id: true, full_name: true } } } }
        }
    });
});
exports.getMeetingDetails = getMeetingDetails;
const submitMoM = (meetingId, creatorId, data) => __awaiter(void 0, void 0, void 0, function* () {
    const { performance_reviews, presentations } = data, momData = __rest(data, ["performance_reviews", "presentations"]);
    const mom = yield prisma_1.default.meetingMoM.create({
        data: Object.assign(Object.assign({}, momData), { meeting_id: meetingId, creator_id: creatorId, status: 'SUBMITTED', performance_reviews: {
                create: (performance_reviews === null || performance_reviews === void 0 ? void 0 : performance_reviews.map((pr) => ({
                    user_id: pr.user_id,
                    rating: pr.rating,
                    strengths: pr.strengths,
                    improvements: pr.improvements,
                    comments: pr.comments,
                }))) || []
            } })
    });
    yield prisma_1.default.meeting.update({
        where: { id: meetingId },
        data: { status: 'COMPLETED' }
    });
    // Update existing presentations with description and feedback (they were created at schedule time)
    if (presentations && presentations.length > 0) {
        for (const press of presentations) {
            if (press.id) {
                // Update existing presentation with notes and feedback
                yield prisma_1.default.meetingPresentation.update({
                    where: { id: press.id },
                    data: {
                        description: press.description,
                        feedback: press.feedback
                    }
                });
            }
            else {
                // Create new presentation if no id (fallback)
                yield prisma_1.default.meetingPresentation.create({
                    data: {
                        presenter_id: press.presenter_id,
                        topic: press.topic,
                        description: press.description,
                        feedback: press.feedback,
                        meeting_id: meetingId
                    }
                });
            }
        }
    }
    // Notify Admins
    const admins = yield prisma_1.default.user.findMany({ where: { role: { in: ['ADMIN', 'MANAGER'] } } });
    for (const admin of admins) {
        yield (0, service_1.createNotification)(admin.id, 'MOM_SUBMITTED', `MoM submitted for review`, `/dashboard/meetings/admin-inbox`);
    }
    return mom;
});
exports.submitMoM = submitMoM;
const getMoM = (meetingId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.meetingMoM.findUnique({
        where: { meeting_id: meetingId },
        include: {
            performance_reviews: { include: { user: { select: { full_name: true } } } },
            creator: { select: { full_name: true } }
        }
    });
});
exports.getMoM = getMoM;
const getAdminInbox = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.meetingMoM.findMany({
        where: { status: { in: ['SUBMITTED', 'REVIEWED'] } },
        include: {
            meeting: true,
            creator: { select: { full_name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
});
exports.getAdminInbox = getAdminInbox;
const reviewMoM = (momId, status, remarks) => __awaiter(void 0, void 0, void 0, function* () {
    const mom = yield prisma_1.default.meetingMoM.update({
        where: { id: momId },
        data: { status, remarks }
    });
    yield (0, service_1.createNotification)(mom.creator_id, 'MOM_REVIEWED', `Your MoM was reviewed. Status: ${status}`, `/dashboard/meetings/${mom.meeting_id}`);
    return mom;
});
exports.reviewMoM = reviewMoM;
const getMeetingReports = () => __awaiter(void 0, void 0, void 0, function* () {
    const totalMeetings = yield prisma_1.default.meeting.count();
    const completedMeetings = yield prisma_1.default.meeting.count({ where: { status: 'COMPLETED' } });
    const typeDistributionRaw = yield prisma_1.default.meeting.groupBy({
        by: ['type'],
        _count: { id: true }
    });
    const typeDistribution = typeDistributionRaw.map(t => ({ name: t.type, value: t._count.id }));
    return {
        totalMeetings,
        completedMeetings,
        typeDistribution
    };
});
exports.getMeetingReports = getMeetingReports;
const updateMeeting = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    const { participants, presentations } = data, meetingData = __rest(data, ["participants", "presentations"]);
    // We perform a sync by replacing old relations with new ones for simplicity
    return yield prisma_1.default.meeting.update({
        where: { id },
        data: Object.assign(Object.assign({}, meetingData), { participants: participants ? {
                deleteMany: {},
                create: participants.map((userId) => ({
                    user_id: userId
                }))
            } : undefined, presentations: presentations ? {
                deleteMany: {},
                create: presentations.map((p) => ({
                    presenter_id: p.presenter_id,
                    topic: p.topic
                }))
            } : undefined }),
        include: {
            organizer: { select: { id: true, full_name: true } },
            participants: { include: { user: { select: { id: true, full_name: true } } } },
            presentations: { include: { presenter: { select: { id: true, full_name: true } } } }
        }
    });
});
exports.updateMeeting = updateMeeting;
const deleteMeeting = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.meeting.delete({
        where: { id }
    });
});
exports.deleteMeeting = deleteMeeting;
