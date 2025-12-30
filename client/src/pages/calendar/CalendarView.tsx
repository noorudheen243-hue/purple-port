import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    addMonths,
    subMonths,
    isSameDay
} from 'date-fns';

const CalendarView = () => {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Fetch Campaigns for the month
    const { data: campaigns, isLoading: campaignsLoading } = useQuery({
        queryKey: ['campaigns', format(currentDate, 'yyyy-MM')],
        queryFn: async () => {
            const { data } = await api.get(`/campaigns?month=${currentDate.toISOString()}`);
            return data;
        }
    });

    // Fetch Tasks (fetching all for now to ensure we populate the calendar)
    const { data: tasks, isLoading: tasksLoading } = useQuery({
        queryKey: ['tasks-calendar'],
        queryFn: async () => {
            const { data } = await api.get('/tasks');
            return data;
        }
    });

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const today = () => setCurrentDate(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Helper to get color based on Task Type
    const getTaskColor = (type: string) => {
        switch (type) {
            case 'GRAPHIC':
            case 'BRANDING':
            case 'CREATIVE_DESIGNER': // Mapping role-like types if any
                return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'VIDEO':
            case 'MOTION':
            case 'REEL_EDITING':
            case 'CONTENT_SHOOTING':
                return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'WEB_DEV':
            case 'WEB':
            case 'SEO':
            case 'ADS_SETUP':
                return 'bg-sky-100 text-sky-700 border-sky-200';
            case 'CONTENT_CREATION':
            case 'CONTENT':
                return 'bg-pink-100 text-pink-700 border-pink-200';
            case 'REPORTING':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default:
                return 'bg-emerald-50 text-emerald-700 border-emerald-200'; // Default Green
        }
    };

    // Helper to find items for a day
    const getItemsForDay = (day: Date) => {
        const items: any[] = [];

        // Add Campaigns
        if (campaigns) {
            campaigns.forEach((c: any) => {
                const start = new Date(c.start_date);
                const end = new Date(c.end_date);
                if (isSameDay(day, start) || isSameDay(day, end)) {
                    items.push({
                        id: c.id,
                        title: c.title,
                        type: 'CAMPAIGN',
                        isStart: isSameDay(day, start),
                        isEnd: isSameDay(day, end)
                    });
                }
            });
        }

        // Add Tasks
        if (tasks) {
            tasks.forEach((t: any) => {
                if (t.due_date && isSameDay(day, new Date(t.due_date))) {
                    items.push({
                        id: t.id,
                        title: t.title,
                        type: 'TASK',
                        taskType: t.type, // Pass specific type
                        status: t.status,
                        priority: t.priority
                    });
                }
            });
        }

        return items;
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Content Calendar</h1>
                <div className="flex items-center gap-4">
                    <button onClick={today} className="text-sm font-medium px-3 py-1 border rounded hover:bg-accent">Today</button>
                    <div className="flex items-center rounded-md border bg-card">
                        <button onClick={prevMonth} className="p-2 hover:bg-accent border-r"><ChevronLeft size={20} /></button>
                        <span className="px-4 font-semibold min-w-[140px] text-center">{format(currentDate, 'MMMM yyyy')}</span>
                        <button onClick={nextMonth} className="p-2 hover:bg-accent border-l"><ChevronRight size={20} /></button>
                    </div>
                </div>
            </div>

            <div className="bg-card border rounded-lg shadow-sm flex-1 flex flex-col min-h-[600px]">
                {/* Header */}
                <div className="grid grid-cols-7 border-b">
                    {weekDays.map(day => (
                        <div key={day} className="p-4 text-center text-sm font-semibold text-muted-foreground border-r last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                    {calendarDays.map((day, dayIdx) => {
                        const items = getItemsForDay(day);
                        return (
                            <div
                                key={day.toString()}
                                className={`
                                    border-b border-r p-2 min-h-[100px] relative transition-colors hover:bg-accent/10
                                    ${!isSameMonth(day, currentDate) ? 'bg-muted/30 text-muted-foreground' : ''}
                                    ${isToday(day) ? 'bg-primary/5' : ''}
                                    ${(dayIdx + 1) % 7 === 0 ? 'border-r-0' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-primary text-primary-foreground' : ''}`}>
                                        {format(day, 'd')}
                                    </span>
                                </div>

                                <div className="mt-2 space-y-1 overflow-y-auto max-h-[120px] custom-scrollbar">
                                    {items.map((item: any) => (
                                        <div
                                            key={`${item.type}-${item.id}`}
                                            className={`
                                                text-xs p-1.5 rounded truncate font-medium border flex items-center gap-1.5
                                                ${item.type === 'CAMPAIGN'
                                                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                    : getTaskColor(item.taskType)}
                                            `}
                                            title={item.title}
                                        >
                                            {item.type === 'CAMPAIGN' && (
                                                <span>{item.isStart ? '🚩' : '🏁'}</span>
                                            )}
                                            {item.type === 'TASK' && (
                                                <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'COMPLETED' ? 'bg-emerald-500' :
                                                        item.priority === 'URGENT' ? 'bg-red-500' : 'bg-current'
                                                    }`} />
                                            )}
                                            <span className="truncate">{item.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CalendarView;
