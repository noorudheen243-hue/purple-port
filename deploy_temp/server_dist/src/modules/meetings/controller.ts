import { Request, Response } from 'express';
import { z } from 'zod';
import * as meetingService from './service';

const scheduleMeetingSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['WEEKLY', 'MONTHLY', 'CUSTOM']),
  date: z.string(),
  time: z.string(),
  duration: z.number().min(1),
  agenda: z.string().optional(),
  organizer_id: z.string().optional(),
  participants: z.array(z.string()),
  presentations: z.array(z.object({
    presenter_id: z.string(),
    topic: z.string(),
  })).optional(),
  attachments: z.string().optional()
});

const submitMoMSchema = z.object({
  summary: z.string().optional(),
  key_points: z.string().optional(),
  decisions: z.string().optional(),
  action_items: z.string().optional(),
  performance_reviews: z.array(z.object({
    user_id: z.string(),
    rating: z.number().min(1).max(5),
    strengths: z.string().optional(),
    improvements: z.string().optional(),
    comments: z.string().optional(),
  })).optional(),
  presentations: z.array(z.object({
    id: z.string().optional(),
    presenter_id: z.string(),
    topic: z.string(),
    description: z.string().optional(),
    feedback: z.string().optional(),
  })).optional()
});

export const scheduleMeeting = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    
    // Fix the date error by ensuring it's ISO Date
    if (req.body.date && typeof req.body.date === 'string' && !req.body.date.includes('T')) {
      req.body.date = new Date(req.body.date).toISOString();
    }

    const validatedData = scheduleMeetingSchema.parse(req.body);
    const meeting = await meetingService.scheduleMeeting(req.user.id, validatedData);
    res.status(201).json(meeting);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    res.status(500).json({ message: error.message });
  }
};

export const getMeetings = async (req: Request, res: Response) => {
  try {
    const meetings = await meetingService.getMeetings();
    res.json(meetings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyMeetings = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const meetings = await meetingService.getMyMeetings(req.user.id);
    res.json(meetings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMeetingDetails = async (req: Request, res: Response) => {
  try {
    const meeting = await meetingService.getMeetingDetails(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.json(meeting);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const submitMoM = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const validatedData = submitMoMSchema.parse(req.body);
    const mom = await meetingService.submitMoM(req.params.id, req.user.id, validatedData);
    res.status(201).json(mom);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    res.status(500).json({ message: error.message });
  }
};

export const getMoM = async (req: Request, res: Response) => {
  try {
    const mom = await meetingService.getMoM(req.params.id);
    if (!mom) return res.status(404).json({ message: 'MoM not found' });
    res.json(mom);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminInbox = async (req: Request, res: Response) => {
  try {
    const moms = await meetingService.getAdminInbox();
    res.json(moms);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const reviewMoM = async (req: Request, res: Response) => {
  try {
    const { status, remarks } = req.body;
    const mom = await meetingService.reviewMoM(req.params.momId, status, remarks);
    res.json(mom);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMeetingReports = async (req: Request, res: Response) => {
  try {
    const reports = await meetingService.getMeetingReports();
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMeeting = async (req: Request, res: Response) => {
  try {
    const { title, type, date, time, duration, agenda, participants, presentations, organizer_id } = req.body;
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (type !== undefined) updateData.type = type;
    if (date !== undefined) updateData.date = new Date(date);
    if (time !== undefined) updateData.time = time;
    if (duration !== undefined) updateData.duration = parseInt(duration);
    if (agenda !== undefined) updateData.agenda = agenda;
    if (participants !== undefined) updateData.participants = participants;
    if (presentations !== undefined) updateData.presentations = presentations;
    if (organizer_id !== undefined) updateData.organizer_id = organizer_id;

    const meeting = await meetingService.updateMeeting(req.params.id, updateData);
    res.json(meeting);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


export const deleteMeeting = async (req: Request, res: Response) => {
  try {
    await meetingService.deleteMeeting(req.params.id);
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

