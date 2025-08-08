
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { useLanguage } from '../../hooks/useLanguage.ts';
import { useToast } from '../../hooks/useToast.ts';
import { UserRole, Student, Level, Group } from '../../types/index.ts';
import Modal from '../../components/Modal.tsx';
import { PlusCircle, Edit, Trash2, DollarSign } from 'lucide-react';

const Students: React.FC = () => {
    const { currentUser, findSchool, addStudent, updateStudent, deleteStudent, addPayment } = useAppContext();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const school = useMemo(() => currentUser?.schoolId ? findSchool(currentUser.schoolId) : undefined, [currentUser, findSchool]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [formData, setFormData] = useState({ name: '', schoolName: '', parentPhone: '', levelId: '', groupIds: [] as string[], subjectIds: [] as string[], courseIds: [] as string[] });
    const [searchTerm, setSearchTerm] = useState('');

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<Student | null>(null);
    const [paymentData, setPaymentData] = useState({ amount: 0, date: '', courseId: '' });
    const [monthlyFee, setMonthlyFee] = useState(0);

    const filteredStudents = useMemo(() => {
        if (!school) return [];
        return school.students.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [school, searchTerm]);

    const handleOpenModal = (student: Student | null = null) => {
        setEditingStudent(student);
        if (student) {
            setFormData({ name: student.name, schoolName: student.schoolName || '', parentPhone: student.parentPhone, levelId: student.levelId, groupIds: student.groupIds, subjectIds: student.subjectIds || [], courseIds: student.courseIds || [] });
        } else {
            setFormData({ name: '', schoolName: '', parentPhone: '', levelId: school?.levels[0]?.id || '', groupIds: [], subjectIds: [], courseIds: [] });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingStudent(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.schoolId) return;

        const studentData = {
            name: formData.name,
            parentPhone: formData.parentPhone,
            levelId: formData.levelId,
            groupIds: formData.groupIds,
            subjectIds: formData.subjectIds,
            courseIds: formData.courseIds,
            ...(formData.schoolName && { schoolName: formData.schoolName })
        };


        if (editingStudent) {
            updateStudent(currentUser.schoolId, { ...editingStudent, ...studentData });
            showToast(t('editSuccess'), 'success');
        } else {
            addStudent(currentUser.schoolId, studentData);
            showToast(t('addSuccess'), 'success');
        }
        handleCloseModal();
    };
    
    const handleDelete = (studentId: string) => {
        if(window.confirm(t('confirmDelete')) && currentUser?.schoolId) {
            deleteStudent(currentUser.schoolId, studentId);
            showToast(t('deleteSuccess'), 'info');
        }
    }
    
    const handleGroupChange = (groupId: string) => {
        setFormData(prev => ({
            ...prev,
            groupIds: prev.groupIds.includes(groupId)
                ? prev.groupIds.filter(id => id !== groupId)
                : [...prev.groupIds, groupId]
        }));
    };

    const handleSubjectChange = (subjectId: string) => {
        setFormData(prev => ({
            ...prev,
            subjectIds: prev.subjectIds.includes(subjectId)
                ? prev.subjectIds.filter(id => id !== subjectId)
                : [...prev.subjectIds, subjectId]
        }));
    };

    const handleCourseChange = (courseId: string) => {
        setFormData(prev => ({
            ...prev,
            courseIds: (prev.courseIds || []).includes(courseId)
                ? (prev.courseIds || []).filter(id => id !== courseId)
                : [...(prev.courseIds || []), courseId]
        }));
    };

    const handleOpenPaymentModal = (student: Student) => {
        if (!school) return;
        const subjects = school.subjects.filter(s => student.subjectIds?.includes(s.id));
        const totalSubjectFee = subjects.reduce((sum, sub) => sum + (sub.fee || 0), 0);
        setMonthlyFee(totalSubjectFee);

        setSelectedStudentForPayment(student);
        setPaymentData({ amount: totalSubjectFee, date: new Date().toISOString().slice(0, 7), courseId: '' });
        setIsPaymentModalOpen(true);
    };

    const handleClosePaymentModal = () => {
        setIsPaymentModalOpen(false);
        setSelectedStudentForPayment(null);
    };

    const handlePaymentCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!school) return;
        const courseId = e.target.value;
        if (courseId === '') {
            setPaymentData({ ...paymentData, courseId: '', amount: monthlyFee });
        } else {
            const course = school.courses.find(c => c.id === courseId);
            if (course) {
                setPaymentData({ ...paymentData, courseId: courseId, amount: course.fee });
            }
        }
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.schoolId || !selectedStudentForPayment) return;
        
        addPayment(currentUser.schoolId, {
            studentId: selectedStudentForPayment.id,
            amount: paymentData.amount,
            date: paymentData.date,
            ...(paymentData.courseId && { courseId: paymentData.courseId })
        });
        
        showToast(t('addSuccess'), 'success');
        handleClosePaymentModal();
    };

    if (!school) return <div>Loading...</div>;
    
    const getInitials = (name: string = '') => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const isOwner = currentUser?.role === UserRole.SchoolOwner;
    const inputClass = "mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 border dark:border-gray-600";
    const labelClass = "block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2";

    return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('studentList')}</h2>
                    <p className="text-blue-500 font-semibold">{filteredStudents.length} {t('students')}</p>
                </div>
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        placeholder={t('searchStudentByName')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full md:w-auto px-4 py-2 text-base text-gray-900 bg-gray-100 border border-transparent rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {isOwner && (
                        <button onClick={() => handleOpenModal()} className="flex items-center space-x-2 rtl:space-x-reverse bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shrink-0">
                            <PlusCircle size={20} />
                            <span>{t('addNewStudent')}</span>
                        </button>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:text-gray-400 dark:bg-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-3">{t('name')}</th>
                            <th scope="col" className="px-6 py-3">{t('level')}</th>
                            <th scope="col" className="px-6 py-3">{t('enrolledSubjects')}</th>
                            <th scope="col" className="px-6 py-3">{t('trainingCourses')}</th>
                            {isOwner && <th scope="col" className="px-6 py-3 text-center">{t('actions')}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map(student => {
                            const level = school.levels.find(l => l.id === student.levelId);
                            const subjects = school.subjects.filter(s => student.subjectIds?.includes(s.id));
                            const courses = school.courses.filter(c => (student.courseIds || []).includes(c.id));
                            return (
                                <tr key={student.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
                                                {getInitials(student.name)}
                                            </div>
                                            <div>
                                                {student.name}
                                                <p className="font-normal text-gray-500 dark:text-gray-400">{student.parentPhone}</p>
                                            </div>
                                        </div>
                                    </th>
                                    <td className="px-6 py-4">{level?.name}</td>
                                    <td className="px-6 py-4">{subjects.map(g => g.name).join(', ')}</td>
                                    <td className="px-6 py-4">{courses.map(c => c.name).join(', ')}</td>
                                    {isOwner && (
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse">
                                                <button onClick={() => handleOpenPaymentModal(student)} title={t('addPayment')} className="text-green-500 hover:text-green-700"><DollarSign size={20} /></button>
                                                <button onClick={() => handleOpenModal(student)} title={t('edit')} className="text-blue-500 hover:text-blue-700"><Edit size={20} /></button>
                                                <button onClick={() => handleDelete(student.id)} title={t('delete')} className="text-red-500 hover:text-red-700"><Trash2 size={20} /></button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingStudent ? t('editStudent') : t('addNewStudent')}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={labelClass}>{t('name')}</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className={inputClass} />
                    </div>
                     <div>
                        <label className={labelClass}>{t('optionalSchoolName')}</label>
                        <input type="text" value={formData.schoolName} onChange={e => setFormData({ ...formData, schoolName: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>{t('parentPhone')}</label>
                        <input type="tel" value={formData.parentPhone} onChange={e => setFormData({ ...formData, parentPhone: e.target.value })} required className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>{t('level')}</label>
                        <select value={formData.levelId} onChange={e => setFormData({ ...formData, levelId: e.target.value, groupIds: [] })} required className={inputClass}>
                             <option value="" disabled>-- {t('level')} --</option>
                            {school.levels.map(level => <option key={level.id} value={level.id}>{level.name}</option>)}
                        </select>
                    </div>
                    {formData.levelId && (
                        <div>
                            <label className={labelClass}>{t('groups')}</label>
                            <div className="mt-2 grid grid-cols-2 gap-2 p-3 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                {school.groups.filter(g => g.levelId === formData.levelId).map(group => (
                                    <label key={group.id} className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600">
                                        <input
                                            type="checkbox"
                                            checked={formData.groupIds.includes(group.id)}
                                            onChange={() => handleGroupChange(group.id)}
                                            className="form-checkbox h-5 w-5 rounded text-blue-600 focus:ring-blue-500 bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                                        />
                                        <span className="text-gray-800 dark:text-gray-200">{group.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                     <div>
                        <label className={labelClass}>{t('subjects')}</label>
                        <div className="mt-2 grid grid-cols-2 gap-2 p-3 border dark:border-gray-600 rounded-lg max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-700/50">
                            {school.subjects.map(subject => (
                                <label key={subject.id} className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={formData.subjectIds.includes(subject.id)}
                                        onChange={() => handleSubjectChange(subject.id)}
                                        className="form-checkbox h-5 w-5 rounded text-blue-600 focus:ring-blue-500 bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                                    />
                                     <span className="text-gray-800 dark:text-gray-200">{subject.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                     <div>
                        <label className={labelClass}>{t('trainingCourses')}</label>
                        <div className="mt-2 grid grid-cols-2 gap-2 p-3 border dark:border-gray-600 rounded-lg max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-700/50">
                            {school.courses.map(course => (
                                <label key={course.id} className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={(formData.courseIds || []).includes(course.id)}
                                        onChange={() => handleCourseChange(course.id)}
                                        className="form-checkbox h-5 w-5 rounded text-blue-600 focus:ring-blue-500 bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                                    />
                                    <span className="text-gray-800 dark:text-gray-200">{course.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">{t('cancel')}</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{t('save')}</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isPaymentModalOpen} onClose={handleClosePaymentModal} title={`${t('paymentFor')}: ${selectedStudentForPayment?.name}`}>
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div>
                        <label className={labelClass}>{t('paymentAmount')}</label>
                        <input 
                            type="number" 
                            value={paymentData.amount} 
                            onChange={e => setPaymentData({ ...paymentData, amount: Number(e.target.value) })} 
                            required 
                            className={inputClass} 
                        />
                    </div>
                    <div>
                        <label className={labelClass}>{t('paymentMonth')}</label>
                        <input 
                            type="month" 
                            value={paymentData.date} 
                            onChange={e => setPaymentData({ ...paymentData, date: e.target.value })} 
                            required 
                            className={inputClass} 
                        />
                    </div>
                    <div>
                        <label className={labelClass}>{t('selectCourseOptional')}</label>
                        <select 
                            value={paymentData.courseId} 
                            onChange={handlePaymentCourseChange} 
                            className={inputClass}
                        >
                            <option value="">{t('generalFees')}</option>
                            {school.courses.map(course => (
                                <option key={course.id} value={course.id}>{course.name} ({course.fee} MAD)</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4">
                        <button type="button" onClick={handleClosePaymentModal} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">{t('cancel')}</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{t('addPayment')}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Students;
