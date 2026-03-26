"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.deleteMeeting = exports.updateMeeting = exports.getMeetingReports = exports.reviewMoM = exports.getAdminInbox = exports.getMoM = exports.submitMoM = exports.getMeetingDetails = exports.getMyMeetings = exports.getMeetings = exports.scheduleMeeting = void 0;
const zod_1 = require("zod");
const meetingService = __importStar(require("./service"));
const scheduleMeetingSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    type: zod_1.z.enum(['WEEKLY', 'MONTHLY', 'CUSTOM']),
    date: zod_1.z.string(),
    time: zod_1.z.string(),
    duration: zod_1.z.number().min(1),
    agenda: zod_1.z.string().optional(),
    organizer_id: zod_1.z.string().optional(),
    participants: zod_1.z.array(zod_1.z.string()),
    presentations: zod_1.z.array(zod_1.z.object({
        presenter_id: zod_1.z.string(),
        topic: zod_1.z.string(),
    })).optional(),
    attachments: zod_1.z.string().optional()
});
const submitMoMSchema = zod_1.z.object({
    summary: zod_1.z.string().optional(),
    key_points: zod_1.z.string().optional(),
    decisions: zod_1.z.string().optional(),
    action_items: zod_1.z.string().optional(),
    performance_reviews: zod_1.z.array(zod_1.z.object({
        user_id: zod_1.z.string(),
        rating: zod_1.z.number().min(1).max(5),
        strengths: zod_1.z.string().optional(),
        improvements: zod_1.z.string().optional(),
        comments: zod_1.z.string().optional(),
    })).optional(),
    presentations: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().optional(),
        presenter_id: zod_1.z.string(),
        topic: zod_1.z.string(),
        description: zod_1.z.string().optional(),
        feedback: zod_1.z.string().optional(),
    })).optional()
});
const scheduleMeeting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        // Fix the date error by ensuring it's ISO Date
        if (req.body.date && typeof req.body.date === 'string' && !req.body.date.includes('T')) {
            req.body.date = new Date(req.body.date).toISOString();
        }
        const validatedData = scheduleMeetingSchema.parse(req.body);
        const meeting = yield meetingService.scheduleMeeting(req.user.id, validatedData);
        res.status(201).json(meeting);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return res.status(400).json({ errors: error.errors });
        res.status(500).json({ message: error.message });
    }
});
exports.scheduleMeeting = scheduleMeeting;
const getMeetings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const meetings = yield meetingService.getMeetings();
        res.json(meetings);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMeetings = getMeetings;
const getMyMeetings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const meetings = yield meetingService.getMyMeetings(req.user.id);
        res.json(meetings);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMyMeetings = getMyMeetings;
const getMeetingDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const meeting = yield meetingService.getMeetingDetails(req.params.id);
        if (!meeting)
            return res.status(404).json({ message: 'Meeting not found' });
        res.json(meeting);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMeetingDetails = getMeetingDetails;
const submitMoM = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const validatedData = submitMoMSchema.parse(req.body);
        const mom = yield meetingService.submitMoM(req.params.id, req.user.id, validatedData);
        res.status(201).json(mom);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return res.status(400).json({ errors: error.errors });
        res.status(500).json({ message: error.message });
    }
});
exports.submitMoM = submitMoM;
const getMoM = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mom = yield meetingService.getMoM(req.params.id);
        if (!mom)
            return res.status(404).json({ message: 'MoM not found' });
        res.json(mom);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMoM = getMoM;
const getAdminInbox = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const moms = yield meetingService.getAdminInbox();
        res.json(moms);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getAdminInbox = getAdminInbox;
const reviewMoM = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, remarks } = req.body;
        const mom = yield meetingService.reviewMoM(req.params.momId, status, remarks);
        res.json(mom);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.reviewMoM = reviewMoM;
const getMeetingReports = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reports = yield meetingService.getMeetingReports();
        res.json(reports);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getMeetingReports = getMeetingReports;
const updateMeeting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, type, date, time, duration, agenda, participants, presentations, organizer_id } = req.body;
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (type !== undefined)
            updateData.type = type;
        if (date !== undefined)
            updateData.date = new Date(date);
        if (time !== undefined)
            updateData.time = time;
        if (duration !== undefined)
            updateData.duration = parseInt(duration);
        if (agenda !== undefined)
            updateData.agenda = agenda;
        if (participants !== undefined)
            updateData.participants = participants;
        if (presentations !== undefined)
            updateData.presentations = presentations;
        if (organizer_id !== undefined)
            updateData.organizer_id = organizer_id;
        const meeting = yield meetingService.updateMeeting(req.params.id, updateData);
        res.json(meeting);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateMeeting = updateMeeting;
const deleteMeeting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield meetingService.deleteMeeting(req.params.id);
        res.json({ message: 'Meeting deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteMeeting = deleteMeeting;
