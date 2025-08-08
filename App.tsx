import React, { createContext, useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import { ToastProvider } from './contexts/ToastContext.tsx';
import { AppContextType, School, User, UserRole, Student, Teacher, Level, Group, Course, Expense, Payment, Subject, ScheduledSession } from './types/index.ts';

import LoginPage from './pages/LoginPage.tsx';
import SuperAdminDashboard from './pages/SuperAdminDashboard.tsx';
import Layout from './components/Layout.tsx';
import Dashboard from './pages/school/Dashboard.tsx';
import Students from './pages/school/Students.tsx';
import Teachers from './pages/school/Teachers.tsx';
import LevelsAndGroups from './pages/school/LevelsAndGroups.tsx';
import Courses from './pages/school/Courses.tsx';
import Schedule from './pages/school/Schedule.tsx';
import Finances from './pages/school/Finances.tsx';
import Settings from './pages/Settings.tsx';
import { useAppContext } from './hooks/useAppContext.ts';
import { TranslationKey } from './i18n/index.ts';

// --- Helper Functions ---
const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// --- Initial Data ---
const getInitialSchools = (): School[] => {
    const savedSchools = localStorage.getItem('schools');
    if (savedSchools) {
        try {
            const parsed = JSON.parse(savedSchools);
            if (Array.isArray(parsed)) {
                // Ensure all schools have necessary properties
                return parsed.map(school => ({ 
                    ...school, 
                    isActive: school.isActive !== undefined ? school.isActive : true,
                    scheduledSessions: school.scheduledSessions || [],
                    trialEndDate: school.trialEndDate // ensure this property is carried over
                }));
            }
        } catch (e) {
            console.error("Failed to parse schools from localStorage", e);
        }
    }
    // Seed with initial data if nothing is in localStorage or parsing fails
    return [
        {
            id: 'school_1',
            name: 'مدرسة النجاح',
            logo: 'https://picsum.photos/seed/school1/200',
            ownerCode: 'owner123',
            staffCode: 'staff123',
            isActive: true,
            trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0,10),
            levels: [{ id: 'l1', name: 'المستوى الأول' }],
            groups: [{ id: 'g1', name: 'الفوج أ', levelId: 'l1' }],
            subjects: [
                {id: 'sub1', name: 'الرياضيات', fee: 250, sessionsPerMonth: 8, classroom: '101', levelId: 'l1'}, 
                {id: 'sub2', name: 'العربية', fee: 200, sessionsPerMonth: 8, classroom: '102', levelId: 'l1'},
                {id: 'sub3', name: 'الفرنسية', fee: 220, sessionsPerMonth: 4, classroom: '101', levelId: 'l1'}
            ],
            students: [{ id: 's1', name: 'أحمد علي', parentPhone: '0555111222', levelId: 'l1', groupIds: ['g1'], subjectIds: ['sub1', 'sub2'], courseIds: ['c1'], registrationDate: new Date().toISOString(), schoolName: 'مدرسة ابتدائية' }],
            teachers: [{ id: 't1', name: 'الأستاذ خالد', subjects: ['sub1', 'sub3'], levelIds: ['l1'], courseIds: ['c1'], phone: '0555333444', salary: { type: 'fixed', value: 50000 } }, { id: 't2', name: 'الأستاذة فاطمة', subjects: ['sub2'], levelIds: ['l1'], phone: '0555555555', salary: { type: 'percentage', value: 50 } }],
            courses: [{ id: 'c1', name: 'دورة برمجة', fee: 2000, teacherIds: ['t1'] }],
            payments: [{ id: 'p1', studentId: 's1', amount: 450, date: '2024-05', description: 'رسوم شهر مايو' }],
            expenses: [{ id: 'e1', description: 'فواتير كهرباء', amount: 5000, date: '2024-05-15' }],
            scheduledSessions: [],
        }
    ];
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

const PrivateSchoolLayout = () => {
    const { currentUser } = useAppContext();

    if (!currentUser || currentUser.role === UserRole.SuperAdmin) {
        return <Navigate to="/login" replace />;
    }
    
    return <Layout />;
};


const AppLogic: React.FC = () => {
    const [schools, setSchools] = useState<School[]>(getInitialSchools);
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('currentUser');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [originalUser, setOriginalUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('originalUser');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const navigate = useNavigate();
    const location = useLocation();

    // Persist state to localStorage
    useEffect(() => {
        localStorage.setItem('schools', JSON.stringify(schools));
    }, [schools]);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('currentUser');
        }
    }, [currentUser]);

    useEffect(() => {
        if (originalUser) {
            localStorage.setItem('originalUser', JSON.stringify(originalUser));
        } else {
            localStorage.removeItem('originalUser');
        }
    }, [originalUser]);
    
    // Check for expired trials on initial load
    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10);
        let schoolsUpdated = false;
    
        const updatedSchools = schools.map(school => {
            if (school.isActive && school.trialEndDate && school.trialEndDate < today) {
                schoolsUpdated = true;
                return { ...school, isActive: false };
            }
            return school;
        });
    
        if (schoolsUpdated) {
            setSchools(updatedSchools);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Navigation logic on user change
    useEffect(() => {
        if (currentUser) {
            if (currentUser.role === UserRole.SuperAdmin && !originalUser) {
                navigate('/super-admin');
            } else if (currentUser.role === UserRole.SchoolOwner || currentUser.role === UserRole.Staff) {
                if (location.pathname === '/login' || location.pathname === '/super-admin') {
                   navigate('/');
                }
            }
        } else {
            navigate('/login');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, originalUser]);

    const login = (code: string): { success: boolean; messageKey?: TranslationKey } => {
        if (code === 'Abzn11241984') {
            setCurrentUser({ name: 'Super Admin', role: UserRole.SuperAdmin });
            return { success: true };
        }
        for (const school of schools) {
            if (code === school.ownerCode || code === school.staffCode) {
                 if (!school.isActive) {
                    return { success: false, messageKey: 'schoolIsInactive' };
                }
                if (code === school.ownerCode) {
                    setCurrentUser({ name: `${school.name} Owner`, role: UserRole.SchoolOwner, schoolId: school.id });
                } else {
                    setCurrentUser({ name: `Staff Member`, role: UserRole.Staff, schoolId: school.id });
                }
                return { success: true };
            }
        }
        return { success: false, messageKey: 'invalidCode' };
    };

    const logout = () => {
        setCurrentUser(null);
        setOriginalUser(null);
    };

    const impersonateSchoolOwner = (schoolId: string) => {
        const school = schools.find(s => s.id === schoolId);
        if (school && currentUser && currentUser.role === UserRole.SuperAdmin) {
            setOriginalUser(currentUser);
            setCurrentUser({
                name: `${school.name} Owner`,
                role: UserRole.SchoolOwner,
                schoolId: school.id
            });
        }
    };

    const stopImpersonating = () => {
        if (originalUser) {
            setCurrentUser(originalUser);
            setOriginalUser(null);
        }
    };

    const updateSchools = (updater: (prevSchools: School[]) => School[]) => {
        setSchools(updater);
    };

    const findSchool = useCallback((schoolId: string) => schools.find(s => s.id === schoolId), [schools]);

    // --- State modification functions ---
    
    const modifySchool = (schoolId: string, modification: (school: School) => School) => {
        updateSchools(prev => prev.map(s => s.id === schoolId ? modification(s) : s));
    };

    const addSchool = (schoolDetails: { name: string; logo: string; ownerCode: string; staffCode: string; trialDays: number; }) => {
        let trialEndDate: string | undefined = undefined;
        if (schoolDetails.trialDays > 0) {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + schoolDetails.trialDays);
            trialEndDate = endDate.toISOString().slice(0, 10); // YYYY-MM-DD
        }

        const newSchool: School = {
            id: generateId(),
            name: schoolDetails.name,
            logo: schoolDetails.logo,
            ownerCode: schoolDetails.ownerCode,
            staffCode: schoolDetails.staffCode,
            isActive: true,
            trialEndDate,
            students: [], teachers: [], levels: [], groups: [], courses: [], subjects: [], payments: [], expenses: [], scheduledSessions: [],
        };
        updateSchools(prev => [...prev, newSchool]);
    };

    const deleteSchool = (schoolId: string) => {
        updateSchools(prev => prev.filter(s => s.id !== schoolId));
    };
    
    const toggleSchoolStatus = (schoolId: string) => {
        modifySchool(schoolId, school => ({ ...school, isActive: !school.isActive }));
    };

    const updateSchoolDetails = (schoolId: string, details: { name: string; logo: string; }) => {
        modifySchool(schoolId, school => ({ ...school, ...details }));
    }
    
    const updateSchoolCodes = (schoolId: string, codes: { ownerCode: string; staffCode: string; }) => {
        modifySchool(schoolId, school => ({ ...school, ...codes }));
    }

    const addStudent = (schoolId: string, studentData: Omit<Student, 'id' | 'registrationDate'>) => {
        const newStudent: Student = { ...studentData, id: generateId(), registrationDate: new Date().toISOString() };
        
        modifySchool(schoolId, school => {
            const newPayments: Payment[] = [...school.payments];
            const newExpenses: Expense[] = [...school.expenses];
            const currentDate = new Date();
            const currentMonth = currentDate.toISOString().slice(0, 7);
            const fullDate = currentDate.toISOString().slice(0, 10);

            let totalFee = 0;

            newStudent.subjectIds.forEach(subjectId => {
                const subject = school.subjects.find(s => s.id === subjectId);
                if (!subject) return;

                totalFee += subject.fee;
                
                const teacher = school.teachers.find(t => t.subjects.includes(subjectId));
                if (!teacher) return;

                let expenseAmount = 0;
                if (teacher.salary.type === 'percentage') {
                    expenseAmount = subject.fee * (teacher.salary.value / 100);
                } else if (teacher.salary.type === 'per_session') {
                    expenseAmount = teacher.salary.value;
                }

                if (expenseAmount > 0) {
                    newExpenses.push({
                        id: generateId(),
                        description: `راتب للأستاذ ${teacher.name} (مادة ${subject.name}) - طالب ${newStudent.name}`,
                        amount: expenseAmount,
                        date: fullDate,
                        teacherId: teacher.id,
                    });
                }
            });

            if (totalFee > 0) {
                newPayments.push({
                    id: generateId(),
                    studentId: newStudent.id,
                    amount: totalFee,
                    date: currentMonth,
                    description: 'رسوم تسجيل المواد للشهر الأول',
                });
            }

            return { 
                ...school, 
                students: [...school.students, newStudent],
                payments: newPayments,
                expenses: newExpenses
            };
        });
    };

    const updateStudent = (schoolId: string, updatedStudent: Student) => {
        modifySchool(schoolId, school => ({ ...school, students: school.students.map(s => s.id === updatedStudent.id ? updatedStudent : s) }));
    };

    const deleteStudent = (schoolId: string, studentId: string) => {
        modifySchool(schoolId, school => ({ ...school, students: school.students.filter(s => s.id !== studentId), payments: school.payments.filter(p => p.studentId !== studentId) }));
    };
    
    const addTeacher = (schoolId: string, teacherData: Omit<Teacher, 'id'>) => {
        const newTeacher: Teacher = { ...teacherData, id: generateId() };
        modifySchool(schoolId, school => ({ ...school, teachers: [...school.teachers, newTeacher] }));
    };
    
    const updateTeacher = (schoolId: string, updatedTeacher: Teacher) => {
         modifySchool(schoolId, school => ({ ...school, teachers: school.teachers.map(t => t.id === updatedTeacher.id ? updatedTeacher : t) }));
    };

    const deleteTeacher = (schoolId: string, teacherId: string) => {
        modifySchool(schoolId, school => ({ ...school, teachers: school.teachers.filter(t => t.id !== teacherId)}));
    };
    
    const addLevel = (schoolId: string, levelData: Omit<Level, 'id'>) => {
        const newLevel: Level = { ...levelData, id: generateId() };
        modifySchool(schoolId, school => ({ ...school, levels: [...school.levels, newLevel] }));
    };
    
    const deleteLevel = (schoolId: string, levelId: string) => {
        modifySchool(schoolId, school => ({ ...school, levels: school.levels.filter(l => l.id !== levelId)}));
    };

    const addGroup = (schoolId: string, groupData: Omit<Group, 'id'>) => {
        const newGroup: Group = { ...groupData, id: generateId() };
        modifySchool(schoolId, school => ({ ...school, groups: [...school.groups, newGroup] }));
    };

    const deleteGroup = (schoolId: string, groupId: string) => {
        modifySchool(schoolId, school => ({ ...school, groups: school.groups.filter(g => g.id !== groupId)}));
    };

    const addCourse = (schoolId: string, courseData: Omit<Course, 'id'>) => {
        const newCourse: Course = { ...courseData, id: generateId() };
        modifySchool(schoolId, school => ({ ...school, courses: [...school.courses, newCourse] }));
    };
    
    const updateCourse = (schoolId: string, updatedCourse: Course) => {
        modifySchool(schoolId, school => ({ ...school, courses: school.courses.map(c => c.id === updatedCourse.id ? updatedCourse : c) }));
    };

    const deleteCourse = (schoolId: string, courseId: string) => {
        modifySchool(schoolId, school => ({ ...school, courses: school.courses.filter(c => c.id !== courseId)}));
    };
    
    const addSubject = (schoolId: string, subjectData: Omit<Subject, 'id'>, sessionData?: { day: string, timeSlot: string }) => {
        const newSubject: Subject = { ...subjectData, id: generateId() };
        modifySchool(schoolId, school => {
            const newSchoolState = {
                ...school,
                subjects: [...school.subjects, newSubject],
            };
            if (sessionData && sessionData.day && sessionData.timeSlot) {
                const newSession: ScheduledSession = {
                    id: generateId(),
                    subjectId: newSubject.id,
                    day: sessionData.day,
                    timeSlot: sessionData.timeSlot,
                    classroom: newSubject.classroom,
                };
                newSchoolState.scheduledSessions = [...(school.scheduledSessions || []), newSession];
            }
            return newSchoolState;
        });
    };

    const updateSubject = (schoolId: string, updatedSubject: Subject) => {
        modifySchool(schoolId, school => ({ ...school, subjects: school.subjects.map(s => s.id === updatedSubject.id ? updatedSubject : s) }));
    };
    
    const deleteSubject = (schoolId: string, subjectId: string) => {
        modifySchool(schoolId, school => ({
            ...school, 
            subjects: school.subjects.filter(s => s.id !== subjectId),
            // Also remove any scheduled sessions for this subject
            scheduledSessions: school.scheduledSessions.filter(ss => ss.subjectId !== subjectId),
        }));
    };

    const addExpense = (schoolId: string, expenseData: Omit<Expense, 'id'>) => {
        const newExpense: Expense = { ...expenseData, id: generateId() };
        modifySchool(schoolId, school => ({ ...school, expenses: [...school.expenses, newExpense] }));
    };

    const addPayment = (schoolId: string, paymentData: Omit<Payment, 'id'>) => {
        const newPayment: Payment = { ...paymentData, id: generateId() };
        modifySchool(schoolId, school => ({ ...school, payments: [...school.payments, newPayment] }));
    };

    const updateSchedule = (schoolId: string, sessions: ScheduledSession[]) => {
        modifySchool(schoolId, school => ({ ...school, scheduledSessions: sessions }));
    };

    const restoreData = (data: { schools: School[] }) => {
        if (data && Array.isArray(data.schools)) {
            setSchools(data.schools);
        }
    };

    const appContextValue: AppContextType = {
        schools, currentUser, originalUser, login, logout, addSchool, deleteSchool, findSchool,
        toggleSchoolStatus, updateSchoolDetails, updateSchoolCodes,
        impersonateSchoolOwner, stopImpersonating,
        addStudent, updateStudent, deleteStudent, addTeacher, updateTeacher, deleteTeacher,
        addLevel, deleteLevel,
        addGroup, deleteGroup,
        addCourse, updateCourse, deleteCourse,
        addSubject, updateSubject, deleteSubject,
        addExpense, addPayment, updateSchedule,
        restoreData,
    };
    
    return (
      <AppContext.Provider value={appContextValue}>
          <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/super-admin" element={currentUser?.role === UserRole.SuperAdmin && !originalUser ? <SuperAdminDashboard /> : <Navigate to="/login" replace />} />
              
              <Route element={<PrivateSchoolLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/teachers" element={<Teachers />} />
                  <Route path="/levels-groups" element={<LevelsAndGroups />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/schedule" element={<Schedule />} />
                  {currentUser?.role === UserRole.SchoolOwner && <Route path="/settings" element={<Settings />} />}
                  {currentUser?.role === UserRole.SchoolOwner && <Route path="/finances" element={<Finances />} />}
              </Route>

              <Route path="*" element={<Navigate to={
                  !currentUser ? "/login" : currentUser.role === UserRole.SuperAdmin && !originalUser ? "/super-admin" : "/"
                } replace />} 
              />
          </Routes>
      </AppContext.Provider>
    );
};

const App: React.FC = () => (
    <ThemeProvider>
        <LanguageProvider>
            <ToastProvider>
                <HashRouter>
                    <AppLogic />
                </HashRouter>
            </ToastProvider>
        </LanguageProvider>
    </ThemeProvider>
);

export default App;