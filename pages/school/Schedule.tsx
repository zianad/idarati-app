

import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { useLanguage } from '../../hooks/useLanguage.ts';
import { useToast } from '../../hooks/useToast.ts';
import { ScheduledSession } from '../../types/index.ts';
import { Save, PlusCircle, X, Copy } from 'lucide-react';
import Modal from '../../components/Modal.tsx';

// --- Constants and Helpers ---
const DAYS_OF_WEEK = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const TIME_GRID_INTERVAL = 30; // minutes
const DURATION_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 210, 240];
const generateId = () => `ss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const GRANULAR_TIME_SLOTS = Array.from({ length: (23 - 8) * (60 / TIME_GRID_INTERVAL) }, (_, i) => {
    const totalMinutes = 8 * 60 + i * TIME_GRID_INTERVAL;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

const SUBJECT_COLORS = ['#fecaca', '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fed7aa', '#fbcfe8', '#a7f3d0', '#bae6fd', '#ddd6fe', '#fde68a', '#fecdd3'];
const SUBJECT_TEXT_COLORS = ['#b91c1c', '#a16207', '#166534', '#1d4ed8', '#7e22ce', '#b45309', '#9d174d', '#047857', '#0369a1', '#6d28d9', '#92400e', '#be123c'];

const COURSE_COLORS = ['#c7d2fe', '#f5d0fe', '#a5f3fc', '#fef9c3', '#dcfce7', '#fce7f3'];
const COURSE_TEXT_COLORS = ['#4338ca', '#86198f', '#0e7490', '#713f12', '#166534', '#9d174d'];

const stringToHash = (str: string) => { let hash = 0; for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); } return hash; };
const getColor = (name: string, isCourse: boolean) => {
    if (!name) return { bg: '#e5e7eb', text: '#1f2937' };
    const hash = Math.abs(stringToHash(name));
    if (isCourse) {
        const index = hash % COURSE_COLORS.length;
        return { bg: COURSE_COLORS[index], text: COURSE_TEXT_COLORS[index] };
    }
    const index = hash % SUBJECT_COLORS.length;
    return { bg: SUBJECT_COLORS[index], text: SUBJECT_TEXT_COLORS[index] };
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
        entityType: 'subject' as 'subject' | 'course',
        entityId: '',
        day: DAYS_OF_WEEK[0],
        timeSlot: GRANULAR_TIME_SLOTS[0],
        classroom: '',
        duration: 60,
        levelId: '',
    });
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
    
    useEffect(() => {
        if (school) {
            setSessions(school.scheduledSessions || []);
        }
        setIsDirty(false);
    }, [school?.id, school?.scheduledSessions]);

    const scheduleGrid = useMemo(() => {
        const grid: { [time: string]: { [day: string]: (ScheduledSession | 'spanned')[] } } = {};
        GRANULAR_TIME_SLOTS.forEach(time => {
            grid[time] = {};
            DAYS_OF_WEEK.forEach(day => { grid[time][day] = []; });
        });

        sessions.forEach(session => {
            if (grid[session.timeSlot]?.[session.day]) {
                grid[session.timeSlot][session.day].push(session);

                const durationInSlots = Math.ceil((session.duration || TIME_GRID_INTERVAL) / TIME_GRID_INTERVAL);
                if (durationInSlots > 1) {
                    const startTimeIndex = GRANULAR_TIME_SLOTS.indexOf(session.timeSlot);
                    for (let i = 1; i < durationInSlots; i++) {
                        const nextSlotIndex = startTimeIndex + i;
                        if (nextSlotIndex < GRANULAR_TIME_SLOTS.length) {
                            const nextSlotTime = GRANULAR_TIME_SLOTS[nextSlotIndex];
                            grid[nextSlotTime][session.day].push('spanned');
                        }
                    }
                }
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
        if (school) {
            const firstLevel = school.levels[0];
            const initialLevelId = firstLevel?.id || '';
            const firstSubject = initialLevelId ? school.subjects.find(s => s.levelId === initialLevelId) : school.subjects[0];
            const firstCourse = school.courses[0];
            const initialEntityType = firstSubject ? 'subject' : (firstCourse ? 'course' : 'subject');
            const initialEntityId = initialEntityType === 'subject' ? (firstSubject?.id || '') : (firstCourse?.id || '');
            
            let initialClassroom = '';
            if (initialEntityType === 'subject' && firstSubject) {
                initialClassroom = firstSubject.classroom;
            }

            setNewSessionData({
                entityType: initialEntityType,
                entityId: initialEntityId,
                day: DAYS_OF_WEEK[0],
                timeSlot: GRANULAR_TIME_SLOTS[0],
                classroom: initialClassroom,
                duration: 60,
                levelId: initialLevelId,
            });
        }
        setIsScheduleModalOpen(true);
    };
    
    const handleCloseScheduleModal = () => setIsScheduleModalOpen(false);
    
    const handleNewSessionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumber = e.target.type === 'number'
        
        setNewSessionData(prev => {
            const newState = {...prev, [name]: isNumber ? Number(value) : value};
            if(name === 'entityType'){
                newState.entityId = '';
                newState.classroom = '';
                newState.levelId = school?.levels[0]?.id || '';
            } else if (name === 'levelId') {
                newState.entityId = ''; // Reset subject when level changes
            } else if (name === 'entityId') {
                if (newState.entityType === 'subject') {
                    const subject = school?.subjects.find(s => s.id === value);
                    newState.classroom = subject?.classroom || '';
                } else {
                    newState.classroom = ''; // Reset classroom for courses
                }
            }
            return newState;
        });
    };
    
    const handleScheduleSession = (e: React.FormEvent) => {
        e.preventDefault();
        const { entityId, day, timeSlot, classroom, entityType, duration } = newSessionData;
        if (!school || !entityId || !day || !timeSlot || !classroom) {
            showToast(t('fillAllFields'), 'error');
            return;
        }
        const newSession: ScheduledSession = { 
            id: generateId(), 
            day, 
            timeSlot, 
            classroom,
            duration,
            ...(entityType === 'subject' ? { subjectId: entityId } : { courseId: entityId })
        };
        setSessions(prev => [...prev, newSession]);
        setIsDirty(true);
        handleCloseScheduleModal();
        showToast(t('addSuccess'), 'success');
    };

    const handleDuplicateSession = (sessionId: string) => {
        const sessionToDuplicate = sessions.find(s => s.id === sessionId);
        if (sessionToDuplicate) {
            const newSession = { ...sessionToDuplicate, id: generateId() };
            setSessions(prev => [...prev, newSession]);
            setIsDirty(true);
            showToast(t('addSuccess'), 'success');
        }
    };

    const openDeleteConfirmation = (sessionId: string) => setSessionToDelete(sessionId);
    const closeDeleteConfirmation = () => setSessionToDelete(null);
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
                        {GRANULAR_TIME_SLOTS.map((time, timeIndex) => (
                            <tr key={time}>
                                {timeIndex % 2 === 0 && (
                                     <td rowSpan={2} className="p-3 font-mono text-base text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 align-middle">
                                        {time}
                                    </td>
                                )}
                                {DAYS_OF_WEEK.map(day => {
                                    const cellContent = scheduleGrid[time]?.[day] || [];
                                    if(cellContent.includes('spanned')) return null;

                                    const sessionsInCell = cellContent.filter(c => c !== 'spanned') as ScheduledSession[];
                                    
                                    if (sessionsInCell.length === 0) {
                                        return (
                                            <td key={`${day}_${time}`}
                                                className="p-1 border border-gray-200 dark:border-gray-600 align-top transition-colors h-10"
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, day, time)}
                                            />
                                        );
                                    }

                                    const maxDurationInSlots = Math.max(1, ...sessionsInCell.map(s => Math.ceil((s.duration || TIME_GRID_INTERVAL) / TIME_GRID_INTERVAL)));

                                    return (
                                        <td key={`${day}_${time}`}
                                            className="p-1 border border-gray-200 dark:border-gray-600 align-top transition-colors"
                                            rowSpan={maxDurationInSlots}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, day, time)}
                                        >
                                            <div className="flex flex-col md:flex-row gap-1 h-full">
                                                {sessionsInCell.map(session => {
                                                    const subject = session.subjectId ? school.subjects.find(s => s.id === session.subjectId) : null;
                                                    const course = session.courseId ? school.courses.find(c => c.id === session.courseId) : null;
                                                    const entity = subject || course;
                                                    if (!entity) return <div key={session.id} className="flex-1" />;

                                                    const isCourse = !!course;
                                                    const level = subject ? school.levels.find(l => l.id === subject.levelId) : null;
                                                    const teacher = isCourse
                                                        ? school.teachers.find(t => t.courseIds?.includes(entity.id))
                                                        : school.teachers.find(t => t.subjects.includes(entity.id));
                                                    
                                                    const { bg, text } = getColor(entity.name, isCourse);
                                                    const cardClasses = `relative p-2 rounded-lg text-xs shadow-md flex flex-col justify-center items-center cursor-move select-none h-full flex-1 min-w-0 ${isCourse ? 'border-2 border-dashed' : ''}`;

                                                    return (
                                                        <div
                                                            key={session.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, session)}
                                                            onDragEnd={handleDragEnd}
                                                            style={{ backgroundColor: bg, color: text, borderColor: text }}
                                                            className={cardClasses}
                                                        >
                                                            <div className="absolute top-1.5 right-1.5 rtl:right-auto rtl:left-1.5 z-10 flex gap-1">
                                                                <button onClick={() => handleDuplicateSession(session.id)} onMouseDown={(e) => e.stopPropagation()} className="p-1 rounded-full bg-black/10 hover:bg-black/30 transition-colors" title={t('add')}>
                                                                    <Copy size={12} className="text-inherit opacity-70" />
                                                                </button>
                                                                <button onClick={() => openDeleteConfirmation(session.id)} onMouseDown={(e) => e.stopPropagation()} className="p-1 rounded-full bg-black/10 hover:bg-black/30 transition-colors" title={t('delete')}>
                                                                    <X size={12} className="text-inherit opacity-70" />
                                                                </button>
                                                            </div>
                                                            <p className="font-bold text-sm md:text-base text-center">{entity.name}</p>
                                                            {level && <p className="opacity-90 font-semibold">{level.name}</p>}
                                                            <div className="mt-1 opacity-80 text-center space-y-0.5">
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
                        <label className={labelClass}>{t('subject')}</label>
                        <select name="entityType" value={newSessionData.entityType} onChange={handleNewSessionChange} required className={inputClass}>
                            <option value="subject">{t('subject')}</option>
                            <option value="course">{t('trainingCourses')}</option>
                        </select>
                    </div>

                    {newSessionData.entityType === 'subject' && (
                        <div>
                            <label className={labelClass}>{t('level')}</label>
                            <select name="levelId" value={newSessionData.levelId} onChange={handleNewSessionChange} required className={inputClass}>
                                <option value="" disabled>-- {t('selectLevel')} --</option>
                                {school.levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                    )}
                    
                    <div>
                        <label className={labelClass}>{newSessionData.entityType === 'subject' ? t('selectSubject') : t('selectCourse')}</label>
                        <select name="entityId" value={newSessionData.entityId} onChange={handleNewSessionChange} required className={inputClass}>
                             <option value="" disabled>-- {newSessionData.entityType === 'subject' ? t('selectSubject') : t('selectCourse')} --</option>
                            {newSessionData.entityType === 'subject' 
                                ? school.subjects.filter(s => s.levelId === newSessionData.levelId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                                : school.courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                            }
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>{t('selectDay')}</label>
                            <select name="day" value={newSessionData.day} onChange={handleNewSessionChange} required className={inputClass}>
                                {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{t(day as any)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>{t('selectTime')}</label>
                            <select name="timeSlot" value={newSessionData.timeSlot} onChange={handleNewSessionChange} required className={inputClass}>
                                {GRANULAR_TIME_SLOTS.map(time => <option key={time} value={time}>{time}</option>)}
                            </select>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>{t('classroom')}</label>
                            <input type="text" name="classroom" value={newSessionData.classroom} onChange={handleNewSessionChange} required className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('duration')}</label>
                            <select name="duration" value={newSessionData.duration} onChange={handleNewSessionChange} required className={inputClass}>
                                {DURATION_OPTIONS.map(d => (
                                    <option key={d} value={d}>{d} {t('minutes')}</option>
                                ))}
                            </select>
                        </div>
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