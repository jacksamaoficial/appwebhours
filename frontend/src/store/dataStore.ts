import { create } from 'zustand';
import { Job, WorkEntry, Expense, DashboardSummary, WeeklyData, HistoryItem, RestDay } from '../types';
import { jobsApi, workEntriesApi, expensesApi, dashboardApi, restDaysApi } from '../services/api';
import { format } from 'date-fns';

interface DataState {
  // Data
  jobs: Job[];
  workEntries: WorkEntry[];
  expenses: Expense[];
  restDays: RestDay[];
  summary: DashboardSummary | null;
  weeklyData: WeeklyData[];
  history: HistoryItem[];
  
  // Loading states
  isLoadingJobs: boolean;
  isLoadingEntries: boolean;
  isLoadingExpenses: boolean;
  isLoadingSummary: boolean;
  
  // Current month
  currentMonth: string;
  
  // Actions
  setCurrentMonth: (month: string) => void;
  fetchJobs: () => Promise<void>;
  createJob: (job: any) => Promise<void>;
  updateJob: (jobId: string, job: any) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  
  fetchWorkEntries: () => Promise<void>;
  createWorkEntry: (entry: any) => Promise<WorkEntry>;
  updateWorkEntry: (entryId: string, entry: any) => Promise<void>;
  closeWorkEntry: (entryId: string, endTime: string, isNextDay: boolean) => Promise<void>;
  deleteWorkEntry: (entryId: string) => Promise<void>;
  
  fetchExpenses: () => Promise<void>;
  createExpense: (expense: any) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  
  fetchRestDays: () => Promise<void>;
  createRestDay: (restDay: any) => Promise<void>;
  deleteRestDay: (restId: string) => Promise<void>;
  toggleRestDay: (date: string, jobId?: string) => Promise<void>;
  
  fetchDashboard: () => Promise<void>;
  fetchWeeklyChart: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  
  refreshAll: () => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  jobs: [],
  workEntries: [],
  expenses: [],
  restDays: [],
  summary: null,
  weeklyData: [],
  history: [],
  
  isLoadingJobs: false,
  isLoadingEntries: false,
  isLoadingExpenses: false,
  isLoadingSummary: false,
  
  currentMonth: format(new Date(), 'yyyy-MM'),
  
  setCurrentMonth: (month: string) => {
    set({ currentMonth: month });
    get().refreshAll();
  },
  
  fetchJobs: async () => {
    try {
      set({ isLoadingJobs: true });
      const jobs = await jobsApi.getAll();
      set({ jobs, isLoadingJobs: false });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      set({ isLoadingJobs: false });
    }
  },
  
  createJob: async (job: any) => {
    const newJob = await jobsApi.create(job);
    set((state) => ({ jobs: [...state.jobs, newJob] }));
  },
  
  updateJob: async (jobId: string, job: any) => {
    const updatedJob = await jobsApi.update(jobId, job);
    set((state) => ({
      jobs: state.jobs.map((j) => (j.job_id === jobId ? updatedJob : j)),
    }));
  },
  
  deleteJob: async (jobId: string) => {
    await jobsApi.delete(jobId);
    set((state) => ({
      jobs: state.jobs.filter((j) => j.job_id !== jobId),
    }));
  },
  
  fetchWorkEntries: async () => {
    try {
      set({ isLoadingEntries: true });
      const { currentMonth } = get();
      const entries = await workEntriesApi.getAll(currentMonth);
      set({ workEntries: entries, isLoadingEntries: false });
    } catch (error) {
      console.error('Error fetching work entries:', error);
      set({ isLoadingEntries: false });
    }
  },
  
  createWorkEntry: async (entry: any) => {
    const newEntry = await workEntriesApi.create(entry);
    set((state) => ({ workEntries: [newEntry, ...state.workEntries] }));
    return newEntry;
  },
  
  closeWorkEntry: async (entryId: string, endTime: string, isNextDay: boolean) => {
    const updatedEntry = await workEntriesApi.close(entryId, endTime, isNextDay);
    set((state) => ({
      workEntries: state.workEntries.map((e) =>
        e.entry_id === entryId ? updatedEntry : e
      ),
    }));
    // Refresh dashboard after closing entry
    get().fetchDashboard();
    get().fetchHistory();
  },
  
  updateWorkEntry: async (entryId: string, entry: any) => {
    const updatedEntry = await workEntriesApi.update(entryId, entry);
    set((state) => ({
      workEntries: state.workEntries.map((e) =>
        e.entry_id === entryId ? updatedEntry : e
      ),
    }));
    get().fetchDashboard();
    get().fetchHistory();
  },
  
  deleteWorkEntry: async (entryId: string) => {
    await workEntriesApi.delete(entryId);
    set((state) => ({
      workEntries: state.workEntries.filter((e) => e.entry_id !== entryId),
    }));
    get().fetchDashboard();
  },
  
  fetchExpenses: async () => {
    try {
      set({ isLoadingExpenses: true });
      const { currentMonth } = get();
      const expenses = await expensesApi.getAll(currentMonth);
      set({ expenses, isLoadingExpenses: false });
    } catch (error) {
      console.error('Error fetching expenses:', error);
      set({ isLoadingExpenses: false });
    }
  },
  
  createExpense: async (expense: any) => {
    const newExpense = await expensesApi.create(expense);
    set((state) => ({ expenses: [newExpense, ...state.expenses] }));
    get().fetchDashboard();
    get().fetchHistory();
  },
  
  deleteExpense: async (expenseId: string) => {
    await expensesApi.delete(expenseId);
    set((state) => ({
      expenses: state.expenses.filter((e) => e.expense_id !== expenseId),
    }));
    get().fetchDashboard();
  },
  
  fetchRestDays: async () => {
    try {
      const { currentMonth } = get();
      const restDays = await restDaysApi.getAll(currentMonth);
      set({ restDays });
    } catch (error) {
      console.error('Error fetching rest days:', error);
    }
  },
  
  createRestDay: async (restDay: any) => {
    const newRestDay = await restDaysApi.create(restDay);
    set((state) => ({ restDays: [newRestDay, ...state.restDays] }));
  },
  
  deleteRestDay: async (restId: string) => {
    await restDaysApi.delete(restId);
    set((state) => ({
      restDays: state.restDays.filter((r) => r.rest_id !== restId),
    }));
  },
  
  toggleRestDay: async (date: string, jobId?: string) => {
    const { restDays } = get();
    const existing = restDays.find((r) => r.date === date && r.job_id === jobId);
    
    if (existing) {
      await get().deleteRestDay(existing.rest_id);
    } else {
      await get().createRestDay({ date, job_id: jobId });
    }
  },
  
  fetchDashboard: async () => {
    try {
      set({ isLoadingSummary: true });
      const { currentMonth } = get();
      const summary = await dashboardApi.getSummary(currentMonth);
      set({ summary, isLoadingSummary: false });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      set({ isLoadingSummary: false });
    }
  },
  
  fetchWeeklyChart: async () => {
    try {
      const data = await dashboardApi.getWeeklyChart(4);
      set({ weeklyData: data.weeks });
    } catch (error) {
      console.error('Error fetching weekly chart:', error);
    }
  },
  
  fetchHistory: async () => {
    try {
      const data = await dashboardApi.getHistory(20);
      set({ history: data.history });
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  },
  
  refreshAll: async () => {
    const state = get();
    await Promise.all([
      state.fetchJobs(),
      state.fetchWorkEntries(),
      state.fetchExpenses(),
      state.fetchRestDays(),
      state.fetchDashboard(),
      state.fetchWeeklyChart(),
      state.fetchHistory(),
    ]);
  },
}));
