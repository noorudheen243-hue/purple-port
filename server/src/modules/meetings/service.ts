import prisma from '../../utils/prisma';
import { createNotification } from '../notifications/service';

export const scheduleMeeting = async (organizerId: string, data: any) => {
  const { participants, presentations, organizer_id, ...meetingData } = data;
  
  // By default, the creator is the organizer. However, they can override it natively as 'Controlled By'
  const finalOrganizer = organizer_id || organizerId;

  const meeting = await prisma.meeting.create({
    data: {
      ...meetingData,
      organizer_id: finalOrganizer,
      participants: {
        create: participants.map((userId: string) => ({
          user_id: userId
        }))
      },
      presentations: {
        create: presentations?.map((p: any) => ({
          presenter_id: p.presenter_id,
          topic: p.topic
        })) || []
      }
    },
    include: {
      participants: true
    }
  });

  // Notify participants
  for (const part of meeting.participants) {
    if (part.user_id !== organizerId) {
      await createNotification(
        part.user_id,
        'MEETING_SCHEDULED',
        `You have been invited to a meeting: ${meeting.title}`,
        `/dashboard/meetings/${meeting.id}`
      );
      
      await prisma.meetingNotification.create({
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
};

export const getMeetings = async () => {
  return await prisma.meeting.findMany({
    include: {
      organizer: { select: { id: true, full_name: true } },
      participants: { include: { user: { select: { id: true, full_name: true } } } },
      mom: { select: { status: true } }
    },
    orderBy: { date: 'desc' }
  });
};

export const getMyMeetings = async (userId: string) => {
  return await prisma.meeting.findMany({
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
};

export const getMeetingDetails = async (id: string) => {
  return await prisma.meeting.findUnique({
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
};

export const submitMoM = async (meetingId: string, creatorId: string, data: any) => {
  const { performance_reviews, presentations, ...momData } = data;
  
  const mom = await prisma.meetingMoM.create({
    data: {
      ...momData,
      meeting_id: meetingId,
      creator_id: creatorId,
      status: 'SUBMITTED',
      performance_reviews: {
        create: performance_reviews?.map((pr: any) => ({
          user_id: pr.user_id,
          rating: pr.rating,
          strengths: pr.strengths,
          improvements: pr.improvements,
          comments: pr.comments,
        })) || []
      }
    }
  });

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: 'COMPLETED' }
  });

  // Update existing presentations with description and feedback (they were created at schedule time)
  if (presentations && presentations.length > 0) {
    for (const press of presentations) {
      if (press.id) {
        // Update existing presentation with notes and feedback
        await prisma.meetingPresentation.update({
          where: { id: press.id },
          data: {
            description: press.description,
            feedback: press.feedback
          }
        });
      } else {
        // Create new presentation if no id (fallback)
        await prisma.meetingPresentation.create({
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
  const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'MANAGER'] } } });
  for (const admin of admins) {
    await createNotification(
      admin.id,
      'MOM_SUBMITTED',
      `MoM submitted for review`,
      `/dashboard/meetings/admin-inbox`
    );
  }

  return mom;
};

export const getMoM = async (meetingId: string) => {
  return await prisma.meetingMoM.findUnique({
    where: { meeting_id: meetingId },
    include: {
      performance_reviews: { include: { user: { select: { id: true, full_name: true } } } },
      creator: { select: { full_name: true } }
    }
  });
};

export const updateMoM = async (meetingId: string, data: any) => {
  const { performance_reviews, presentations, ...momData } = data;

  const currentMoM = await prisma.meetingMoM.findUnique({
    where: { meeting_id: meetingId }
  });

  if (!currentMoM) throw new Error('MoM not found');

  const mom = await prisma.meetingMoM.update({
    where: { id: currentMoM.id },
    data: {
      ...momData,
      performance_reviews: {
        deleteMany: {},
        create: performance_reviews?.map((pr: any) => ({
          user_id: pr.user_id,
          rating: pr.rating,
          strengths: pr.strengths,
          improvements: pr.improvements,
          comments: pr.comments,
        })) || []
      }
    }
  });

  // Update existing presentations (already created or new ones)
  if (presentations && presentations.length > 0) {
    for (const press of presentations) {
      if (press.id) {
        await prisma.meetingPresentation.update({
          where: { id: press.id },
          data: {
            description: press.description,
            feedback: press.feedback
          }
        });
      }
    }
  }

  return mom;
};

export const getAdminInbox = async () => {
  return await prisma.meetingMoM.findMany({
    where: { status: { in: ['SUBMITTED', 'REVIEWED'] } },
    include: {
      meeting: true,
      creator: { select: { full_name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const reviewMoM = async (momId: string, status: string, remarks: string) => {
  const mom = await prisma.meetingMoM.update({
    where: { id: momId },
    data: { status, remarks }
  });

  await createNotification(
    mom.creator_id,
    'MOM_REVIEWED',
    `Your MoM was reviewed. Status: ${status}`,
    `/dashboard/meetings/${mom.meeting_id}`
  );

  return mom;
};

export const getMeetingReports = async () => {
  const totalMeetings = await prisma.meeting.count();
  const completedMeetings = await prisma.meeting.count({ where: { status: 'COMPLETED' } });
  
  const typeDistributionRaw = await prisma.meeting.groupBy({
    by: ['type'],
    _count: { id: true }
  });
  const typeDistribution = typeDistributionRaw.map(t => ({ name: t.type, value: t._count.id }));

  return {
    totalMeetings,
    completedMeetings,
    typeDistribution
  };
};

export const updateMeeting = async (id: string, data: any) => {
  const { participants, presentations, ...meetingData } = data;

  // We perform a sync by replacing old relations with new ones for simplicity
  return await prisma.meeting.update({
    where: { id },
    data: {
      ...meetingData,
      participants: participants ? {
        deleteMany: {},
        create: participants.map((userId: string) => ({
          user_id: userId
        }))
      } : undefined,
      presentations: presentations ? {
        deleteMany: {},
        create: presentations.map((p: any) => ({
          presenter_id: p.presenter_id,
          topic: p.topic
        }))
      } : undefined
    },
    include: {
      organizer: { select: { id: true, full_name: true } },
      participants: { include: { user: { select: { id: true, full_name: true } } } },
      presentations: { include: { presenter: { select: { id: true, full_name: true } } } }
    }
  });
};


export const deleteMeeting = async (id: string) => {
  return await prisma.meeting.delete({
    where: { id }
  });
};

