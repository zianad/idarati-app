import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { useLanguage } from '../../hooks/useLanguage.ts';
import { useToast } from '../../hooks/useToast.ts';
import { Subject, Teacher, ScheduledSession, Level } from '../../types/index.ts';
import { Save, PlusCircle, X } from 'lucide-react';
import Modal from '../../components/Modal.tsx';

const TIME_SLOTS = [
    '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
    '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00',
    '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00', '20:00 - 21:00',
    '21:00 - 22:00', '22:00 - 23:00'
];
const DAYS_OF_WEEK = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
const generateId = () => `ss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// --- Color Utility ---
const PREDEFINED_COLORS = ['#fecaca', '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fed7aa', '#fbcfe8', '#a7f3d0', '#bae6fd', '#ddd6fe', '#fde68a', '#fecdd3'];
const DARK_TEXT_COLORS = ['#b91c1c', '#a16207', '#166534', '#1d4ed8', '#7e22ce', '#b45309', '#9d174d', '#047857', '#0369a1', '#6d28d9', '#92400e', '#be123c'];
const stringToHash = (str: string) => { let hash = 0; for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); } return hash; };
const getColorForClassroom = (classroom: string) => {
    if (!classroom) return { bg: '#e5e7eb', text: '#1f2937' };
    const index = Math.abs(stringToHash(classroom)) % PREDEFINED_COLORS.length;
    return { bg: PREDEFINED_COLORS[index], text: DARK_TEXT_COLORS[index] };
};

// --- Initial Schedule Generation ---
const initializeSchedule = (subjects: Subject[], teachers: Teacher[]): ScheduledSession[] => {
    const newSessions: ScheduledSession[] = [];
    const occupiedSlots: { [key: string]: boolean } = {}; // key: `day_time_classroom` or `day_time_teacherId`

    subjects.forEach(subject => {
        const weeklySessions = Math.ceil((subject.sessionsPerMonth || 0) / 4);
        const subjectTeacher = teachers.find(t => t.subjects.includes(subject.id));

        for (let i = 0; i < weeklySessions; i++) {
            let placed = false;
            for (const time of TIME_SLOTS) {
                for (const day of DAYS_OF_WEEK) {
                    const classroomKey = `${day}_${time}_${subject.classroom}`;
                    const teacherKey = subjectTeacher ? `${day}_${time}_${subjectTeacher.id}` : null;
                    const isClassroomOccupied = occupiedSlots[classroomKey];
                    const isTeacherOccupied = teacherKey ? occupiedSlots[teacherKey] : false;

                    if (!isClassroomOccupied && !isTeacherOccupied) {
                        newSessions.push({ id: generateId(), subjectId: subject.id, day, timeSlot: time, classroom: subject.classroom });
                        occupiedSlots[classroomKey] = true;
                        if (teacherKey) occupiedSlots[teacherKey] = true;
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }
        }
    });
    return newSessions;
};

// --- Main Component ---
const Schedule: React.FC = () => {
    const { currentUser, findSchool, updateSchedule } = useAppContext();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const school = useMemo(() => currentUser?.schoolId ? findSchool(currentUser.schoolId) : undefined, [currentUser, findSchool]);

    const [sessions, setSessions] = useState<ScheduledSession[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [newSessionData, setNewSessionData] = useState({
        subjectId: '',
        day: DAYS_OF_WEEK[0],
        timeSlot: TIME_SLOTS[0],
        classroom: ''
    });
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
    
    useEffect(() => {
        if (school) {
            if (!school.scheduledSessions || school.scheduledSessions.length === 0) {
                const initialSessions = initializeSchedule(school.subjects, school.teachers);
                setSessions(initialSessions);
                if (initialSessions.length > 0 && currentUser?.schoolId) {
                    updateSchedule(currentUser.schoolId, initialSessions);
                }
            } else {
                setSessions(school.scheduledSessions);
            }
        }
        setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [school?.id]);

    const scheduleGrid = useMemo(() => {
        const grid: { [time: string]: { [day: string]: ScheduledSession[] } } = {};
        TIME_SLOTS.forEach(time => {
            grid[time] = {};
            DAYS_OF_WEEK.forEach(day => { grid[time][day] = []; });
        });
        sessions.forEach(session => {
            if (grid[session.timeSlot]?.[session.day]) {
                grid[session.timeSlot][session.day].push(session);
            }
        });
        return grid;
    }, [sessions]);

    const handleSave = () => {
        if (school) {
            updateSchedule(school.id, sessions);
            setIsDirty(false);
            showToast(t('scheduleUpdated'), 'success');
        }
    };
    
    const handleOpenScheduleModal = () => {
        if (school && school.subjects.length > 0) {
            const firstSubject = school.subjects[0];
            setNewSessionData({
                subjectId: firstSubject.id,
                day: DAYS_OF_WEEK[0],
                timeSlot: TIME_SLOTS[0],
                classroom: firstSubject.classroom
            });
        }
        setIsScheduleModalOpen(true);
    };
    
    const handleCloseScheduleModal = () => setIsScheduleModalOpen(false);
    
    const handleNewSessionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        if (name === 'subjectId') {
             const subject = school?.subjects.find(s => s.id === value);
             setNewSessionData(prev => ({
                 ...prev,
                 subjectId: value,
                 classroom: subject?.classroom || ''
             }));
        } else {
            setNewSessionData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleScheduleSession = (e: React.FormEvent) => {
        e.preventDefault();
        const { subjectId, day, timeSlot, classroom } = newSessionData;
        if (!school || !subjectId || !day || !timeSlot || !classroom) {
            showToast(t('fillAllFields'), 'error');
            return;
        }
        const newSession: ScheduledSession = { id: generateId(), subjectId, day, timeSlot, classroom };
        setSessions(prev => [...prev, newSession]);
        setIsDirty(true);
        handleCloseScheduleModal();
        showToast(t('addSuccess'), 'success');
    };

    const openDeleteConfirmation = (sessionId: string) => {
        setSessionToDelete(sessionId);
    };
    const closeDeleteConfirmation = () => {
        setSessionToDelete(null);
    };
    const confirmDeleteSession = () => {
        if (!sessionToDelete) return;
        setSessions(prev => prev.filter(s => s.id !== sessionToDelete));
        setIsDirty(true);
        showToast(t('deleteSuccess'), 'info');
        closeDeleteConfirmation();
    };


    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, session: ScheduledSession) => {
        e.dataTransfer.setData('sessionId', session.id);
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => e.currentTarget.classList.remove('dragging');
    const handleDragOver = (e: React.DragEvent<HTMLTableCellElement>) => { e.preventDefault(); e.currentTarget.classList.add('drop-target-active'); };
    const handleDragLeave = (e: React.DragEvent<HTMLTableCellElement>) => e.currentTarget.classList.remove('drop-target-active');

    const handleDrop = (e: React.DragEvent<HTMLTableCellElement>, day: string, timeSlot: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drop-target-active');
        const draggedSessionId = e.dataTransfer.getData('sessionId');
        const draggedSession = sessions.find(s => s.id === draggedSessionId);
        if (!draggedSession || (draggedSession.day === day && draggedSession.timeSlot === timeSlot)) return;

        setSessions(sessions.map(s => s.id === draggedSessionId ? { ...s, day, timeSlot } : s));
        setIsDirty(true);
    };

    if (!school) return <div>Loading...</div>;

    const inputClass = "mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 border dark:border-gray-600";
    const labelClass = "block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2";

    return (
        <div className="bg-white dark:bg-gray-800 p-4 md:p-8 rounded-2xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t('weeklySchedule')}</h2>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-1">{t('dragHint')}</p>
                </div>
                <div className="flex items-center gap-4">
                     <button onClick={handleOpenScheduleModal} className="flex items-center gap-2 bg-green-500 text-white font-semibold px-4 py-3 rounded-lg hover:bg-green-600 transition-colors shadow-lg">
                        <PlusCircle size={20} />
                        {t('scheduleSession')}
                    </button>
                    {isDirty && (
                        <button onClick={handleSave} className="flex items-center gap-2.5 bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl animate-pulse">
                            <Save size={20} />
                            {t('saveChanges')}
                        </button>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] border-collapse text-center">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                            <th className="p-4 text-lg font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 w-40">{t('time')}</th>
                            {DAYS_OF_WEEK.map(day => (
                                <th key={day} className="p-4 text-lg font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">{t(day as any)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {TIME_SLOTS.map(time => (
                            <tr key={time}>
                                <td className="p-3 font-mono text-base text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">{time}</td>
                                {DAYS_OF_WEEK.map(day => {
                                    const sessionsInCell = scheduleGrid[time]?.[day] || [];
                                    return (
                                        <td key={`${day}_${time}`}
                                            className="p-1.5 border border-gray-200 dark:border-gray-600 align-top h-32 transition-colors"
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, day, time)}
                                        >
                                            <div className="flex flex-row gap-1 h-full w-full">
                                                {sessionsInCell.map(session => {
                                                    const subject = school.subjects.find(s => s.id === session.subjectId);
                                                    if (!subject) return null;
                                                    const level = school.levels.find(l => l.id === subject.levelId);
                                                    const teacher = school.teachers.find(t => t.subjects.includes(subject.id));
                                                    const { bg, text } = getColorForClassroom(session.classroom || '');
                                                    return (
                                                        <div
                                                            key={session.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, session)}
                                                            onDragEnd={handleDragEnd}
                                                            style={{ backgroundColor: bg, color: text }}
                                                            className="relative p-3 rounded-lg text-sm shadow-md flex flex-col justify-center items-center cursor-move select-none flex-1 min-w-[150px]"
                                                        >
                                                            <button
                                                                onClick={() => openDeleteConfirmation(session.id)}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                onTouchStart={(e) => e.stopPropagation()}
                                                                className="absolute top-1.5 right-1.5 rtl:right-auto rtl:left-1.5 z-10 p-1 rounded-full bg-black/10 hover:bg-black/30 transition-colors"
                                                                aria-label={t('delete')}
                                                                title={t('delete')}
                                                            >
                                                                <X size={14} className="text-inherit opacity-70" />
                                                            </button>
                                                            <p className="font-bold text-base">{subject.name}</p>
                                                            {level && <p className="opacity-90 font-semibold text-xs">{level.name}</p>}
                                                            <div className="mt-1 opacity-80 text-xs text-center space-y-0.5">
                                                                <p>{t('classroom')}: {session.classroom}</p>
                                                                {teacher && <p>{teacher.name}</p>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isScheduleModalOpen} onClose={handleCloseScheduleModal} title={t('scheduleSession')}>
                <form onSubmit={handleScheduleSession} className="space-y-4">
                    <div>
                        <label className={labelClass}>{t('selectSubject')}</label>
                        <select name="subjectId" value={newSessionData.subjectId} onChange={handleNewSessionChange} required className={inputClass}>
                            {school.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>{t('selectDay')}</label>
                        <select name="day" value={newSessionData.day} onChange={handleNewSessionChange} required className={inputClass}>
                            {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{t(day as any)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>{t('selectTime')}</label>
                        <select name="timeSlot" value={newSessionData.timeSlot} onChange={handleNewSessionChange} required className={inputClass}>
                            {TIME_SLOTS.map(time => <option key={time} value={time}>{time}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>{t('classroom')}</label>
                        <input type="text" name="classroom" value={newSessionData.classroom} onChange={handleNewSessionChange} required className={inputClass} />
                    </div>
                    <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4">
                        <button type="button" onClick={handleCloseScheduleModal} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">{t('cancel')}</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{t('save')}</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={!!sessionToDelete} onClose={closeDeleteConfirmation} title={t('deleteSession')}>
                <div className="space-y-6">
                    <p className="text-lg text-gray-600 dark:text-gray-400">{t('confirmDelete')}</p>
                    <div className="flex justify-end space-x-4 rtl:space-x-reverse">
                        <button 
                            type="button" 
                            onClick={closeDeleteConfirmation} 
                            className="px-6 py-2.5 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button 
                            type="button" 
                            onClick={confirmDeleteSession} 
                            className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                        >
                            {t('delete')}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Schedule;