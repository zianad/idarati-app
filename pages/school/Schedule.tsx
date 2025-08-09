

import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { useLanguage } from '../../hooks/useLanguage.ts';
import { useToast } from '../../hooks/useToast.ts';
import { ScheduledSession, Subject, Course } from '../../types/index.ts';
import { Save, PlusCircle, X, Copy, Edit } from 'lucide-react';
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

const PREDEFINED_COLORS = [
  '#fecaca', '#fed7aa', '#fef08a', '#d9f99d', '#bbf7d0', '#a7f3d0', '#99f6e4',
  '#a5f3fc', '#bae6fd', '#bfdbfe', '#c7d2fe', '#ddd6fe', '#e9d5ff', '#f5d0fe', '#fbcfe8'
];

const stringToHash = (str: string) => { let hash = 0; for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); } return hash; };

const getContrastYIQ = (hexcolor: string) => {
	if (hexcolor.startsWith('#')) {
        hexcolor = hexcolor.substring(1);
    }
	const r = parseInt(hexcolor.substr(0,2),16);
	const g = parseInt(hexcolor.substr(2,2),16);
	const b = parseInt(hexcolor.substr(4,2),16);
	const yiq = ((r*299)+(g*587)+(b*114))/1000;
	return (yiq >= 128) ? '#1f2937' : 'white';
}


const getColor = (entity: Subject | Course | null) => {
    if (!entity) return { bg: '#e5e7eb', text: '#1f2937' };
    
    const bgColor = entity.color || PREDEFINED_COLORS[Math.abs(stringToHash(entity.id)) % PREDEFINED_COLORS.length];
    const textColor = getContrastYIQ(bgColor);
    
    return { bg: bgColor, text: textColor };
};

const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [hour, minute] = time.split(':').map(Number);
    return (hour - 8) * 60 + minute;
};

type EnrichedSession = ScheduledSession & { start: number; end: number };

const findOverlappingGroup = (startSession: EnrichedSession, allSessions: EnrichedSession[]): EnrichedSession[] => {
    const group = new Set<EnrichedSession>([startSession]);
    const toProcess = [startSession];
    const processed = new Set<string>([startSession.id]);

    while (toProcess.length > 0) {
        const current = toProcess.pop()!;
        
        allSessions.forEach(other => {
            if (current.id !== other.id && current.start < other.end && current.end > other.start) {
                if (!processed.has(other.id)) {
                    processed.add(other.id);
                    group.add(other);
                    toProcess.push(other);
                }
            }
        });
    }
    return Array.from(group);
};

const layoutGroup = (group: EnrichedSession[]): { maxColumns: number, sessionColumns: Map<string, number> } => {
    group.sort((a, b) => a.start - b.start);
    const columns: EnrichedSession[][] = [];
    const sessionColumns = new Map<string, number>();

    for (const session of group) {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
            const lastInColumn = columns[i][columns[i].length - 1];
            if (session.start >= lastInColumn.end) {
                columns[i].push(session);
                sessionColumns.set(session.id, i);
                placed = true;
                break;
            }
        }
        if (!placed) {
            const newColIndex = columns.length;
            columns.push([session]);
            sessionColumns.set(session.id, newColIndex);
        }
    }
    return { maxColumns: columns.length, sessionColumns };
};


// --- Main Component ---
const Schedule: React.FC = () => {
    const { currentUser, findSchool, updateSchedule } = useAppContext();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const school = useMemo(() => currentUser?.schoolId ? findSchool(currentUser.schoolId) : undefined, [currentUser, findSchool]);

    const [sessions, setSessions] = useState<ScheduledSession[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    
    const [sessionModalState, setSessionModalState] = useState<{
        isOpen: boolean;
        mode: 'add' | 'edit';
        session?: ScheduledSession;
    }>({ isOpen: false, mode: 'add' });
    
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
    
    const minuteToPx = (40 / TIME_GRID_INTERVAL);

    const laidOutSessions = useMemo(() => {
        if (!school) return new Map();

        const sessionLayoutMap = new Map<string, { top: number; left: number; width: number; height: number; }>();
        
        DAYS_OF_WEEK.forEach(day => {
            const daySessions = (sessions || [])
                .filter(s => s.day === day)
                .map(s => ({
                    ...s,
                    start: timeToMinutes(s.timeSlot),
                    end: timeToMinutes(s.timeSlot) + s.duration,
                }));

            const processedSessions = new Set<string>();

            for (const session of daySessions) {
                if (processedSessions.has(session.id)) continue;

                const group = findOverlappingGroup(session, daySessions);
                group.forEach(s => processedSessions.add(s.id));

                const { maxColumns, sessionColumns } = layoutGroup(group);

                group.forEach(s => {
                    const colIndex = sessionColumns.get(s.id)!;
                    const width = 100 / maxColumns;
                    sessionLayoutMap.set(s.id, {
                        top: s.start * minuteToPx,
                        height: s.duration * minuteToPx,
                        left: colIndex * width,
                        width: maxColumns > 1 ? width - 0.5 : width,
                    });
                });
            }
        });
        return sessionLayoutMap;
    }, [sessions, school, minuteToPx]);


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
        setSessionModalState({ isOpen: true, mode: 'add' });
    };

    const handleOpenEditModal = (session: ScheduledSession) => {
        if (!school) return;
        const entityType = session.subjectId ? 'subject' : 'course';
        const entityId = session.subjectId || session.courseId || '';
        
        let levelId = '';
        if (entityType === 'subject' && session.subjectId) {
            const subject = school.subjects.find(s => s.id === session.subjectId);
            levelId = subject?.levelId || '';
        }

        setNewSessionData({
            entityType,
            entityId,
            day: session.day,
            timeSlot: session.timeSlot,
            classroom: session.classroom,
            duration: session.duration,
            levelId,
        });
        setSessionModalState({ isOpen: true, mode: 'edit', session });
    };
    
    const handleCloseScheduleModal = () => setSessionModalState({ isOpen: false, mode: 'add' });
    
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
    
    const handleSessionFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { entityId, day, timeSlot, classroom, entityType, duration } = newSessionData;
        if (!school || !entityId || !day || !timeSlot || !classroom) {
            showToast(t('fillAllFields'), 'error');
            return;
        }
        
        const { mode, session: sessionToEdit } = sessionModalState;
    
        if (mode === 'edit' && sessionToEdit) {
            const updatedSession: ScheduledSession = {
                ...sessionToEdit,
                day,
                timeSlot,
                classroom,
                duration,
            };
            if (entityType === 'subject') {
                updatedSession.subjectId = entityId;
                delete updatedSession.courseId;
            } else { // 'course'
                updatedSession.courseId = entityId;
                delete updatedSession.subjectId;
            }
    
            setSessions(prev => prev.map(s => s.id === sessionToEdit.id ? updatedSession : s));
            showToast(t('editSuccess'), 'success');
        } else { // mode === 'add'
            const newSession: ScheduledSession = { 
                id: generateId(), 
                day, 
                timeSlot, 
                classroom,
                duration,
                ...(entityType === 'subject' ? { subjectId: entityId } : { courseId: entityId })
            };
            setSessions(prev => [...prev, newSession]);
            showToast(t('addSuccess'), 'success');
        }
        
        setIsDirty(true);
        handleCloseScheduleModal();
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
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.currentTarget.classList.add('drop-target-active'); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => e.currentTarget.classList.remove('drop-target-active');

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, day: string, timeSlot: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drop-target-active');
        e.stopPropagation(); 
        const draggedSessionId = e.dataTransfer.getData('sessionId');
        const draggedSession = sessions.find(s => s.id === draggedSessionId);
        if (!draggedSession || (draggedSession.day === day && draggedSession.timeSlot === timeSlot)) return;

        setSessions(sessions.map(s => s.id === draggedSessionId ? { ...s, day, timeSlot } : s));
        setIsDirty(true);
    };

    if (!school) return <div>Loading...</div>;

    const inputClass = "mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 border dark:border-gray-600";
    const labelClass = "block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2";
    const gridBorderColor = "border-gray-200 dark:border-gray-700";

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
                <table className="w-full min-w-[1200px] border-collapse text-center table-fixed">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                            <th className={`p-4 text-lg font-semibold text-gray-600 dark:text-gray-300 border ${gridBorderColor} w-32`}>{t('time')}</th>
                            {DAYS_OF_WEEK.map(day => (
                                <th key={day} className={`p-4 text-lg font-semibold text-gray-600 dark:text-gray-300 border ${gridBorderColor}`}>{t(day as any)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className={`p-0 align-top border ${gridBorderColor} bg-gray-50 dark:bg-gray-700/50`}>
                                {GRANULAR_TIME_SLOTS.map((time, timeIndex) =>
                                    (timeIndex % 2 === 0) && (
                                        <div key={time} className="h-20 text-center relative -top-3 font-mono text-xs md:text-base text-gray-700 dark:text-gray-400 flex items-center justify-center">
                                            <span>{time}</span>
                                        </div>
                                    )
                                )}
                            </td>
                            {DAYS_OF_WEEK.map(day => (
                                <td key={day} className={`border ${gridBorderColor} p-0 relative`}>
                                    {/* Background grid lines for dropping */}
                                    {GRANULAR_TIME_SLOTS.map((time) => (
                                        <div key={time}
                                            className="h-10 border-b dark:border-gray-700/50"
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, day, time)}
                                        ></div>
                                    ))}

                                    {/* Absolutely positioned sessions */}
                                    {sessions
                                        .filter(s => s.day === day)
                                        .map(session => {
                                            const layout = laidOutSessions.get(session.id);
                                            if (!layout) return null;

                                            const subject = session.subjectId ? school.subjects.find(s => s.id === session.subjectId) : null;
                                            const course = session.courseId ? school.courses.find(c => c.id === session.courseId) : null;
                                            const entity = subject || course;
                                            if (!entity) return null;

                                            const isCourse = !!course;
                                            const level = subject ? school.levels.find(l => l.id === subject.levelId) : null;
                                            const teacher = isCourse
                                                ? school.teachers.find(t => t.courseIds?.includes(entity.id))
                                                : school.teachers.find(t => t.subjects.includes(entity.id));
                                            
                                            const { bg, text } = getColor(entity);

                                            const cardStyle: React.CSSProperties = {
                                                position: 'absolute',
                                                top: `${layout.top}px`,
                                                left: `${layout.left}%`,
                                                width: `${layout.width}%`,
                                                height: `${layout.height}px`,
                                                backgroundColor: bg,
                                                color: text,
                                                borderColor: text,
                                            };

                                            return (
                                                <div
                                                    key={session.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, session)}
                                                    onDragEnd={handleDragEnd}
                                                    style={cardStyle}
                                                    className={`rounded-lg text-xs shadow-md flex flex-col cursor-move select-none overflow-hidden p-1 transition-all duration-200 ease-in-out ${isCourse ? 'border-2 border-dashed' : 'border'}`}
                                                >
                                                    <div className="absolute top-1 right-1 rtl:right-auto rtl:left-1 z-10 flex gap-0.5">
                                                        <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(session); }} onMouseDown={(e) => e.stopPropagation()} className="p-1 rounded-full bg-black/10 hover:bg-black/30 transition-colors" title={t('edit')}>
                                                            <Edit size={12} className="text-inherit opacity-70" />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDuplicateSession(session.id); }} onMouseDown={(e) => e.stopPropagation()} className="p-1 rounded-full bg-black/10 hover:bg-black/30 transition-colors" title={t('add')}>
                                                            <Copy size={12} className="text-inherit opacity-70" />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); openDeleteConfirmation(session.id); }} onMouseDown={(e) => e.stopPropagation()} className="p-1 rounded-full bg-black/10 hover:bg-black/30 transition-colors" title={t('delete')}>
                                                            <X size={12} className="text-inherit opacity-70" />
                                                        </button>
                                                    </div>
                                                    <div className="flex-1 flex flex-col justify-center items-center w-full text-center overflow-hidden">
                                                        <p className="font-bold text-[13px] leading-tight break-words">{entity.name}</p>
                                                        {level && <p className="opacity-90 font-semibold text-[11px]">{level.name}</p>}
                                                        <div className="mt-1 opacity-80 space-y-0.5 text-[10px]">
                                                            <p>{t('classroom')}: {session.classroom}</p>
                                                            {teacher && <p>{teacher.name}</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>

            <Modal isOpen={sessionModalState.isOpen} onClose={handleCloseScheduleModal} title={sessionModalState.mode === 'edit' ? t('editSession') : t('scheduleSession')}>
                <form onSubmit={handleSessionFormSubmit} className="space-y-4">
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
                            className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={confirmDeleteSession}
                            className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
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