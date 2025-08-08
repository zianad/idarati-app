
import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { useLanguage } from '../../hooks/useLanguage.ts';
import { useToast } from '../../hooks/useToast.ts';
import StatCard from '../../components/StatCard.tsx';
import { DollarSign, TrendingDown, ChevronsUp, PlusCircle } from 'lucide-react';
import Modal from '../../components/Modal.tsx';


const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <p className="label text-base font-bold text-gray-900 dark:text-white mb-2">{`${label}`}</p>
                {payload.map((pld: any) => (
                    <p key={pld.dataKey} style={{ color: pld.color }} className="font-semibold text-sm">
                        {`${pld.dataKey}: ${pld.value.toLocaleString()} MAD`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};


const Finances: React.FC = () => {
    const { currentUser, findSchool, addExpense } = useAppContext();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const school = useMemo(() => currentUser?.schoolId ? findSchool(currentUser.schoolId) : undefined, [currentUser, findSchool]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expenseDesc, setExpenseDesc] = useState('');
    const [expenseAmount, setExpenseAmount] = useState(0);

    const financialData = useMemo(() => {
        if (!school) return { totalIncome: 0, totalExpenses: 0, netProfit: 0, monthlyData: [] };
        
        const totalIncome = school.payments.reduce((acc, p) => acc + p.amount, 0);
        const totalExpenses = school.expenses.reduce((acc, e) => acc + e.amount, 0);
        const netProfit = totalIncome - totalExpenses;

        const monthlyDataMap = new Map<string, { income: number, expenses: number }>();
        
        school.payments.forEach(p => {
            const month = p.date;
            const current = monthlyDataMap.get(month) || { income: 0, expenses: 0 };
            current.income += p.amount;
            monthlyDataMap.set(month, current);
        });

        school.expenses.forEach(e => {
            const month = e.date.slice(0, 7);
            const current = monthlyDataMap.get(month) || { income: 0, expenses: 0 };
            current.expenses += e.amount;
            monthlyDataMap.set(month, current);
        });

        const monthlyData = Array.from(monthlyDataMap.entries())
            .map(([month, data]) => ({ name: month, [t('income')]: data.income, [t('expenses')]: data.expenses }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return { totalIncome, totalExpenses, netProfit, monthlyData };
    }, [school, t]);

    const handleAddExpense = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentUser?.schoolId && expenseDesc && expenseAmount > 0) {
            const date = new Date().toISOString().slice(0,10);
            addExpense(currentUser.schoolId, { description: expenseDesc, amount: expenseAmount, date });
            setExpenseDesc('');
            setExpenseAmount(0);
            setIsModalOpen(false);
            showToast(t('addSuccess'), 'success');
        }
    };
    
    if (!school) return <div>Loading...</div>;

    const inputClass = "mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 border dark:border-gray-600";
    const labelClass = "block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2";

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title={t('totalIncome')} value={`${financialData.totalIncome.toLocaleString()} MAD`} icon={<DollarSign size={24}/>} iconBgColor="bg-green-500"/>
                <StatCard title={t('totalExpenses')} value={`${financialData.totalExpenses.toLocaleString()} MAD`} icon={<TrendingDown size={24}/>} iconBgColor="bg-red-500"/>
                <StatCard title={t('netProfit')} value={`${financialData.netProfit.toLocaleString()} MAD`} icon={<ChevronsUp size={24}/>} iconBgColor="bg-blue-500" />
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{t('financialPerformance')}</h3>
                <div style={{height: '300px'}}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={financialData.monthlyData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="5 5" className="stroke-gray-300/50 dark:stroke-gray-700/50" />
                            <XAxis 
                                dataKey="name" 
                                tick={{ fontSize: 13, fill: 'currentColor' }} 
                                className="text-gray-500 dark:text-gray-400"
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis 
                                tick={{ fontSize: 13, fill: 'currentColor' }} 
                                className="text-gray-500 dark:text-gray-400"
                                tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value)}
                                axisLine={false}
                                tickLine={false}
                            >
                                <Label value="MAD" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: 'currentColor' }} className="text-gray-500 dark:text-gray-400" />
                            </YAxis>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}/>
                            <Line type="monotone" dataKey={t('income')} stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{ r: 8, strokeWidth: 2, stroke: 'white' }} />
                            <Line type="monotone" dataKey={t('expenses')} stroke="#ef4444" strokeWidth={3} dot={{r: 4}} activeDot={{ r: 8, strokeWidth: 2, stroke: 'white' }}/>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                     <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{t('income')}</h3>
                    <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700 text-left rtl:text-right">
                                <tr>
                                    <th className="px-4 py-2">{t('student')}</th>
                                    <th className="px-4 py-2">{t('description')}</th>
                                    <th className="px-4 py-2">{t('amount')}</th>
                                    <th className="px-4 py-2">{t('date')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...school.payments].reverse().map(p => {
                                    const student = school.students.find(s => s.id === p.studentId);
                                    let paymentDesc = p.description;
                                    if (!paymentDesc) {
                                        const course = p.courseId ? school.courses.find(c => c.id === p.courseId) : undefined;
                                        paymentDesc = course ? course.name : t('generalFees');
                                    }

                                    return (<tr key={p.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{student?.name || 'N/A'}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{paymentDesc}</td>
                                        <td className="px-4 py-3 text-green-600 dark:text-green-400 font-semibold">{p.amount.toLocaleString()} MAD</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.date}</td>
                                    </tr>)
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('expenses')}</h3>
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-2 rtl:space-x-reverse bg-red-100 text-red-600 px-3 py-1 rounded-md text-sm font-semibold hover:bg-red-200"><PlusCircle size={16}/><span>{t('addExpense')}</span></button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700 text-left rtl:text-right">
                                <tr>
                                    <th className="px-4 py-2">{t('description')}</th>
                                    <th className="px-4 py-2">{t('amount')}</th>
                                    <th className="px-4 py-2">{t('date')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...school.expenses].reverse().map(e => (
                                    <tr key={e.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{e.description}</td>
                                        <td className="px-4 py-3 text-red-600 dark:text-red-400 font-semibold">{e.amount.toLocaleString()} MAD</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{e.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('addExpense')}>
                <form onSubmit={handleAddExpense} className="space-y-4">
                    <div>
                        <label className={labelClass}>{t('expenseDescription')}</label>
                        <input type="text" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} required className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>{t('amount')}</label>
                        <input type="number" value={expenseAmount} onChange={e => setExpenseAmount(Number(e.target.value))} required className={inputClass} />
                    </div>
                    <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-2">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">{t('cancel')}</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">{t('add')}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Finances;
