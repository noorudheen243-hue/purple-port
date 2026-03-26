import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import Swal from 'sweetalert2';
import { Calendar, Clock, Bell, Cake, Medal, PartyPopper } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const UserGreetingAlerter = () => {
    const { user } = useAuthStore();
    
    // Fetch all meetings to find the one coming up
    const { data: meetings = [] } = useQuery({
        queryKey: ['allMeetingsForAlert'],
        queryFn: async () => {
            const res = await api.get('/meetings/');
            return res.data;
        },
        refetchInterval: 60000, 
        enabled: !!user
    });

    useEffect(() => {
        if (!user) return;

        const now = new Date();
        const todayStr = `${now.getMonth() + 1}-${now.getDate()}`; // M-D format

        // 1. Check Birthday
        if (user.staffProfile?.date_of_birth) {
            const dob = new Date(user.staffProfile.date_of_birth);
            const dobStr = `${dob.getMonth() + 1}-${dob.getDate()}`;
            
            const sessionKey = `birthday_greeting_${user.id}_${now.getFullYear()}`;
            if (dobStr === todayStr && !sessionStorage.getItem(sessionKey)) {
                showBirthdayGreeting(user.full_name);
                sessionStorage.setItem(sessionKey, 'true');
                return; // Show one at a time to prevent overlapping
            }
        }

        // 2. Check Joining Anniversary
        if (user.staffProfile?.date_of_joining) {
            const doj = new Date(user.staffProfile.date_of_joining);
            const dojStr = `${doj.getMonth() + 1}-${doj.getDate()}`;
            const years = now.getFullYear() - doj.getFullYear();
            
            const sessionKey = `anniversary_greeting_${user.id}_${now.getFullYear()}`;
            if (dojStr === todayStr && years > 0 && !sessionStorage.getItem(sessionKey)) {
                showAnniversaryGreeting(user.full_name, years);
                sessionStorage.setItem(sessionKey, 'true');
                return;
            }
        }

        // 3. Check Upcoming Meeting (Restored logic)
        if (meetings && meetings.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of today

            const upcoming = meetings
                .filter((m: any) => {
                    const mDate = new Date(m.date);
                    // Standardize both to midnight for comparison
                    const compareDate = new Date(mDate.getFullYear(), mDate.getMonth(), mDate.getDate());
                    return compareDate >= today;
                })
                .filter((m: any) => !m.mom)
                .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

            if (upcoming) {
                const sessionKey = `meeting_alert_${upcoming.id}`;
                if (!sessionStorage.getItem(sessionKey)) {
                    showMeetingAlert(upcoming);
                    sessionStorage.setItem(sessionKey, 'true');
                }
            }
        }

    }, [user, meetings]);

    const showBirthdayGreeting = (name: string) => {
        Swal.fire({
            title: '',
            html: `
                <div style="text-align: center; font-family: 'Inter', sans-serif; padding: 20px;">
                    <div style="background: #fdf2f8; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; border: 4px solid #fce7f3;">
                        <span style="font-size: 40px;">🎂</span>
                    </div>
                    <h2 style="color: #9d174d; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">HAPPY BIRTHDAY!</h2>
                    <p style="color: #be185d; margin: 10px 0 25px; font-size: 18px; font-weight: 600;">Dear ${name}</p>
                    <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">Wishing you a wonderful day filled with joy, laughter, and everything you love. Have a fantastic celebration!</p>
                </div>
            `,
            showConfirmButton: true,
            confirmButtonText: 'Thank You! ✨',
            confirmButtonColor: '#9d174d',
            background: '#ffffff',
            backdrop: `rgba(157, 23, 77, 0.1)`,
            customClass: {
                popup: 'rounded-[32px] border-none shadow-2xl scale-up-center'
            }
        });
    };

    const showAnniversaryGreeting = (name: string, years: number) => {
        Swal.fire({
            title: '',
            html: `
                <div style="text-align: center; font-family: 'Inter', sans-serif; padding: 20px;">
                    <div style="background: #ecfeff; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; border: 4px solid #cffafe;">
                        <span style="font-size: 40px;">🎊</span>
                    </div>
                    <h2 style="color: #0e7490; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">WORK ANNIVERSARY!</h2>
                    <p style="color: #0891b2; margin: 10px 0 25px; font-size: 18px; font-weight: 600;">Congratulations on ${years} ${years === 1 ? 'Year' : 'Years'}!</p>
                    <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">Thank you for your incredible contribution to the team. We are proud to have you with us, ${name}!</p>
                </div>
            `,
            showConfirmButton: true,
            confirmButtonText: 'Cheers! 🥂',
            confirmButtonColor: '#0e7490',
            background: '#ffffff',
            backdrop: `rgba(14, 116, 144, 0.1)`,
            customClass: {
                popup: 'rounded-[32px] border-none shadow-2xl'
            }
        });
    };

    const showMeetingAlert = (upcoming: any) => {
        const meetingDate = new Date(upcoming.date).toLocaleDateString('en-GB', { 
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' 
        });

        Swal.fire({
            title: '',
            html: `
                <div style="text-align: center; font-family: 'Inter', sans-serif; padding: 10px;">
                    <div style="background: #f3e8ff; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    </div>
                    <h3 style="color: #581c87; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">UPCOMING MEETING SCHEDULED</h3>
                    <p style="color: #6b7280; margin: 10px 0 25px; font-size: 14px;">A new meeting has been scheduled for the team.</p>
                    
                    <div style="background: #ffffff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 18px; text-align: left; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                        <div style="font-weight: 700; color: #1f2937; font-size: 17px; margin-bottom: 12px; border-bottom: 2px solid #f3f4f6; pb: 8px;">${upcoming.title}</div>
                        
                        <div style="display: flex; align-items: center; gap: 8px; color: #4b5563; font-size: 14px; margin-bottom: 8px;">
                            <span style="display: inline-flex; width: 20px; color: #7e22ce;">📅</span>
                            <span>${meetingDate}</span>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 8px; color: #4b5563; font-size: 14px; margin-bottom: 8px;">
                            <span style="display: inline-flex; width: 20px; color: #7e22ce;">⏰</span>
                            <span>${upcoming.time} (${upcoming.duration} Minutes)</span>
                        </div>

                        ${upcoming.type ? `
                        <div style="display: flex; align-items: center; gap: 8px; color: #4b5563; font-size: 14px;">
                            <span style="display: inline-flex; width: 20px; color: #7e22ce;">📌</span>
                            <span style="background: #faf5ff; color: #7e22ce; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; border: 1px solid #e9d5ff;">${upcoming.type}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `,
            showConfirmButton: true,
            confirmButtonText: 'Got it!',
            confirmButtonColor: '#7e22ce',
            padding: '2rem',
            width: '450px',
            background: '#fafafa',
            customClass: {
                popup: 'rounded-3xl border-none shadow-2xl overflow-hidden'
            }
        });
    }

    return null;
};

export default UserGreetingAlerter;
