
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { useLanguage } from '../../hooks/useLanguage.ts';
import { useToast } from '../../hooks/useToast.ts';
import Modal from '../../components/Modal.tsx';
import { PlusCircle, Trash2, Edit, MinusCircle } from 'lucide-react';
import { UserRole, Subject, Course } from '../../types/index.ts';

type ModalState = { type: 'course' | 'subject'; mode: 'add' | 'edit'; data?: Course | Subject } | null;

const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = (i % 2) * 30;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

const DAYS_OF_WEEK = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DURATION_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 210, 240];


const SubjectItem: React.FC<{ subject: Subject, onEdit: () => void, onDelete: () => void, isOwner: boolean }> = ({ subject, onEdit, onDelete, isOwner }) => {
    const { currentUser, findSchool } = useAppContext();
    const { t } = useLanguage();
    const school = useMemo(() => currentUser?.schoolId ? findSchool(currentUser.schoolId) : undefined, [currentUser, findSchool]);

    const scheduledClassrooms = useMemo(() => {
        if (!school?.scheduledSessions) return [];
        const classroomsForSubject = school.scheduledSessions
            .filter(s => s.subjectId === subject.id)
            .map(s => s.classroom);
        return [...new Set(classroomsForSubject)];
    }, [school?.scheduledSessions, subject.id]);
    
    const level = useMemo(() => {
        if (!school?.levels || !subject.levelId) return null;
        return school.levels.find(l => l.id === subject.levelId);
    }, [school?.levels, subject.levelId]);

    const btnClass = "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors";

    return (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-4" style={{borderLeftColor: subject.color || 'transparent'}}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">{subject.name}</p>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-x-2">
                        <span className="font-semibold text-yellow-600 dark:text-yellow-400">{subject.fee || 0} MAD</span>
                        <span>|</span>
                        <span>{subject.sessionsPerMonth} {t('sessionsPerMonth')}</span>
                        {level && (
                            <>
                                <span>|</span>
                                <span>{t('level')}: {level.name}</span>
                            </>
                        )}
                        <span>|</span>
                        {scheduledClassrooms.length > 0 ? (
                             <span className="text-blue-600 dark:text-blue-400 font-semibold">{t('scheduledIn')}: {scheduledClassrooms.join(', ')}</span>
                        ) : (
                             <span>{t('classroom')}: {subject.classroom} ({t('default')})</span>
                        )}
                    </div>
                </div>
                {isOwner && 
                    <div className="flex gap-1">
                        <button onClick={onEdit} className={btnClass}><Edit size={18} /></button>
                        <button onClick={onDelete} className={btnClass + " text-red-500 hover:text-red-700"}><Trash2 size={18} /></button>
                    </div>
                }
            </div>
        </div>
    );
}


const SubjectsAndCourses: React.FC = () => {
    const { currentUser, findSchool, addCourse, addSubject, updateSubject, deleteCourse, deleteSubject, updateCourse } = useAppContext();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const school = useMemo(() => currentUser?.schoolId ? findSchool(currentUser.schoolId) : undefined, [currentUser, findSchool]);
    
    const [modalState, setModalState] = useState<ModalState>(null);
    
    const initialCourseData = {
        id: '',
        name: '',
        fee: 0,
        teacherIds: [] as string[],
        sessions: [] as {day: string, timeSlot: string, classroom: string, duration: number}[],
        color: '#fef9c3',
    };
    const [courseFormData, setCourseFormData] = useState(initialCourseData);
    
    // Form state for Subject
    const initialSubjectData = {
        id: '',
        name: '',
        fee: 0,
        sessionsPerMonth: 4,
        classroom: '',
        levelId: '',
        sessions: [] as {day: string, timeSlot: string, classroom: string, duration: number}[],
        color: '#dbeafe',
    };
    const [subjectFormData, setSubjectFormData] = useState(initialSubjectData);

    const isOwner = currentUser?.role === UserRole.SchoolOwner;

    useEffect(() => {
        if (modalState?.mode === 'edit' && modalState.data) {
           if (modalState.type === 'subject') {
                const subject = modalState.data as Subject;
                setSubjectFormData({
                    id: subject.id,
                    name: subject.name,
                    fee: subject.fee,
                    sessionsPerMonth: subject.sessionsPerMonth,
                    classroom: subject.classroom,
                    levelId: subject.levelId || '',
                    sessions: [],
                    color: subject.color || '#dbeafe',
                });
           } else if (modalState.type === 'course') {
                const course = modalState.data as Course;
                setCourseFormData({
                    id: course.id,
                    name: course.name,
                    fee: course.fee,
                    teacherIds: course.teacherIds || [],
                    sessions: [],
                    color: course.color || '#fef9c3',
                });
           }
        } else {
            // Reset forms for 'add' mode
            setSubjectFormData({...initialSubjectData, levelId: school?.levels[0]?.id || '', sessions: []});
            setCourseFormData(initialCourseData);
        }
    }, [modalState, school?.levels]);

    const handleCourseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.schoolId || !courseFormData.name) return;
        
        const courseData = { name: courseFormData.name, fee: courseFormData.fee, teacherIds: courseFormData.teacherIds, color: courseFormData.color };

        if (modalState?.mode === 'edit' && courseFormData.id) {
            updateCourse(currentUser.schoolId, { id: courseFormData.id, ...courseData });
            showToast(t('editSuccess'), 'success');
        } else {
            const sessionData = courseFormData.sessions.filter(s => s.day && s.timeSlot && s.classroom);
            addCourse(currentUser.schoolId, courseData, sessionData.length > 0 ? sessionData : undefined);
            showToast(t('addSuccess'), 'success');
        }
        setModalState(null);
    };

    const handleSubjectFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumber = e.target.type === 'number';
        setSubjectFormData(prev => ({
            ...prev,
            [name]: isNumber ? Number(value) : value,
        }));
    };
    
    const handleSubjectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.schoolId || !subjectFormData.name || !subjectFormData.classroom || !subjectFormData.levelId) return;
        
        const subjectData = { 
            name: subjectFormData.name, 
            fee: subjectFormData.fee, 
            sessionsPerMonth: subjectFormData.sessionsPerMonth, 
            classroom: subjectFormData.classroom,
            levelId: subjectFormData.levelId,
            color: subjectFormData.color,
        };

        if (modalState?.mode === 'edit' && subjectFormData.id) {
            updateSubject(currentUser.schoolId, { id: subjectFormData.id, ...subjectData });
            showToast(t('editSuccess'), 'success');
        } else {
            const sessionData = subjectFormData.sessions.filter(s => s.day && s.timeSlot && s.classroom);
            addSubject(currentUser.schoolId, subjectData, sessionData.length > 0 ? sessionData : undefined);
            showToast(t('addSuccess'), 'success');
        }
        setModalState(null);
    };

    const handleTeacherChange = (teacherId: string) => {
        setCourseFormData(prev => ({
            ...prev,
            teacherIds: prev.teacherIds.includes(teacherId)
                ? prev.teacherIds.filter(id => id !== teacherId)
                : [...prev.teacherIds, teacherId]
        }));
    };

    const handleSessionChange = (index: number, field: string, value: string | number, formType: 'subject' | 'course') => {
        const formSetter = formType === 'subject' ? setSubjectFormData : setCourseFormData;
        formSetter(prev => {
            const newSessions = [...prev.sessions];
            newSessions[index] = {...newSessions[index], [field]: value};
            return {...prev, sessions: newSessions};
        });
    }

    const addSessionRow = (formType: 'subject' | 'course') => {
        const formSetter = formType === 'subject' ? setSubjectFormData : setCourseFormData;
        formSetter(prev => ({
            ...prev,
            sessions: [...prev.sessions, {day: '', timeSlot: '', classroom: (prev as typeof initialSubjectData).classroom || '', duration: 60}]
        }));
    }

    const removeSessionRow = (index: number, formType: 'subject' | 'course') => {
        const formSetter = formType === 'subject' ? setSubjectFormData : setCourseFormData;
        formSetter(prev => ({
            ...prev,
            sessions: prev.sessions.filter((_, i) => i !== index)
        }));
    }

    const createDeleteHandler = (deleteFunc: (schoolId: string, id: string) => void) => (id: string) => {
        if (window.confirm(t('confirmDelete')) && currentUser?.schoolId) {
            deleteFunc(currentUser.schoolId, id);
            showToast(t('deleteSuccess'), 'info');
        }
    };

    const handleDeleteCourse = createDeleteHandler(deleteCourse);
    const handleDeleteSubject = createDeleteHandler(deleteSubject);
    
    const handleOpenModal = (state: ModalState) => {
        if (!isOwner) return;
        setModalState(state);
    }

    if (!school) return <div>Loading...</div>;

    const inputClass = "block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 border dark:border-gray-600";
    const btnClass = "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors";
    const labelClass = "block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Subjects */}
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('subjects')}</h3>
                    {isOwner && <button onClick={() => handleOpenModal({ type: 'subject', mode: 'add' })} className="flex items-center space-x-2 rtl:space-x-reverse bg-blue-100 text-blue-600 px-3 py-1 rounded-md text-sm font-semibold hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900">
                        <PlusCircle size={16}/> <span>{t('addNewSubject')}</span>
                    </button>}
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {school.subjects.map(subject => (
                        <SubjectItem 
                            key={subject.id} 
                            subject={subject} 
                            onEdit={() => handleOpenModal({ type: 'subject', mode: 'edit', data: subject })} 
                            onDelete={() => handleDeleteSubject(subject.id)}
                            isOwner={isOwner}
                        />
                    ))}
                </div>
            </div>

            {/* Training Courses */}
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('trainingCourses')}</h3>
                    {isOwner && <button onClick={() => handleOpenModal({ type: 'course', mode: 'add'})} className="flex items-center space-x-2 rtl:space-x-reverse bg-blue-100 text-blue-600 px-3 py-1 rounded-md text-sm font-semibold hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900">
                        <PlusCircle size={16}/> <span>{t('addNewCourse')}</span>
                    </button>}
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {school.courses.map(course => {
                        const assignedTeachers = school.teachers
                            .filter(t => course.teacherIds?.includes(t.id))
                            .map(t => t.name)
                            .join(', ');

                        return (
                            <div key={course.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-4" style={{borderLeftColor: course.color || 'transparent'}}>
                            <div className="flex justify-between items-center">
                                    <div>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{course.name}</span>
                                        <span className="font-semibold text-green-600 dark:text-green-400 text-sm mx-2 rtl:mr-2 ltr:ml-2">{course.fee} MAD</span>
                                    </div>
                                {isOwner && 
                                    <div className="flex gap-1">
                                        <button onClick={() => handleOpenModal({ type: 'course', mode: 'edit', data: course })} className={btnClass}><Edit size={18} /></button>
                                        <button onClick={() => handleDeleteCourse(course.id)} className={btnClass + " text-red-500 hover:text-red-700"}><Trash2 size={18} /></button>
                                    </div>
                                }
                            </div>
                            {assignedTeachers && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('assignedTeachers')}: {assignedTeachers}</p>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={modalState?.type === 'course'} onClose={() => setModalState(null)} title={modalState?.mode === 'edit' ? t('edit') : t('addNewCourse')}>
                <form onSubmit={handleCourseSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className={labelClass}>{t('courseName')}</label>
                            <input type="text" value={courseFormData.name} onChange={e => setCourseFormData({...courseFormData, name: e.target.value})} required className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('courseFee')}</label>
                            <input type="number" min="0" value={courseFormData.fee} onChange={e => setCourseFormData({...courseFormData, fee: Number(e.target.value)})} required className={inputClass} />
                        </div>
                    </div>
                     <div>
                        <label className={labelClass}>{t('selectTeachers')}</label>
                        <div className="mt-2 grid grid-cols-2 gap-2 p-3 border dark:border-gray-600 rounded-lg max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-700/50">
                            {school.teachers.map(teacher => (
                                <label key={teacher.id} className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={courseFormData.teacherIds.includes(teacher.id)}
                                        onChange={() => handleTeacherChange(teacher.id)}
                                        className="form-checkbox h-5 w-5 rounded text-blue-600 focus:ring-blue-500 bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                                    />
                                    <span className="text-gray-800 dark:text-gray-200">{teacher.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                     <div>
                        <label className={labelClass}>{t('color')}</label>
                        <input type="color" value={courseFormData.color} onChange={e => setCourseFormData({...courseFormData, color: e.target.value})} className="w-full h-10 p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer" />
                    </div>
                    {modalState?.mode === 'add' && (
                        <div className="pt-4 border-t dark:border-gray-600">
                            <label className={`${labelClass} mb-2`}>{t('sessionTimeOptional')}</label>
                            <div className="space-y-3">
                                {courseFormData.sessions.map((session, index) => (
                                     <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-3">
                                            <select value={session.day} onChange={(e) => handleSessionChange(index, 'day', e.target.value, 'course')} className={inputClass}>
                                                <option value="">-- {t('selectDay')} --</option>
                                                {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{t(day as any)}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-3">
                                            <select value={session.timeSlot} onChange={(e) => handleSessionChange(index, 'timeSlot', e.target.value, 'course')} className={inputClass}>
                                                <option value="">-- {t('selectTime')} --</option>
                                                {TIME_SLOTS.map(time => <option key={time} value={time}>{time}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <select value={session.duration} onChange={(e) => handleSessionChange(index, 'duration', Number(e.target.value), 'course')} className={inputClass}>
                                                {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} {t('minutes')}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-3">
                                            <input type="text" placeholder={t('classroom')} value={session.classroom} onChange={(e) => handleSessionChange(index, 'classroom', e.target.value, 'course')} className={inputClass} />
                                        </div>
                                        <div className="col-span-1">
                                            <button type="button" onClick={() => removeSessionRow(index, 'course')} className="text-red-500 hover:text-red-700 p-2"><MinusCircle size={20}/></button>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addSessionRow('course')} className="flex items-center gap-2 text-sm text-blue-600 font-semibold hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                                    <PlusCircle size={18}/> {t('add')} {t('scheduleSession')}
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-2">
                        <button type="button" onClick={() => setModalState(null)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">{t('cancel')}</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">{t('save')}</button>
                    </div>
                </form>
            </Modal>
            <Modal isOpen={modalState?.type === 'subject'} onClose={() => setModalState(null)} title={modalState?.mode === 'edit' ? t('editSubject') : t('addNewSubject')}>
                <form onSubmit={handleSubjectSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>{t('subjectName')}</label>
                            <input type="text" name="name" value={subjectFormData.name} onChange={handleSubjectFormChange} required className={inputClass.replace('text-sm', 'text-base')} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('level')}</label>
                            <select name="levelId" value={subjectFormData.levelId} onChange={handleSubjectFormChange} required className={inputClass.replace('text-sm', 'text-base')}>
                                <option value="" disabled>-- {t('level')} --</option>
                                {school.levels.map(level => <option key={level.id} value={level.id}>{level.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>{t('subjectFee')}</label>
                            <input type="number" name="fee" value={subjectFormData.fee} onChange={handleSubjectFormChange} required min="0" className={inputClass.replace('text-sm', 'text-base')} />
                        </div>
                        <div>
                            <label className={labelClass}>{t('sessionsPerMonth')}</label>
                            <input type="number" name="sessionsPerMonth" value={subjectFormData.sessionsPerMonth} onChange={handleSubjectFormChange} required min="1" className={inputClass.replace('text-sm', 'text-base')} />
                        </div>
                         <div className="col-span-2">
                            <label className={labelClass}>{t('defaultClassroom')}</label>
                            <input type="text" name="classroom" value={subjectFormData.classroom} onChange={handleSubjectFormChange} required className={inputClass.replace('text-sm', 'text-base')} />
                        </div>
                        <div className="col-span-2">
                            <label className={labelClass}>{t('color')}</label>
                            <input type="color" name="color" value={subjectFormData.color} onChange={handleSubjectFormChange} className="w-full h-10 p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer" />
                        </div>
                    </div>

                    {modalState?.mode === 'add' && (
                        <div className="pt-4 border-t dark:border-gray-600">
                            <label className={`${labelClass} mb-2`}>{t('sessionTimeOptional')}</label>
                            <div className="space-y-3">
                                {subjectFormData.sessions.map((session, index) => (
                                     <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-3">
                                            <select value={session.day} onChange={(e) => handleSessionChange(index, 'day', e.target.value, 'subject')} className={inputClass}>
                                                <option value="">-- {t('selectDay')} --</option>
                                                {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{t(day as any)}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-3">
                                            <select value={session.timeSlot} onChange={(e) => handleSessionChange(index, 'timeSlot', e.target.value, 'subject')} className={inputClass}>
                                                <option value="">-- {t('selectTime')} --</option>
                                                {TIME_SLOTS.map(time => <option key={time} value={time}>{time}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <select value={session.duration} onChange={(e) => handleSessionChange(index, 'duration', Number(e.target.value), 'subject')} className={inputClass}>
                                                {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} {t('minutes')}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-3">
                                            <input type="text" placeholder={t('classroom')} value={session.classroom} onChange={(e) => handleSessionChange(index, 'classroom', e.target.value, 'subject')} className={inputClass} />
                                        </div>
                                        <div className="col-span-1">
                                            <button type="button" onClick={() => removeSessionRow(index, 'subject')} className="text-red-500 hover:text-red-700 p-2"><MinusCircle size={20}/></button>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addSessionRow('subject')} className="flex items-center gap-2 text-sm text-blue-600 font-semibold hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                                    <PlusCircle size={18}/> {t('add')} {t('scheduleSession')}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4">
                         <button type="button" onClick={() => setModalState(null)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">{t('cancel')}</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">{t('save')}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default SubjectsAndCourses;