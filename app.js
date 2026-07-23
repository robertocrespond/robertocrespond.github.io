import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";
import ReactDOM from "react-dom/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LineChart, Line } from "recharts";
import { Wallet, CalendarRange, Target, TrendingUp, LineChart as LineChartIcon, Sun, Moon, Lock, Car, Home, GraduationCap, Plane, Heart, Gift, Briefcase, PiggyBank, Baby, MapPin, Sparkles, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Landmark, Receipt, AlertTriangle, CheckCircle2, X, Layers, Zap } from "lucide-react";
// ---------- localStorage-backed shim for window.storage (same API the app already calls) ----------
if (typeof window !== "undefined" && !window.storage) {
    const PREFIX = "fp:";
    window.storage = {
        async get(key) {
            const raw = localStorage.getItem(PREFIX + key);
            return raw === null ? null : { key, value: raw, shared: false };
        },
        async set(key, value) {
            localStorage.setItem(PREFIX + key, value);
            return { key, value, shared: false };
        },
        async delete(key) {
            localStorage.removeItem(PREFIX + key);
            return { key, deleted: true, shared: false };
        },
        async list(prefix) {
            const keys = Object.keys(localStorage)
                .filter((k) => k.startsWith(PREFIX + (prefix || "")))
                .map((k) => k.slice(PREFIX.length));
            return { keys, prefix, shared: false };
        },
    };
}
// ---------- helpers ----------
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (n) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString();
const ICONS = { Car, Home, GraduationCap, Plane, Heart, Gift, Briefcase, PiggyBank, Baby, MapPin, Sparkles, Landmark };
const GOAL_ICON_OPTS = ["Car", "Home", "GraduationCap", "Plane", "Heart", "Gift", "Briefcase", "PiggyBank"];
const STAGE_ICON_OPTS = ["Home", "Baby", "MapPin", "Briefcase", "GraduationCap", "Heart", "Plane", "Sparkles"];
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const ACCOUNT_COLORS = { checking: "#8fae9c", savings: "#5f9c86", investment: "#2f6f62", other: "#7a8f8a" };
const GOAL_COLORS = ["#c17f3e", "#b5654f", "#a37a3e", "#8f5a3e", "#c19a3e"];
const SCENARIO_COLORS = ["#2f6f62", "#c17f3e", "#7a6fa3", "#b5654f", "#3e7fa3"];
const TYPE_LABELS = { checking: "Checking", savings: "Savings", investment: "Investment", other: "Other" };
const THEMES = {
    light: { bg: "#f5f3ee", card: "#ffffff", cardBorder: "#e5e0d3", text: "#292420", textMuted: "#78716c",
        hero: "#0b3a35", heroText: "#f0efe9", heroMuted: "#6fbfa8", inputBg: "#faf9f6", inputBorder: "#d6d0c0",
        accent: "#2f6f62", accentSoft: "#e6efec", navBg: "#ffffff", navBorder: "#e5e0d3", navActive: "#2f6f62",
        navInactive: "#a39c8c", warnBg: "#fdf3e0", warnBorder: "#e0b862", warnText: "#8a6417",
        dangerText: "#b23b3b", dangerSoft: "#fbe9e7", goodText: "#2f6f62", goodSoft: "#e6efec", chip: "#f1efe7" },
    dark: { bg: "#121110", card: "#1c1a18", cardBorder: "#332e28", text: "#ece7de", textMuted: "#a39c8c",
        hero: "#0a1f1c", heroText: "#e9f5f1", heroMuted: "#6fbfa8", inputBg: "#26221e", inputBorder: "#413a32",
        accent: "#4fae95", accentSoft: "#1c2b27", navBg: "#1c1a18", navBorder: "#332e28", navActive: "#4fae95",
        navInactive: "#6b6459", warnBg: "#2c2416", warnBorder: "#8a6417", warnText: "#e0b862",
        dangerText: "#e07a7a", dangerSoft: "#2c1a18", goodText: "#4fae95", goodSoft: "#1c2b27", chip: "#26221e" },
};
const ThemeCtx = createContext(THEMES.light);
const DEFAULT_STATE = {
    theme: "light",
    profile: { currentAge: 35, retirementAge: 65, lifeExpectancy: 90, inflation: 3, raiseRate: 2 },
    accounts: [
        { id: "acc-checking", name: "Checking", type: "checking", balance: 8000, returnRate: 0.5, locked: false, unlockAge: 59 },
        { id: "acc-savings", name: "Savings", type: "savings", balance: 20000, returnRate: 4, locked: false, unlockAge: 59 },
        { id: "acc-invest", name: "Investments", type: "investment", balance: 150000, returnRate: 7, locked: false, unlockAge: 59 },
        { id: "acc-401k", name: "401k", type: "investment", balance: 60000, returnRate: 7, locked: true, unlockAge: 59.5 },
    ],
    stages: [
        { id: uid(), name: "Now", icon: "Briefcase", startAge: 35, endAge: 39, income: 100000, taxRate: 24,
            expenses: [{ id: uid(), name: "Housing", amount: 24000, inflationAdjusted: true }, { id: uid(), name: "Everyday living", amount: 30000, inflationAdjusted: true }],
            allocations: { "acc-savings": 20, "acc-invest": 60, "acc-401k": 20 } },
        { id: uid(), name: "After having a kid", icon: "Baby", startAge: 40, endAge: 64, income: 115000, taxRate: 26,
            expenses: [{ id: uid(), name: "Housing", amount: 30000, inflationAdjusted: true }, { id: uid(), name: "Everyday living", amount: 34000, inflationAdjusted: true }, { id: uid(), name: "Childcare & school", amount: 15000, inflationAdjusted: true }],
            allocations: { "acc-savings": 15, "acc-invest": 65, "acc-401k": 20 } },
        { id: uid(), name: "Retirement", icon: "Sparkles", startAge: 65, endAge: 90, income: 0, taxRate: 12,
            expenses: [{ id: uid(), name: "Everyday living", amount: 28000, inflationAdjusted: true }, { id: uid(), name: "Healthcare", amount: 10000, inflationAdjusted: true }],
            allocations: {} },
    ],
    goals: [{ id: uid(), name: "New car", icon: "Car", targetAge: 40, cost: 35000, returnRate: 3, prefundStartAge: 36, contribution: 7000 }],
    events: [
        { id: uid(), name: "Work bonus", age: 38, amount: 15000, accountId: "acc-invest", inflationAdjusted: true },
        { id: uid(), name: "Home repair", age: 42, amount: -12000, accountId: "acc-savings", inflationAdjusted: true },
    ],
    scenarios: [
        { id: "sc-cons", name: "Conservative", delta: -2 },
        { id: "sc-exp", name: "Expected", delta: 0 },
        { id: "sc-opt", name: "Optimistic", delta: 2 },
    ],
    activeScenarioId: "sc-exp",
    withdrawal: { age: 65, rate: 4 },
    displayMode: "nominal",
};
function migrate(loaded) {
    if (!loaded)
        return DEFAULT_STATE;
    const s = structuredClone(loaded);
    if (!s.theme)
        s.theme = "light";
    if (!s.scenarios || !s.scenarios.length)
        s.scenarios = DEFAULT_STATE.scenarios;
    if (!s.activeScenarioId || !s.scenarios.some((sc) => sc.id === s.activeScenarioId))
        s.activeScenarioId = s.scenarios[0].id;
    if (!s.displayMode)
        s.displayMode = "nominal";
    s.profile = s.profile || {};
    if (typeof s.profile.currentAge !== "number" || isNaN(s.profile.currentAge))
        s.profile.currentAge = DEFAULT_STATE.profile.currentAge;
    if (typeof s.profile.retirementAge !== "number" || isNaN(s.profile.retirementAge))
        s.profile.retirementAge = DEFAULT_STATE.profile.retirementAge;
    if (typeof s.profile.lifeExpectancy !== "number" || isNaN(s.profile.lifeExpectancy))
        s.profile.lifeExpectancy = DEFAULT_STATE.profile.lifeExpectancy;
    if (s.profile.lifeExpectancy < s.profile.currentAge)
        s.profile.lifeExpectancy = s.profile.currentAge; // guard against an inverted range producing a broken/empty simulation
    if (typeof s.profile.inflation !== "number" || isNaN(s.profile.inflation))
        s.profile.inflation = DEFAULT_STATE.profile.inflation;
    if (typeof s.profile.raiseRate !== "number" || isNaN(s.profile.raiseRate))
        s.profile.raiseRate = (s.income && s.income.growth) || DEFAULT_STATE.profile.raiseRate;
    s.accounts = (s.accounts || []).map((a) => ({
        id: a.id || uid(),
        name: a.name || "Account",
        type: a.type || "savings",
        balance: typeof a.balance === "number" && !isNaN(a.balance) ? a.balance : 0,
        returnRate: typeof a.returnRate === "number" && !isNaN(a.returnRate) ? a.returnRate : 0,
        locked: !!a.locked,
        unlockAge: typeof a.unlockAge === "number" && !isNaN(a.unlockAge) ? a.unlockAge : 59.5,
    }));
    if (s.accounts.length === 0)
        s.accounts = structuredClone(DEFAULT_STATE.accounts);
    if (!s.stages)
        s.stages = [];
    const legacyIncome = s.income ? s.income.annual : 0;
    s.stages.forEach((st) => {
        if (st.income === undefined || isNaN(st.income))
            st.income = legacyIncome || 0;
        if (st.taxRate === undefined || isNaN(st.taxRate))
            st.taxRate = 22;
        if (st.icon === undefined)
            st.icon = "Briefcase";
        if (typeof st.startAge !== "number" || isNaN(st.startAge))
            st.startAge = s.profile.currentAge;
        if (typeof st.endAge !== "number" || isNaN(st.endAge))
            st.endAge = s.profile.lifeExpectancy;
        st.expenses = (st.expenses || []).map((e) => ({
            id: e.id || uid(), name: e.name || "Expense",
            amount: typeof e.amount === "number" && !isNaN(e.amount) ? e.amount : 0,
            inflationAdjusted: e.inflationAdjusted !== false,
        }));
        if (!st.allocations) {
            // migrate old flat $ contributions into % of that stage's estimated surplus
            const totalExp = st.expenses.reduce((sum, e) => sum + e.amount, 0);
            const goalDollars = (s.goals || []).reduce((sum, g) => sum + goalAvgContribForStage(g, st, s.profile), 0);
            const estSurplus = st.income * (1 - st.taxRate / 100) - totalExp - goalDollars;
            const allocations = {};
            if (st.contributions && estSurplus > 0) {
                Object.entries(st.contributions).forEach(([accId, dollars]) => {
                    const pct = (dollars / estSurplus) * 100;
                    allocations[accId] = Math.max(0, Math.min(100, isNaN(pct) ? 0 : Math.round(pct)));
                });
            }
            st.allocations = allocations;
        }
        delete st.contributions;
    });
    if (s.stages.length === 0) {
        s.stages = [{ id: uid(), name: "Now", icon: "Briefcase", startAge: s.profile.currentAge, endAge: s.profile.lifeExpectancy,
                income: legacyIncome || 0, taxRate: 22, expenses: [], allocations: {} }];
    }
    s.goals = (s.goals || []).map((g) => ({
        id: g.id || uid(),
        name: g.name || "Goal",
        icon: g.icon || "Gift",
        targetAge: typeof g.targetAge === "number" && !isNaN(g.targetAge) ? g.targetAge : s.profile.currentAge + 5,
        cost: typeof g.cost === "number" && !isNaN(g.cost) ? g.cost : 0,
        returnRate: typeof g.returnRate === "number" && !isNaN(g.returnRate) ? g.returnRate : 0,
        prefundStartAge: typeof g.prefundStartAge === "number" && !isNaN(g.prefundStartAge) ? g.prefundStartAge : s.profile.currentAge,
        contribution: typeof g.contribution === "number" && !isNaN(g.contribution) ? g.contribution : 0,
    })).map((g) => (g.prefundStartAge >= g.targetAge ? { ...g, prefundStartAge: g.targetAge - 1 } : g)); // guard against an inverted/zero saving window
    s.events = (s.events || []).map((e) => ({
        id: e.id || uid(),
        name: e.name || "Event",
        age: typeof e.age === "number" && !isNaN(e.age) ? e.age : s.profile.currentAge,
        amount: typeof e.amount === "number" && !isNaN(e.amount) ? e.amount : 0,
        accountId: e.accountId || (s.accounts[0] ? s.accounts[0].id : ""),
        inflationAdjusted: e.inflationAdjusted !== false,
    }));
    s.withdrawal = s.withdrawal || {};
    if (typeof s.withdrawal.age !== "number" || isNaN(s.withdrawal.age))
        s.withdrawal.age = s.profile.retirementAge;
    if (typeof s.withdrawal.rate !== "number" || isNaN(s.withdrawal.rate))
        s.withdrawal.rate = 4;
    delete s.income;
    delete s.expenses;
    return s;
}
// ---------- simulation (full ledger detail) ----------
function simulate(state, scenarioDelta = 0) {
    const { profile, accounts, stages, goals } = state;
    const years = Math.max(0, profile.lifeExpectancy - profile.currentAge) + 1;
    let accBal = accounts.map((a) => a.balance);
    let goalBal = goals.map(() => 0);
    const goalPurchased = goals.map(() => false);
    const goalShortfall = goals.map(() => 0);
    const rows = [];
    const stageFor = (age) => stages.find((st) => age >= st.startAge && age <= st.endAge);
    let prevNetWorth = accBal.reduce((s, b) => s + b, 0);
    for (let t = 0; t < years; t++) {
        const age = profile.currentAge + t;
        const inflFactor = Math.pow(1 + profile.inflation / 100, t);
        const growthFactor = Math.pow(1 + profile.raiseRate / 100, t);
        const stage = stageFor(age);
        const goalDetail = goals.map((g, i) => {
            const startBal = goalBal[i];
            const rate = g.returnRate + scenarioDelta;
            let growth = 0, contribution = 0, purchase = 0;
            if (goalPurchased[i]) {
                // already purchased in a prior year: fund is closed out, nothing lingers
                goalBal[i] = 0;
                return { id: g.id, name: g.name, startBal: 0, growth: 0, contribution: 0, purchase: 0, endBal: 0 };
            }
            if (age > g.prefundStartAge - 1 && age < g.targetAge) {
                growth = startBal * (rate / 100);
                contribution = (g.contribution || 0) * inflFactor;
            }
            else if (age >= g.targetAge) {
                growth = startBal * (rate / 100);
            }
            let endBal = startBal + growth + contribution;
            if (age === g.targetAge) {
                purchase = g.cost * inflFactor;
                if (endBal < purchase)
                    goalShortfall[i] = purchase - endBal;
                endBal = 0; // fund closes out at purchase — any leftover or shortfall is not carried forward
                goalPurchased[i] = true;
            }
            goalBal[i] = endBal;
            return { id: g.id, name: g.name, startBal, growth, contribution, purchase, endBal };
        });
        const grossIncome = (stage ? stage.income : 0) * growthFactor;
        const taxRate = stage ? stage.taxRate : 0;
        const tax = grossIncome * (taxRate / 100);
        const afterTaxIncome = grossIncome - tax;
        const expenseItems = stage ? stage.expenses.map((e) => ({ name: e.name, amount: e.inflationAdjusted ? e.amount * inflFactor : e.amount })) : [];
        const totalExpenses = expenseItems.reduce((s2, e) => s2 + e.amount, 0);
        const goalContrib = goalDetail.reduce((s2, g) => s2 + g.contribution, 0);
        // goals (fixed $ targets) get first claim; whatever's left is split across accounts by %
        const investableSurplus = afterTaxIncome - totalExpenses - goalContrib;
        const allocations = stage && stage.allocations ? stage.allocations : {};
        const allocSum = accounts.reduce((s2, a) => s2 + (allocations[a.id] || 0), 0);
        const allocScale = allocSum > 100 ? 100 / allocSum : 1; // never let allocations claim more than 100% of the pool
        const eventsThisYear = state.events.filter((e) => e.age === age);
        const accountDetail = accounts.map((a, i) => {
            const startBal = accBal[i];
            const rate = a.returnRate + scenarioDelta;
            const growth = startBal * (rate / 100);
            const pct = (allocations[a.id] || 0) * allocScale;
            const contribution = investableSurplus > 0 ? investableSurplus * (pct / 100) : 0;
            const oneTime = eventsThisYear
                .filter((e) => e.accountId === a.id)
                .reduce((s2, e) => s2 + (e.inflationAdjusted ? e.amount * inflFactor : e.amount), 0);
            const endBal = startBal + growth + contribution + oneTime;
            accBal[i] = endBal;
            return { id: a.id, name: a.name, type: a.type, locked: a.locked, unlockAge: a.unlockAge, startBal, growth, contribution, oneTime, endBal };
        });
        const acctContrib = accountDetail.reduce((s2, a) => s2 + a.contribution, 0);
        const totalContrib = acctContrib + goalContrib;
        const surplus = investableSurplus - acctContrib; // unallocated cash left over (or the deficit, if negative)
        const netWorth = accBal.reduce((s2, b) => s2 + b, 0) + goalBal.reduce((s2, b) => s2 + Math.max(b, 0), 0);
        rows.push({
            age, inflFactor, stageName: stage ? stage.name : "No stage defined", stageIcon: stage ? stage.icon : null, stageTaxRate: taxRate,
            startNetWorth: prevNetWorth, netWorth, accounts: accountDetail, goals: goalDetail, eventsThisYear,
            grossIncome, tax, afterTaxIncome, expenseItems, totalExpenses, totalContrib, surplus,
        });
        prevNetWorth = netWorth;
    }
    return { rows, goalShortfall };
}
const dv = (nominal, inflFactor, mode) => (mode === "real" && inflFactor ? nominal / inflFactor : nominal);
// average annual amount a goal pulls from cash flow during a given stage's age range
// (a goal's saving window doesn't have to line up with stage boundaries)
// inflates the contribution the same way simulate() does, so the preview matches reality
function goalAvgContribForStage(goal, stage, profile) {
    let total = 0, years = 0;
    const currentAge = profile ? profile.currentAge : stage.startAge;
    const inflation = profile ? profile.inflation : 0;
    for (let age = stage.startAge; age <= stage.endAge; age++) {
        years++;
        if (age >= goal.prefundStartAge && age < goal.targetAge) {
            const inflFactor = Math.pow(1 + inflation / 100, Math.max(0, age - currentAge));
            total += (goal.contribution || 0) * inflFactor;
        }
    }
    return years ? total / years : 0;
}
// ---------- themed atoms ----------
function Field({ label, children, hint }) {
    const t = useContext(ThemeCtx);
    return (React.createElement("label", { className: "flex flex-col gap-1 text-sm" },
        React.createElement("span", { style: { color: t.textMuted }, className: "font-medium" }, label),
        children,
        hint && React.createElement("span", { style: { color: t.textMuted }, className: "text-xs opacity-80" }, hint)));
}
function MoneyInput({ value, onChange, className, ...props }) {
    const t = useContext(ThemeCtx);
    return (React.createElement("div", { className: "relative w-full" },
        React.createElement("span", { style: { color: t.textMuted }, className: "absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" }, "$"),
        React.createElement("input", { type: "number", inputMode: "decimal", value: value, onChange: onChange, ...props, style: { background: t.inputBg, borderColor: t.inputBorder, color: t.text }, className: "text-base font-mono border rounded-lg pl-6 pr-3 py-2.5 w-full focus:outline-none focus:ring-2 " + (className || "") })));
}
function PercentInput({ value, onChange, className, ...props }) {
    const t = useContext(ThemeCtx);
    return (React.createElement("div", { className: "relative w-full" },
        React.createElement("input", { type: "number", inputMode: "decimal", value: value, onChange: onChange, ...props, style: { background: t.inputBg, borderColor: t.inputBorder, color: t.text }, className: "text-base font-mono border rounded-lg pl-3 pr-7 py-2.5 w-full focus:outline-none focus:ring-2 " + (className || "") }),
        React.createElement("span", { style: { color: t.textMuted }, className: "absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" }, "%")));
}
function NumInput(props) {
    const t = useContext(ThemeCtx);
    return React.createElement("input", { type: "number", inputMode: "decimal", ...props, style: { background: t.inputBg, borderColor: t.inputBorder, color: t.text, ...(props.style || {}) }, className: "text-base font-mono border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 w-full " + (props.className || "") });
}
function TextInput(props) {
    const t = useContext(ThemeCtx);
    return React.createElement("input", { type: "text", ...props, style: { background: t.inputBg, borderColor: t.inputBorder, color: t.text, ...(props.style || {}) }, className: "text-base border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 " + (props.className || "") });
}
function Select(props) {
    const t = useContext(ThemeCtx);
    return React.createElement("select", { ...props, style: { background: t.inputBg, borderColor: t.inputBorder, color: t.text }, className: "text-base border rounded-lg px-3 py-2.5" });
}
function Card({ title, subtitle, children, right, icon: Icon }) {
    const t = useContext(ThemeCtx);
    return (React.createElement("div", { style: { background: t.card, borderColor: t.cardBorder }, className: "border rounded-2xl shadow-sm overflow-hidden" },
        React.createElement("div", { style: { borderColor: t.cardBorder }, className: "flex items-start justify-between gap-2 px-4 pt-4 pb-3 border-b" },
            React.createElement("div", { className: "flex items-start gap-2.5" },
                Icon && React.createElement("div", { style: { background: t.accentSoft, color: t.accent }, className: "p-2 rounded-xl shrink-0" },
                    React.createElement(Icon, { size: 16 })),
                React.createElement("div", null,
                    React.createElement("h3", { style: { color: t.text }, className: "font-serif text-lg leading-tight" }, title),
                    subtitle && React.createElement("p", { style: { color: t.textMuted }, className: "text-xs mt-0.5" }, subtitle))),
            right),
        React.createElement("div", { className: "p-4" }, children)));
}
function RemoveBtn({ onClick }) {
    const t = useContext(ThemeCtx);
    return React.createElement("button", { onClick: onClick, style: { color: t.dangerText }, className: "text-xs font-medium px-2 py-1.5 rounded-lg active:opacity-60" }, "Remove");
}
function AddBtn({ onClick, children }) {
    const t = useContext(ThemeCtx);
    return React.createElement("button", { onClick: onClick, style: { color: t.accent, borderColor: t.accent + "50" }, className: "text-sm font-medium border rounded-lg px-3 py-2 active:opacity-60 whitespace-nowrap" },
        "+ ",
        children);
}
function DollarTag({ mode }) {
    const t = useContext(ThemeCtx);
    return React.createElement("span", { style: { borderColor: mode === "real" ? t.warnBorder : t.accent, color: mode === "real" ? t.warnText : t.accent, background: mode === "real" ? t.warnBg : t.accentSoft }, className: "text-[11px] font-medium px-2 py-1 rounded-full border" }, mode === "real" ? "today's $" : "future $");
}
function IconPicker({ options, value, onChange }) {
    const t = useContext(ThemeCtx);
    return (React.createElement("div", { className: "flex gap-2 flex-wrap" }, options.map((key) => {
        const I = ICONS[key];
        const active = value === key;
        return (React.createElement("button", { key: key, onClick: () => onChange(key), type: "button", style: { background: active ? t.accent : t.chip, color: active ? "#fff" : t.textMuted, borderColor: active ? t.accent : t.inputBorder }, className: "p-2.5 rounded-xl border active:opacity-70" },
            React.createElement(I, { size: 16 })));
    })));
}
function RangeSlider({ min, max, start, end, onStartChange, onEndChange }) {
    const t = useContext(ThemeCtx);
    const pct = (v) => ((v - min) / (max - min)) * 100;
    return (React.createElement("div", { className: "relative h-6 flex items-center" },
        React.createElement("style", null, `.dual-range{-webkit-appearance:none;appearance:none;background:transparent;pointer-events:none;position:absolute;left:0;right:0;width:100%;margin:0;}
      .dual-range::-webkit-slider-thumb{-webkit-appearance:none;pointer-events:auto;width:18px;height:18px;border-radius:9999px;background:${t.accent};border:2px solid ${t.card};box-shadow:0 1px 3px rgba(0,0,0,0.3);cursor:pointer;margin-top:-8px;}
      .dual-range::-moz-range-thumb{pointer-events:auto;width:18px;height:18px;border-radius:9999px;background:${t.accent};border:2px solid ${t.card};cursor:pointer;}
      .dual-range::-webkit-slider-runnable-track{height:2px;background:transparent;}
      .dual-range::-moz-range-track{height:2px;background:transparent;}`),
        React.createElement("div", { className: "absolute w-full h-1.5 rounded-full", style: { background: t.inputBorder } }),
        React.createElement("div", { className: "absolute h-1.5 rounded-full", style: { background: t.accent, left: pct(start) + "%", width: pct(end) - pct(start) + "%" } }),
        React.createElement("input", { type: "range", min: min, max: max, value: start, className: "dual-range", onChange: (e) => onStartChange(Math.min(+e.target.value, end - 1)) }),
        React.createElement("input", { type: "range", min: min, max: max, value: end, className: "dual-range", onChange: (e) => onEndChange(Math.max(+e.target.value, start + 1)) })));
}
function StatusPill({ ok, okText, badText }) {
    const t = useContext(ThemeCtx);
    return React.createElement("span", { style: { background: ok ? t.goodSoft : t.dangerSoft, color: ok ? t.goodText : t.dangerText }, className: "text-[11px] font-medium px-2 py-1 rounded-full" }, ok ? okText : badText);
}
// ---------- main ----------
function FinancialPlanner() {
    const [state, setState] = useState(DEFAULT_STATE);
    const [tab, setTab] = useState("profile");
    const [loaded, setLoaded] = useState(false);
    const [expandedYear, setExpandedYear] = useState(null);
    const [expandedGoal, setExpandedGoal] = useState(null);
    const [healthOpen, setHealthOpen] = useState(true);
    const [chartMode, setChartMode] = useState("stacked"); // 'stacked' | 'lines'
    const [snapshotAge, setSnapshotAge] = useState(null);
    const saveTimer = useRef(null);
    useEffect(() => {
        (async () => {
            try {
                const res = await window.storage.get("financial-plan", false);
                if (res && res.value)
                    setState(migrate(JSON.parse(res.value)));
            }
            catch (e) { }
            setLoaded(true);
        })();
    }, []);
    useEffect(() => {
        if (!loaded)
            return;
        if (saveTimer.current)
            clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => { try {
            await window.storage.set("financial-plan", JSON.stringify(state), false);
        }
        catch (e) { } }, 500);
        return () => clearTimeout(saveTimer.current);
    }, [state, loaded]);
    const t = THEMES[state.theme] || THEMES.light;
    const mode = state.displayMode;
    const activeScenario = state.scenarios.find((s) => s.id === state.activeScenarioId) || state.scenarios[0];
    const { rows, goalShortfall } = useMemo(() => simulate(state, activeScenario.delta), [state, activeScenario]);
    const allScenarioRuns = useMemo(() => state.scenarios.map((sc) => ({ scenario: sc, rows: simulate(state, sc.delta).rows })), [state]);
    const investableTypes = ["savings", "investment"];
    const chartData = useMemo(() => rows.map((r) => {
        const o = { age: r.age };
        r.accounts.forEach((a) => (o[a.name + (a.locked ? " 🔒" : "")] = Math.round(dv(a.endBal, r.inflFactor, mode))));
        r.goals.forEach((g) => (o["Goal: " + g.name] = Math.round(dv(Math.max(g.endBal, 0), r.inflFactor, mode))));
        return o;
    }), [rows, mode]);
    const cashflowData = useMemo(() => rows.map((r) => ({ age: r.age, "After-tax income": Math.round(dv(r.afterTaxIncome, r.inflFactor, mode)), Expenses: Math.round(dv(r.totalExpenses, r.inflFactor, mode)), Surplus: Math.round(dv(r.surplus, r.inflFactor, mode)) })), [rows, mode]);
    const scenarioCompareData = useMemo(() => {
        const base = allScenarioRuns[0].rows;
        return base.map((_, idx) => {
            const o = { age: base[idx].age };
            allScenarioRuns.forEach(({ scenario, rows: r }) => (o[scenario.name] = Math.round(dv(r[idx].netWorth, r[idx].inflFactor, mode))));
            return o;
        });
    }, [allScenarioRuns, mode]);
    const fiSeries = useMemo(() => rows.map((r) => {
        const investable = r.accounts.reduce((s, a) => (investableTypes.includes(a.type) && !(a.locked && r.age < a.unlockAge) ? s + a.endBal : s), 0);
        const sustainable = investable * (state.withdrawal.rate / 100) * (1 - r.stageTaxRate / 100);
        return { age: r.age, nominalExpenses: r.totalExpenses, nominalSustainable: sustainable, inflFactor: r.inflFactor,
            Expenses: Math.round(dv(r.totalExpenses, r.inflFactor, mode)), "Sustainable income": Math.round(dv(sustainable, r.inflFactor, mode)) };
    }), [rows, state.withdrawal.rate, mode]);
    const crossover = fiSeries.find((r) => r.nominalSustainable >= r.nominalExpenses && r.nominalExpenses > 0);
    const atRetirement = rows.find((r) => r.age === state.profile.retirementAge) || rows[rows.length - 1];
    const atEnd = rows[rows.length - 1];
    const today = rows[0];
    const withdrawalRow = rows.find((r) => r.age === state.withdrawal.age) || atRetirement;
    const lockedExcluded = state.accounts.filter((a) => investableTypes.includes(a.type) && a.locked && state.withdrawal.age < a.unlockAge);
    const investableBalanceNominal = withdrawalRow ? withdrawalRow.accounts.reduce((s, a) => (investableTypes.includes(a.type) && !(a.locked && state.withdrawal.age < a.unlockAge) ? s + a.endBal : s), 0) : 0;
    const withdrawalTaxRate = withdrawalRow ? withdrawalRow.stageTaxRate : 0;
    const annualWithdrawalNominal = investableBalanceNominal * (state.withdrawal.rate / 100);
    const annualWithdrawalAfterTax = annualWithdrawalNominal * (1 - withdrawalTaxRate / 100);
    const monthlyWithdrawalNominal = annualWithdrawalNominal / 12;
    const monthlyWithdrawalAfterTax = annualWithdrawalAfterTax / 12;
    const monthlyWithdrawalReal = monthlyWithdrawalAfterTax / (withdrawalRow ? withdrawalRow.inflFactor : 1);
    const stageSummaries = useMemo(() => {
        const map = {};
        state.stages.forEach((s) => {
            const totalExp = s.expenses.reduce((sum, e) => sum + e.amount, 0);
            const activeGoals = state.goals.map((g) => ({ g, avg: goalAvgContribForStage(g, s, state.profile) })).filter((x) => x.avg > 0);
            const goalContribTotal = activeGoals.reduce((sum, x) => sum + x.avg, 0);
            const afterTax = s.income * (1 - s.taxRate / 100);
            const investable = afterTax - totalExp - goalContribTotal; // what's left for accounts to split by %
            const allocSum = state.accounts.reduce((sum, a) => sum + (s.allocations[a.id] || 0), 0);
            const allocScale = allocSum > 100 ? 100 / allocSum : 1;
            const accountEstimates = state.accounts.map((a) => {
                const pct = (s.allocations[a.id] || 0) * allocScale;
                return { account: a, pct, dollars: investable > 0 ? investable * (pct / 100) : 0 };
            });
            const acctContrib = accountEstimates.reduce((sum, x) => sum + x.dollars, 0);
            const unallocatedPct = Math.max(0, 100 - allocSum * allocScale);
            const unallocatedCash = investable > 0 ? investable * (unallocatedPct / 100) : 0;
            const totalContrib = acctContrib + goalContribTotal;
            const net = investable; // sign of this = can this stage actually afford its goals+expenses at all
            map[s.id] = { totalExp, acctContrib, accountEstimates, allocSum, unallocatedCash, activeGoals, goalContribTotal, totalContrib, afterTax, net };
        });
        return map;
    }, [state.stages, state.accounts, state.goals, state.profile]);
    const stageGaps = useMemo(() => {
        const sorted = [...state.stages].sort((a, b) => a.startAge - b.startAge);
        const gaps = [];
        let cursor = state.profile.currentAge;
        sorted.forEach((st) => { if (st.startAge > cursor)
            gaps.push([cursor, st.startAge - 1]); cursor = Math.max(cursor, st.endAge + 1); });
        if (cursor <= state.profile.lifeExpectancy)
            gaps.push([cursor, state.profile.lifeExpectancy]);
        return gaps;
    }, [state.stages, state.profile]);
    const healthIssues = useMemo(() => {
        const issues = [];
        if (state.profile.lifeExpectancy < state.profile.currentAge)
            issues.push({ tab: "profile", text: `"Plan to age" (${state.profile.lifeExpectancy}) is earlier than your current age (${state.profile.currentAge}) — the projection has nothing to show.` });
        if (stageGaps.length > 0)
            issues.push({ tab: "stages", text: `No stage covers age${stageGaps.length > 1 ? "s" : ""} ${stageGaps.map(([a, b]) => (a === b ? a : `${a}–${b}`)).join(", ")}.` });
        [...state.stages].sort((a, b) => a.startAge - b.startAge).forEach((s) => {
            const sum = stageSummaries[s.id];
            if (sum && sum.net < 0)
                issues.push({ tab: "stages", text: `"${s.name}" (age ${s.startAge}–${s.endAge}) can't cover its own expenses & goals — short ${fmt(sum.net)}/yr.` });
            if (sum && sum.allocSum > 100)
                issues.push({ tab: "stages", text: `"${s.name}" allocations add up to ${sum.allocSum}% — scaled down automatically, but worth tidying up.` });
        });
        state.goals.forEach((g, i) => { if (goalShortfall[i] > 0)
            issues.push({ tab: "goals", text: `"${g.name}" falls short by ${fmt(goalShortfall[i])} at the purchase age.` }); });
        const wentNegative = rows.find((r) => r.netWorth < 0);
        if (wentNegative)
            issues.push({ tab: "projection", text: `Net worth goes negative around age ${wentNegative.age} under the "${activeScenario.name}" scenario.` });
        if (investableBalanceNominal <= 0 && state.withdrawal.age >= state.profile.retirementAge)
            issues.push({ tab: "projection", text: `No investable balance at age ${state.withdrawal.age} to support withdrawals.` });
        const lockedStillLocked = state.accounts.filter((a) => a.locked && state.profile.retirementAge < a.unlockAge);
        if (lockedStillLocked.length > 0)
            issues.push({ tab: "profile", text: `${lockedStillLocked.map((a) => a.name).join(", ")} unlock${lockedStillLocked.length === 1 ? "s" : ""} after your planned retirement age.` });
        state.events.forEach((ev) => {
            if (!state.accounts.some((a) => a.id === ev.accountId))
                issues.push({ tab: "goals", text: `"${ev.name}" points at an account that no longer exists — it currently has no effect.` });
        });
        const flaggedNegativeAccounts = new Set();
        rows.forEach((r) => {
            r.accounts.forEach((a) => {
                if (a.endBal < 0 && !flaggedNegativeAccounts.has(a.id)) {
                    flaggedNegativeAccounts.add(a.id);
                    issues.push({ tab: "goals", text: `${a.name} goes negative at age ${r.age} — a one-time outflow may be larger than the balance at that point.` });
                }
            });
        });
        return issues;
    }, [stageGaps, state.stages, state.goals, state.accounts, state.events, state.profile, state.withdrawal, stageSummaries, goalShortfall, rows, investableBalanceNominal, activeScenario]);
    const update = (path, value) => setState((prev) => { const next = structuredClone(prev); let obj = next; for (let i = 0; i < path.length - 1; i++)
        obj = obj[path[i]]; obj[path[path.length - 1]] = value; return next; });
    const updateListItem = (listName, id, field, value) => setState((prev) => ({ ...prev, [listName]: prev[listName].map((item) => (item.id === id ? { ...item, [field]: value } : item)) }));
    const removeListItem = (listName, id) => setState((prev) => ({ ...prev, [listName]: prev[listName].filter((item) => item.id !== id) }));
    const addAccount = () => setState((prev) => ({ ...prev, accounts: [...prev.accounts, { id: uid(), name: "New account", type: "savings", balance: 0, returnRate: 3, locked: false, unlockAge: 59.5 }] }));
    const addStage = () => setState((prev) => { const lastEnd = prev.stages.length ? Math.max(...prev.stages.map((s) => s.endAge)) : prev.profile.currentAge - 1; return { ...prev, stages: [...prev.stages, { id: uid(), name: "New stage", icon: "Sparkles", startAge: lastEnd + 1, endAge: Math.min(lastEnd + 5, prev.profile.lifeExpectancy), income: 0, taxRate: 22, expenses: [], allocations: {} }] }; });
    const removeStage = (id) => setState((prev) => ({ ...prev, stages: prev.stages.filter((s) => s.id !== id) }));
    const updateStage = (id, field, value) => setState((prev) => ({ ...prev, stages: prev.stages.map((s) => (s.id === id ? { ...s, [field]: value } : s)) }));
    const addStageExpense = (stageId) => setState((prev) => ({ ...prev, stages: prev.stages.map((s) => (s.id === stageId ? { ...s, expenses: [...s.expenses, { id: uid(), name: "New expense", amount: 5000, inflationAdjusted: true }] } : s)) }));
    const updateStageExpense = (stageId, expId, field, value) => setState((prev) => ({ ...prev, stages: prev.stages.map((s) => (s.id === stageId ? { ...s, expenses: s.expenses.map((e) => (e.id === expId ? { ...e, [field]: value } : e)) } : s)) }));
    const removeStageExpense = (stageId, expId) => setState((prev) => ({ ...prev, stages: prev.stages.map((s) => (s.id === stageId ? { ...s, expenses: s.expenses.filter((e) => e.id !== expId) } : s)) }));
    const updateStageAllocation = (stageId, accountId, value) => setState((prev) => ({ ...prev, stages: prev.stages.map((s) => (s.id === stageId ? { ...s, allocations: { ...s.allocations, [accountId]: Math.max(0, Math.min(100, value)) } } : s)) }));
    const addGoal = () => setState((prev) => ({ ...prev, goals: [...prev.goals, { id: uid(), name: "New goal", icon: "Gift", targetAge: prev.profile.currentAge + 5, cost: 10000, returnRate: 3, prefundStartAge: prev.profile.currentAge + 1, contribution: 2000 }] }));
    const addEvent = () => setState((prev) => ({ ...prev, events: [...prev.events, { id: uid(), name: "New event", age: prev.profile.currentAge + 3, amount: 5000, accountId: prev.accounts[0] ? prev.accounts[0].id : "", inflationAdjusted: true }] }));
    const addScenario = () => setState((prev) => ({ ...prev, scenarios: [...prev.scenarios, { id: uid(), name: "New scenario", delta: 0 }] }));
    const removeScenario = (id) => setState((prev) => { if (prev.scenarios.length <= 1)
        return prev; const scenarios = prev.scenarios.filter((s) => s.id !== id); return { ...prev, scenarios, activeScenarioId: prev.activeScenarioId === id ? scenarios[0].id : prev.activeScenarioId }; });
    const resetAll = () => { if (confirm("Reset the whole plan back to the starting example? This can't be undone."))
        setState(DEFAULT_STATE); };
    const importInputRef = useRef(null);
    const exportBackup = () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "financial-plan-backup-" + new Date().toISOString().slice(0, 10) + ".json";
        a.click();
        URL.revokeObjectURL(url);
    };
    const importBackup = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = migrate(JSON.parse(reader.result));
                setState(parsed);
            }
            catch (err) {
                alert("Couldn't read that file — make sure it's a backup exported from this app.");
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };
    const toggleTheme = () => update(["theme"], state.theme === "dark" ? "light" : "dark");
    const tabs = [
        { id: "profile", label: "Accounts", Icon: Wallet },
        { id: "stages", label: "Stages", Icon: CalendarRange },
        { id: "goals", label: "Goals", Icon: Target },
        { id: "scenarios", label: "Scenarios", Icon: TrendingUp },
        { id: "projection", label: "Projection", Icon: LineChartIcon },
    ];
    return (React.createElement(ThemeCtx.Provider, { value: t },
        React.createElement("div", { style: { background: t.bg, color: t.text }, className: "min-h-screen font-sans flex flex-col" },
            React.createElement("div", { style: { background: t.hero, color: t.heroText, paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }, className: "px-4 pb-5" },
                React.createElement("div", { className: "flex items-center justify-between gap-2 mb-2" },
                    React.createElement("p", { style: { color: t.heroMuted }, className: "uppercase tracking-widest text-[10px] font-medium" }, "Financial plan"),
                    React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement("button", { onClick: toggleTheme, style: { background: "rgba(255,255,255,0.1)" }, className: "p-3 rounded-full active:opacity-60" }, state.theme === "dark" ? React.createElement(Sun, { size: 16, color: t.heroText }) : React.createElement(Moon, { size: 16, color: t.heroText })),
                        React.createElement("div", { style: { background: "rgba(255,255,255,0.1)" }, className: "flex items-center rounded-full p-1" },
                            React.createElement("button", { onClick: () => update(["displayMode"], "nominal"), style: mode === "nominal" ? { background: t.heroText, color: t.hero } : { color: t.heroMuted }, className: "text-[11px] px-3 py-2.5 rounded-full font-medium" }, "Future"),
                            React.createElement("button", { onClick: () => update(["displayMode"], "real"), style: mode === "real" ? { background: t.heroText, color: t.hero } : { color: t.heroMuted }, className: "text-[11px] px-3 py-2.5 rounded-full font-medium" }, "Today's")))),
                React.createElement("h1", { className: "font-serif text-xl mb-1" }, "Where your money is headed"),
                React.createElement("p", { style: { color: t.heroMuted }, className: "text-[11px] mb-4" },
                    activeScenario.name,
                    " scenario (",
                    activeScenario.delta >= 0 ? "+" : "",
                    activeScenario.delta,
                    "pp) \u00B7 ",
                    mode === "real" ? "today's $" : "future $",
                    " \u00B7 after-tax"),
                React.createElement("div", { className: "grid grid-cols-3 gap-2" },
                    React.createElement("div", null,
                        React.createElement("p", { style: { color: t.heroMuted }, className: "text-[10px]" },
                            "Today (age ",
                            state.profile.currentAge,
                            ")"),
                        React.createElement("p", { className: "font-mono text-base" }, fmt(today ? dv(today.netWorth, today.inflFactor, mode) : 0))),
                    React.createElement("div", null,
                        React.createElement("p", { style: { color: t.heroMuted }, className: "text-[10px]" },
                            "Retirement (",
                            state.profile.retirementAge,
                            ")"),
                        React.createElement("p", { className: "font-mono text-base" }, fmt(atRetirement ? dv(atRetirement.netWorth, atRetirement.inflFactor, mode) : 0))),
                    React.createElement("div", null,
                        React.createElement("p", { style: { color: t.heroMuted }, className: "text-[10px]" },
                            "Age ",
                            state.profile.lifeExpectancy),
                        React.createElement("p", { className: "font-mono text-base" }, fmt(atEnd ? dv(atEnd.netWorth, atEnd.inflFactor, mode) : 0))))),
            React.createElement("div", { className: "flex-1 p-4 max-w-3xl w-full mx-auto flex flex-col gap-4 pb-28" },
                healthIssues.length > 0 && healthOpen && (React.createElement("div", { style: { background: t.warnBg, borderColor: t.warnBorder }, className: "border rounded-xl overflow-hidden" },
                    React.createElement("div", { className: "flex items-center justify-between px-3 pt-3" },
                        React.createElement("p", { style: { color: t.warnText }, className: "text-sm font-medium flex items-center gap-1.5" },
                            React.createElement(AlertTriangle, { size: 15 }),
                            " Plan health \u2014 ",
                            healthIssues.length,
                            " thing",
                            healthIssues.length > 1 ? "s" : "",
                            " to look at"),
                        React.createElement("button", { onClick: () => setHealthOpen(false), className: "p-1 active:opacity-60" },
                            React.createElement(X, { size: 15, color: t.warnText }))),
                    React.createElement("div", { className: "flex flex-col gap-1.5 p-3" }, healthIssues.map((issue, i) => (React.createElement("button", { key: i, onClick: () => setTab(issue.tab), style: { background: "rgba(0,0,0,0.04)", color: t.warnText }, className: "text-left text-xs px-2.5 py-2 rounded-lg" }, issue.text)))))),
                healthIssues.length === 0 && (React.createElement("div", { style: { background: t.goodSoft, color: t.goodText, borderColor: t.goodText + "40" }, className: "border rounded-xl px-3 py-2.5 flex items-center gap-2 text-sm font-medium" },
                    React.createElement(CheckCircle2, { size: 15 }),
                    " No issues detected \u2014 plan looks internally consistent.")),
                tab === "profile" && (React.createElement(React.Fragment, null,
                    React.createElement(Card, { icon: CalendarRange, title: "Profile", subtitle: "The timeline the whole plan runs on" },
                        React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                            React.createElement(Field, { label: "Current age" },
                                React.createElement(NumInput, { value: state.profile.currentAge, onChange: (e) => update(["profile", "currentAge"], +e.target.value) })),
                            React.createElement(Field, { label: "Retirement age" },
                                React.createElement(NumInput, { value: state.profile.retirementAge, onChange: (e) => update(["profile", "retirementAge"], +e.target.value) })),
                            React.createElement(Field, { label: "Plan to age" },
                                React.createElement(NumInput, { value: state.profile.lifeExpectancy, onChange: (e) => update(["profile", "lifeExpectancy"], +e.target.value) })),
                            React.createElement(Field, { label: "Inflation" },
                                React.createElement(PercentInput, { step: "0.1", value: state.profile.inflation, onChange: (e) => update(["profile", "inflation"], +e.target.value) })),
                            React.createElement(Field, { label: "Annual raise rate", hint: "Applied to income & contributions" },
                                React.createElement(PercentInput, { step: "0.1", value: state.profile.raiseRate, onChange: (e) => update(["profile", "raiseRate"], +e.target.value) })))),
                    React.createElement(Card, { icon: Wallet, title: "Accounts", subtitle: "Income & tax are now set per life stage on the Stages tab", right: React.createElement(AddBtn, { onClick: addAccount }, "Account") },
                        React.createElement("div", { className: "flex flex-col gap-3" }, state.accounts.map((a) => (React.createElement("div", { key: a.id, style: { background: t.inputBg, borderColor: t.inputBorder }, className: "border rounded-xl p-3" },
                            React.createElement("div", { className: "flex items-center justify-between mb-2 gap-2" },
                                React.createElement("div", { className: "flex items-center gap-1.5 flex-1" },
                                    a.locked && React.createElement(Lock, { size: 13, color: t.warnText }),
                                    React.createElement(TextInput, { className: "font-medium flex-1", value: a.name, onChange: (e) => updateListItem("accounts", a.id, "name", e.target.value) })),
                                React.createElement(RemoveBtn, { onClick: () => removeListItem("accounts", a.id) })),
                            React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                                React.createElement(Field, { label: "Type" },
                                    React.createElement(Select, { value: a.type, onChange: (e) => updateListItem("accounts", a.id, "type", e.target.value) }, Object.entries(TYPE_LABELS).map(([k, v]) => React.createElement("option", { key: k, value: k }, v)))),
                                React.createElement(Field, { label: "Balance today" },
                                    React.createElement(MoneyInput, { value: a.balance, onChange: (e) => updateListItem("accounts", a.id, "balance", +e.target.value) })),
                                React.createElement(Field, { label: "Base return", hint: "Shifted per scenario" },
                                    React.createElement(PercentInput, { step: "0.1", value: a.returnRate, onChange: (e) => updateListItem("accounts", a.id, "returnRate", +e.target.value) })),
                                React.createElement("label", { className: "flex items-end gap-2 text-sm pb-2.5", style: { color: t.textMuted } },
                                    React.createElement("input", { type: "checkbox", checked: a.locked, onChange: (e) => updateListItem("accounts", a.id, "locked", e.target.checked) }),
                                    "Locked (401k/IRA)")),
                            a.locked && React.createElement("div", { className: "mt-3" },
                                React.createElement(Field, { label: "Unlocks at age", hint: "Excluded from withdrawals until then" },
                                    React.createElement(NumInput, { step: "0.5", value: a.unlockAge, onChange: (e) => updateListItem("accounts", a.id, "unlockAge", +e.target.value) })))))))))),
                tab === "stages" && (React.createElement(React.Fragment, null,
                    React.createElement(Card, { icon: CalendarRange, title: "Life stages", subtitle: "Each chapter has its own income, tax rate, expenses & contributions", right: React.createElement(AddBtn, { onClick: addStage }, "Stage") },
                        React.createElement("div", { className: "flex flex-col gap-4" },
                            [...state.stages].sort((a, b) => a.startAge - b.startAge).map((s) => {
                                const { totalExp, activeGoals, goalContribTotal, accountEstimates, allocSum, unallocatedCash, afterTax, net } = stageSummaries[s.id];
                                const StageIcon = ICONS[s.icon] || Sparkles;
                                return (React.createElement("div", { key: s.id, style: { background: t.inputBg, borderColor: t.inputBorder }, className: "border rounded-xl p-3" },
                                    React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                                        React.createElement("div", { style: { background: t.accentSoft, color: t.accent }, className: "p-2 rounded-lg" },
                                            React.createElement(StageIcon, { size: 16 })),
                                        React.createElement(TextInput, { className: "font-serif text-base flex-1", value: s.name, onChange: (e) => updateStage(s.id, "name", e.target.value) }),
                                        React.createElement(RemoveBtn, { onClick: () => removeStage(s.id) })),
                                    React.createElement(IconPicker, { options: STAGE_ICON_OPTS, value: s.icon, onChange: (k) => updateStage(s.id, "icon", k) }),
                                    React.createElement("div", { className: "grid grid-cols-2 gap-3 my-4" },
                                        React.createElement(Field, { label: "From age" },
                                            React.createElement(NumInput, { value: s.startAge, onChange: (e) => updateStage(s.id, "startAge", +e.target.value) })),
                                        React.createElement(Field, { label: "To age" },
                                            React.createElement(NumInput, { value: s.endAge, onChange: (e) => updateStage(s.id, "endAge", +e.target.value) })),
                                        React.createElement(Field, { label: "Annual income (today's $)" },
                                            React.createElement(MoneyInput, { value: s.income, onChange: (e) => updateStage(s.id, "income", +e.target.value) })),
                                        React.createElement(Field, { label: "Effective tax rate" },
                                            React.createElement(PercentInput, { step: "0.5", value: s.taxRate, onChange: (e) => updateStage(s.id, "taxRate", +e.target.value) }))),
                                    React.createElement("p", { style: { color: t.textMuted }, className: "text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-1" },
                                        React.createElement(Receipt, { size: 12 }),
                                        " Expenses ",
                                        React.createElement("span", { className: "normal-case opacity-70" }, "(today's $/yr)")),
                                    React.createElement("div", { className: "flex flex-col gap-2 mb-2" }, s.expenses.map((e) => (React.createElement("div", { key: e.id, className: "flex items-center gap-2 flex-wrap" },
                                        React.createElement(TextInput, { className: "flex-1 min-w-[90px]", value: e.name, onChange: (ev) => updateStageExpense(s.id, e.id, "name", ev.target.value) }),
                                        React.createElement(MoneyInput, { className: "w-28", value: e.amount, onChange: (ev) => updateStageExpense(s.id, e.id, "amount", +ev.target.value) }),
                                        React.createElement("label", { className: "flex items-center gap-1 text-xs", style: { color: t.textMuted } },
                                            React.createElement("input", { type: "checkbox", checked: e.inflationAdjusted, onChange: (ev) => updateStageExpense(s.id, e.id, "inflationAdjusted", ev.target.checked) }),
                                            " infl."),
                                        React.createElement(RemoveBtn, { onClick: () => removeStageExpense(s.id, e.id) }))))),
                                    React.createElement("button", { onClick: () => addStageExpense(s.id), style: { color: t.accent }, className: "text-xs font-medium mb-4" }, "+ add expense"),
                                    activeGoals.length > 0 && (React.createElement("div", { className: "mb-4" },
                                        React.createElement("p", { style: { color: t.textMuted }, className: "text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-1" },
                                            React.createElement(Target, { size: 12 }),
                                            " Goals saving during this stage ",
                                            React.createElement("span", { className: "normal-case opacity-70" }, "(fixed $, set on Goals tab, claimed first)")),
                                        React.createElement("div", { className: "flex flex-col gap-1" }, activeGoals.map(({ g, avg }) => {
                                            const GIcon = ICONS[g.icon] || Gift;
                                            return (React.createElement("div", { key: g.id, style: { background: t.chip }, className: "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-mono" },
                                                React.createElement("span", { style: { color: t.text }, className: "flex items-center gap-1.5 font-sans" },
                                                    React.createElement(GIcon, { size: 12 }),
                                                    " ",
                                                    g.name),
                                                React.createElement("span", { style: { color: t.textMuted } },
                                                    "~",
                                                    fmt(avg),
                                                    "/yr avg")));
                                        })))),
                                    React.createElement("p", { style: { color: t.textMuted }, className: "text-xs font-medium uppercase tracking-wide mb-1 flex items-center gap-1" },
                                        React.createElement(Wallet, { size: 12 }),
                                        " Then split what's left across accounts, by %"),
                                    React.createElement("p", { style: { color: t.textMuted }, className: "text-xs font-mono mb-2" },
                                        "Available to allocate: ~",
                                        fmt(Math.max(net, 0)),
                                        "/yr",
                                        net < 0 && React.createElement("span", { style: { color: t.dangerText } }, " (negative \u2014 nothing to allocate)")),
                                    React.createElement("div", { className: "flex flex-col gap-2" }, state.accounts.map((a) => {
                                        const est = accountEstimates.find((x) => x.account.id === a.id);
                                        return (React.createElement("div", { key: a.id, style: { background: t.chip }, className: "rounded-lg p-2.5" },
                                            React.createElement("div", { className: "flex items-center gap-2 mb-1.5" },
                                                a.locked && React.createElement(Lock, { size: 12, color: t.warnText }),
                                                React.createElement("span", { style: { color: t.text }, className: "text-sm font-medium flex-1 truncate" }, a.name),
                                                React.createElement("span", { style: { background: t.accentSoft, color: t.accent }, className: "text-[10px] font-mono px-1.5 py-0.5 rounded-full" }, TYPE_LABELS[a.type])),
                                            React.createElement("div", { className: "flex items-center gap-3" },
                                                React.createElement(PercentInput, { className: "w-28", value: s.allocations[a.id] || 0, onChange: (e) => updateStageAllocation(s.id, a.id, +e.target.value) }),
                                                React.createElement("span", { style: { color: t.textMuted }, className: "text-xs" }, "of surplus"),
                                                React.createElement("span", { style: { color: t.accent }, className: "text-xs font-mono ml-auto shrink-0" },
                                                    "\u2248 ",
                                                    fmt(est ? est.dollars : 0),
                                                    "/yr"))));
                                    })),
                                    React.createElement("div", { className: "flex items-center justify-between mt-2 text-xs font-mono", style: { color: allocSum > 100 ? t.dangerText : t.textMuted } },
                                        React.createElement("span", null,
                                            allocSum,
                                            "% allocated",
                                            allocSum > 100 ? " — scaled down to fit 100%" : ""),
                                        React.createElement("span", null,
                                            fmt(unallocatedCash),
                                            "/yr unallocated cash")),
                                    React.createElement("div", { style: { borderColor: t.cardBorder }, className: "mt-3 pt-3 border-t flex items-center justify-between flex-wrap gap-2" },
                                        React.createElement("div", { style: { color: t.textMuted }, className: "text-xs font-mono flex gap-3 flex-wrap" },
                                            React.createElement("span", null,
                                                "After-tax income: ",
                                                fmt(afterTax),
                                                "/yr"),
                                            React.createElement("span", null,
                                                "Expenses: ",
                                                fmt(totalExp),
                                                "/yr"),
                                            React.createElement("span", null,
                                                "Goal claims: ",
                                                fmt(goalContribTotal),
                                                "/yr")),
                                        React.createElement(StatusPill, { ok: net >= 0, okText: "Can cover it", badText: fmt(net) + "/yr short" }))));
                            }),
                            state.stages.length === 0 && React.createElement("p", { style: { color: t.textMuted }, className: "text-sm" }, "No stages yet \u2014 add one above."))))),
                tab === "goals" && (React.createElement(Card, { icon: Target, title: "Big purchases & goals", subtitle: "Cost entered in today's dollars, inflated automatically to the purchase age", right: React.createElement(AddBtn, { onClick: addGoal }, "Goal") },
                    React.createElement("div", { className: "flex flex-col gap-3" },
                        state.goals.map((g, gi) => {
                            const GIcon = ICONS[g.icon] || Gift;
                            const short = goalShortfall[gi] > 0;
                            const isOpen = expandedGoal === g.id;
                            return (React.createElement("div", { key: g.id, style: { background: t.inputBg, borderColor: t.inputBorder }, className: "border rounded-xl overflow-hidden" },
                                React.createElement("button", { onClick: () => setExpandedGoal(isOpen ? null : g.id), className: "w-full flex items-center gap-3 p-3 text-left" },
                                    React.createElement("div", { style: { background: GOAL_COLORS[gi % GOAL_COLORS.length] + "22", color: GOAL_COLORS[gi % GOAL_COLORS.length] }, className: "p-2.5 rounded-xl shrink-0" },
                                        React.createElement(GIcon, { size: 18 })),
                                    React.createElement("div", { className: "flex-1 min-w-0" },
                                        React.createElement("p", { style: { color: t.text }, className: "font-medium truncate" }, g.name),
                                        React.createElement("p", { style: { color: t.textMuted }, className: "text-xs font-mono" },
                                            "Age ",
                                            g.targetAge,
                                            " \u00B7 ",
                                            fmt(g.cost),
                                            " today's $")),
                                    React.createElement(StatusPill, { ok: !short, okText: "On track", badText: "Short " + fmt(goalShortfall[gi]) }),
                                    isOpen ? React.createElement(ChevronUp, { size: 16, color: t.textMuted }) : React.createElement(ChevronDown, { size: 16, color: t.textMuted })),
                                isOpen && (React.createElement("div", { style: { borderColor: t.cardBorder }, className: "border-t p-3" },
                                    React.createElement(IconPicker, { options: GOAL_ICON_OPTS, value: g.icon, onChange: (k) => updateListItem("goals", g.id, "icon", k) }),
                                    React.createElement(TextInput, { className: "font-medium w-full mt-3 mb-4", value: g.name, onChange: (ev) => updateListItem("goals", g.id, "name", ev.target.value) }),
                                    React.createElement(Field, { label: "Saving window: age " + g.prefundStartAge + " → " + g.targetAge + " (purchase)" },
                                        React.createElement(RangeSlider, { min: state.profile.currentAge, max: state.profile.lifeExpectancy, start: g.prefundStartAge, end: g.targetAge, onStartChange: (v) => updateListItem("goals", g.id, "prefundStartAge", v), onEndChange: (v) => updateListItem("goals", g.id, "targetAge", v) })),
                                    React.createElement("div", { className: "grid grid-cols-2 gap-3 mt-4" },
                                        React.createElement(Field, { label: "Cost (today's $)" },
                                            React.createElement(MoneyInput, { value: g.cost, onChange: (ev) => updateListItem("goals", g.id, "cost", +ev.target.value) })),
                                        React.createElement(Field, { label: "Yearly contribution", hint: "Today's $ \u2014 grows with inflation, like the cost does" },
                                            React.createElement(MoneyInput, { value: g.contribution, onChange: (ev) => updateListItem("goals", g.id, "contribution", +ev.target.value) })),
                                        React.createElement(Field, { label: "Base return", hint: "Usually lower/safer" },
                                            React.createElement(PercentInput, { step: "0.1", value: g.returnRate, onChange: (ev) => updateListItem("goals", g.id, "returnRate", +ev.target.value) }))),
                                    React.createElement("p", { style: { color: t.textMuted }, className: "text-xs font-medium uppercase tracking-wide mt-4 mb-2" }, "Impact on your stages"),
                                    React.createElement("div", { className: "flex flex-col gap-1.5" },
                                        [...state.stages].sort((a, b) => a.startAge - b.startAge)
                                            .map((s) => ({ s, avg: goalAvgContribForStage(g, s, state.profile) }))
                                            .filter((x) => x.avg > 0)
                                            .map(({ s, avg }) => {
                                            const sum = stageSummaries[s.id];
                                            return (React.createElement("div", { key: s.id, style: { background: t.chip }, className: "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs" },
                                                React.createElement("span", { style: { color: t.text } },
                                                    s.name,
                                                    " ",
                                                    React.createElement("span", { style: { color: t.textMuted }, className: "font-mono" },
                                                        "(~",
                                                        fmt(avg),
                                                        "/yr)")),
                                                React.createElement(StatusPill, { ok: sum.net >= 0, okText: "OK · " + fmt(sum.net) + "/yr left for accounts", badText: fmt(sum.net) + "/yr short" })));
                                        }),
                                        state.stages.every((s) => goalAvgContribForStage(g, s, state.profile) === 0) && React.createElement("p", { style: { color: t.textMuted }, className: "text-xs" }, "No stage overlaps this saving window yet.")),
                                    React.createElement("div", { className: "flex justify-end mt-3" },
                                        React.createElement(RemoveBtn, { onClick: () => removeListItem("goals", g.id) }))))));
                        }),
                        state.goals.length === 0 && React.createElement("p", { style: { color: t.textMuted }, className: "text-sm" }, "No goals yet \u2014 add one above.")))),
                tab === "goals" && (React.createElement(Card, { icon: Zap, title: "One-time inflows & outflows", subtitle: "A bonus, an inheritance, a medical bill \u2014 a single hit to one account in a specific year", right: React.createElement(AddBtn, { onClick: addEvent }, "Event") },
                    React.createElement("div", { className: "flex flex-col gap-3" },
                        state.events.map((ev) => {
                            const isInflow = ev.amount >= 0;
                            const account = state.accounts.find((a) => a.id === ev.accountId);
                            return (React.createElement("div", { key: ev.id, style: { background: t.inputBg, borderColor: t.inputBorder }, className: "border rounded-xl p-3" },
                                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                                    React.createElement("div", { style: { background: isInflow ? t.goodSoft : t.dangerSoft, color: isInflow ? t.goodText : t.dangerText }, className: "p-2 rounded-lg shrink-0" }, isInflow ? React.createElement(ArrowUpRight, { size: 16 }) : React.createElement(ArrowDownRight, { size: 16 })),
                                    React.createElement(TextInput, { className: "font-medium flex-1", value: ev.name, onChange: (e) => updateListItem("events", ev.id, "name", e.target.value) }),
                                    React.createElement(RemoveBtn, { onClick: () => removeListItem("events", ev.id) })),
                                React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                                    React.createElement(Field, { label: "Age it happens" },
                                        React.createElement(NumInput, { value: ev.age, onChange: (e) => updateListItem("events", ev.id, "age", +e.target.value) })),
                                    React.createElement(Field, { label: "Amount", hint: "Negative for an outflow/expense" },
                                        React.createElement(MoneyInput, { value: ev.amount, onChange: (e) => updateListItem("events", ev.id, "amount", +e.target.value) })),
                                    React.createElement(Field, { label: "Affects account" },
                                        React.createElement(Select, { value: ev.accountId, onChange: (e) => updateListItem("events", ev.id, "accountId", e.target.value) }, state.accounts.map((a) => React.createElement("option", { key: a.id, value: a.id }, a.name)))),
                                    React.createElement("label", { className: "flex items-end gap-2 text-sm pb-2.5", style: { color: t.textMuted } },
                                        React.createElement("input", { type: "checkbox", checked: ev.inflationAdjusted, onChange: (e) => updateListItem("events", ev.id, "inflationAdjusted", e.target.checked) }),
                                        "Today's $ (grows with inflation)")),
                                account && account.locked && ev.amount < 0 && (React.createElement("p", { style: { color: t.warnText }, className: "text-xs mt-2" },
                                    "\u26A0 ",
                                    account.name,
                                    " is locked \u2014 make sure it's actually accessible at age ",
                                    ev.age,
                                    " before counting on this withdrawal."))));
                        }),
                        state.events.length === 0 && React.createElement("p", { style: { color: t.textMuted }, className: "text-sm" }, "No one-time events yet \u2014 add a bonus, windfall, or unexpected cost above.")))),
                tab === "scenarios" && (React.createElement(Card, { icon: TrendingUp, title: "Return scenarios", subtitle: "Shift every account & goal's return rate by the same amount", right: React.createElement(AddBtn, { onClick: addScenario }, "Scenario") },
                    React.createElement("div", { className: "flex flex-col gap-3" }, state.scenarios.map((sc) => (React.createElement("div", { key: sc.id, style: { borderColor: sc.id === state.activeScenarioId ? t.accent : t.inputBorder, background: sc.id === state.activeScenarioId ? t.accentSoft : t.inputBg }, className: "flex items-center gap-2 border rounded-xl p-3 flex-wrap" },
                        React.createElement("input", { type: "radio", checked: sc.id === state.activeScenarioId, onChange: () => update(["activeScenarioId"], sc.id) }),
                        React.createElement(TextInput, { className: "flex-1 min-w-[90px]", value: sc.name, onChange: (e) => updateListItem("scenarios", sc.id, "name", e.target.value) }),
                        React.createElement(PercentInput, { className: "w-24", step: "0.5", value: sc.delta, onChange: (e) => updateListItem("scenarios", sc.id, "delta", +e.target.value) }),
                        state.scenarios.length > 1 && React.createElement(RemoveBtn, { onClick: () => removeScenario(sc.id) }))))),
                    React.createElement("p", { style: { color: t.textMuted }, className: "text-xs mt-3" }, "The selected scenario drives the Projection tab; all are compared in \"Scenario comparison\" there."))),
                tab === "projection" && (React.createElement(React.Fragment, null,
                    React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-2" },
                        React.createElement(Select, { value: state.activeScenarioId, onChange: (e) => update(["activeScenarioId"], e.target.value) }, state.scenarios.map((sc) => React.createElement("option", { key: sc.id, value: sc.id },
                            sc.name,
                            " (",
                            sc.delta >= 0 ? "+" : "",
                            sc.delta,
                            "pp)"))),
                        React.createElement(DollarTag, { mode: mode })),
                    React.createElement(Card, { icon: LineChartIcon, title: "Net worth — " + activeScenario.name, subtitle: (chartMode === "stacked" ? "Stacked by account, " : "Each account & goal as its own line, ") + (mode === "real" ? "today's $" : "future $") + ". 🔒 = locked until unlock age.", right: React.createElement("div", { style: { background: t.chip }, className: "flex items-center rounded-full p-1 shrink-0" },
                            React.createElement("button", { onClick: () => setChartMode("stacked"), style: chartMode === "stacked" ? { background: t.accent, color: "#fff" } : { color: t.textMuted }, className: "text-[11px] px-2 py-1 rounded-full font-medium" }, "Stacked"),
                            React.createElement("button", { onClick: () => setChartMode("lines"), style: chartMode === "lines" ? { background: t.accent, color: "#fff" } : { color: t.textMuted }, className: "text-[11px] px-2 py-1 rounded-full font-medium" }, "Lines")) },
                        React.createElement("div", { style: { width: "100%", height: 260 } },
                            React.createElement(ResponsiveContainer, null, chartMode === "stacked" ? (React.createElement(AreaChart, { data: chartData, margin: { left: -15, right: 5 } },
                                React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: t.cardBorder }),
                                React.createElement(XAxis, { dataKey: "age", tick: { fontSize: 10, fill: t.textMuted } }),
                                React.createElement(YAxis, { tick: { fontSize: 10, fill: t.textMuted }, tickFormatter: (v) => "$" + Math.round(v / 1000) + "k", width: 44 }),
                                React.createElement(Tooltip, { formatter: (v) => fmt(v) + (mode === "real" ? " (today's $)" : " (future $)"), labelFormatter: (l) => "Age " + l, contentStyle: { background: t.card, border: "1px solid " + t.cardBorder, fontSize: 12 } }),
                                React.createElement(Legend, { wrapperStyle: { fontSize: 10 } }),
                                state.accounts.map((a) => React.createElement(Area, { key: a.id, type: "monotone", dataKey: a.name + (a.locked ? " 🔒" : ""), stackId: "1", stroke: ACCOUNT_COLORS[a.type], fill: ACCOUNT_COLORS[a.type], fillOpacity: 0.75 })),
                                state.goals.map((g, i) => React.createElement(Area, { key: g.id, type: "monotone", dataKey: "Goal: " + g.name, stackId: "1", stroke: GOAL_COLORS[i % GOAL_COLORS.length], fill: GOAL_COLORS[i % GOAL_COLORS.length], fillOpacity: 0.6 })),
                                React.createElement(ReferenceLine, { x: state.profile.retirementAge, stroke: "#c17f3e", strokeDasharray: "4 4" }))) : (React.createElement(LineChart, { data: chartData, margin: { left: -15, right: 5 } },
                                React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: t.cardBorder }),
                                React.createElement(XAxis, { dataKey: "age", tick: { fontSize: 10, fill: t.textMuted } }),
                                React.createElement(YAxis, { tick: { fontSize: 10, fill: t.textMuted }, tickFormatter: (v) => "$" + Math.round(v / 1000) + "k", width: 44 }),
                                React.createElement(Tooltip, { formatter: (v) => fmt(v) + (mode === "real" ? " (today's $)" : " (future $)"), labelFormatter: (l) => "Age " + l, contentStyle: { background: t.card, border: "1px solid " + t.cardBorder, fontSize: 12 } }),
                                React.createElement(Legend, { wrapperStyle: { fontSize: 10 } }),
                                state.accounts.map((a) => React.createElement(Line, { key: a.id, type: "monotone", dataKey: a.name + (a.locked ? " 🔒" : ""), stroke: ACCOUNT_COLORS[a.type], dot: false, strokeWidth: 2 })),
                                state.goals.map((g, i) => React.createElement(Line, { key: g.id, type: "monotone", dataKey: "Goal: " + g.name, stroke: GOAL_COLORS[i % GOAL_COLORS.length], dot: false, strokeWidth: 2, strokeDasharray: "4 2" })),
                                React.createElement(ReferenceLine, { x: state.profile.retirementAge, stroke: "#c17f3e", strokeDasharray: "4 4" })))))),
                    React.createElement(Card, { icon: Layers, title: "Balance snapshot", subtitle: "Every account & goal at a single age, " + (mode === "real" ? "today's $" : "future $") }, (() => {
                        const snapAge = snapshotAge ?? state.profile.retirementAge;
                        const snapRow = rows.find((r) => r.age === snapAge) || rows[0];
                        if (!snapRow)
                            return null;
                        return (React.createElement(React.Fragment, null,
                            React.createElement(Field, { label: "Age: " + snapAge },
                                React.createElement("input", { type: "range", min: state.profile.currentAge, max: state.profile.lifeExpectancy, value: snapAge, onChange: (e) => setSnapshotAge(+e.target.value), className: "w-full" })),
                            React.createElement("div", { className: "grid grid-cols-2 gap-2 mt-3" },
                                snapRow.accounts.map((a) => {
                                    const acc = state.accounts.find((x) => x.id === a.id);
                                    return (React.createElement("div", { key: a.id, style: { background: t.inputBg, borderColor: t.inputBorder }, className: "border rounded-lg p-2.5" },
                                        React.createElement("p", { style: { color: t.textMuted }, className: "text-[10px] flex items-center gap-1" },
                                            acc && acc.locked ? React.createElement(Lock, { size: 9 }) : null,
                                            " ",
                                            a.name),
                                        React.createElement("p", { className: "font-mono text-sm", style: { color: t.text } }, fmt(dv(a.endBal, snapRow.inflFactor, mode)))));
                                }),
                                snapRow.goals.filter((g) => g.endBal > 0 || g.startBal > 0).map((g) => (React.createElement("div", { key: g.id, style: { background: t.accentSoft, borderColor: t.accent + "40" }, className: "border rounded-lg p-2.5" },
                                    React.createElement("p", { style: { color: t.accent }, className: "text-[10px]" },
                                        "\uD83C\uDFAF ",
                                        g.name),
                                    React.createElement("p", { className: "font-mono text-sm", style: { color: t.text } }, fmt(dv(g.endBal, snapRow.inflFactor, mode))))))),
                            React.createElement("div", { style: { borderColor: t.cardBorder }, className: "mt-3 pt-3 border-t flex justify-between text-sm font-medium" },
                                React.createElement("span", { style: { color: t.textMuted } }, "Total net worth"),
                                React.createElement("span", { style: { color: t.text }, className: "font-mono" }, fmt(dv(snapRow.netWorth, snapRow.inflFactor, mode))))));
                    })()),
                    React.createElement(Card, { icon: Sparkles, title: "Financial independence", subtitle: "When investments alone could cover expenses, at a " + state.withdrawal.rate + "% withdrawal rate, after tax" },
                        crossover ? (React.createElement("div", { style: { background: t.goodSoft, color: t.goodText }, className: "rounded-xl p-3 mb-3 text-sm font-medium" },
                            "\uD83C\uDF89 Around age ",
                            crossover.age,
                            ", your investments could cover your planned expenses on their own.")) : (React.createElement("div", { style: { background: t.warnBg, color: t.warnText }, className: "rounded-xl p-3 mb-3 text-sm font-medium" }, "Doesn't cross over within this plan yet \u2014 try raising contributions, returns, or the withdrawal rate.")),
                        React.createElement("div", { style: { width: "100%", height: 220 } },
                            React.createElement(ResponsiveContainer, null,
                                React.createElement(LineChart, { data: fiSeries, margin: { left: -15, right: 5 } },
                                    React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: t.cardBorder }),
                                    React.createElement(XAxis, { dataKey: "age", tick: { fontSize: 10, fill: t.textMuted } }),
                                    React.createElement(YAxis, { tick: { fontSize: 10, fill: t.textMuted }, tickFormatter: (v) => "$" + Math.round(v / 1000) + "k", width: 44 }),
                                    React.createElement(Tooltip, { formatter: (v) => fmt(v) + (mode === "real" ? " (today's $)" : " (future $)"), labelFormatter: (l) => "Age " + l, contentStyle: { background: t.card, border: "1px solid " + t.cardBorder, fontSize: 12 } }),
                                    React.createElement(Legend, { wrapperStyle: { fontSize: 10 } }),
                                    React.createElement(Line, { type: "monotone", dataKey: "Expenses", stroke: "#b5654f", dot: false, strokeWidth: 2 }),
                                    React.createElement(Line, { type: "monotone", dataKey: "Sustainable income", stroke: "#2f6f62", dot: false, strokeWidth: 2 }),
                                    crossover && React.createElement(ReferenceLine, { x: crossover.age, stroke: t.accent, strokeDasharray: "4 4", label: { value: "FI", fontSize: 10, fill: t.accent } }))))),
                    React.createElement(Card, { icon: TrendingUp, title: "Scenario comparison", subtitle: "Total net worth, " + (mode === "real" ? "today's $" : "future $") },
                        React.createElement("div", { style: { width: "100%", height: 200 } },
                            React.createElement(ResponsiveContainer, null,
                                React.createElement(LineChart, { data: scenarioCompareData, margin: { left: -15, right: 5 } },
                                    React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: t.cardBorder }),
                                    React.createElement(XAxis, { dataKey: "age", tick: { fontSize: 10, fill: t.textMuted } }),
                                    React.createElement(YAxis, { tick: { fontSize: 10, fill: t.textMuted }, tickFormatter: (v) => "$" + Math.round(v / 1000) + "k", width: 44 }),
                                    React.createElement(Tooltip, { formatter: (v) => fmt(v) + (mode === "real" ? " (today's $)" : " (future $)"), labelFormatter: (l) => "Age " + l, contentStyle: { background: t.card, border: "1px solid " + t.cardBorder, fontSize: 12 } }),
                                    React.createElement(Legend, { wrapperStyle: { fontSize: 10 } }),
                                    state.scenarios.map((sc, i) => React.createElement(Line, { key: sc.id, type: "monotone", dataKey: sc.name, stroke: SCENARIO_COLORS[i % SCENARIO_COLORS.length], dot: false, strokeWidth: sc.id === state.activeScenarioId ? 2.5 : 1.5 })),
                                    React.createElement(ReferenceLine, { x: state.profile.retirementAge, stroke: "#c17f3e", strokeDasharray: "4 4" }))))),
                    React.createElement(Card, { icon: Receipt, title: "Cash flow", subtitle: "After-tax income vs. expenses, " + (mode === "real" ? "today's $" : "future $") },
                        React.createElement("div", { style: { width: "100%", height: 200 } },
                            React.createElement(ResponsiveContainer, null,
                                React.createElement(LineChart, { data: cashflowData, margin: { left: -15, right: 5 } },
                                    React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: t.cardBorder }),
                                    React.createElement(XAxis, { dataKey: "age", tick: { fontSize: 10, fill: t.textMuted } }),
                                    React.createElement(YAxis, { tick: { fontSize: 10, fill: t.textMuted }, tickFormatter: (v) => "$" + Math.round(v / 1000) + "k", width: 44 }),
                                    React.createElement(Tooltip, { formatter: (v) => fmt(v) + (mode === "real" ? " (today's $)" : " (future $)"), labelFormatter: (l) => "Age " + l, contentStyle: { background: t.card, border: "1px solid " + t.cardBorder, fontSize: 12 } }),
                                    React.createElement(Legend, { wrapperStyle: { fontSize: 10 } }),
                                    React.createElement(Line, { type: "monotone", dataKey: "After-tax income", stroke: "#2f6f62", dot: false }),
                                    React.createElement(Line, { type: "monotone", dataKey: "Expenses", stroke: "#b5654f", dot: false }),
                                    React.createElement(Line, { type: "monotone", dataKey: "Surplus", stroke: "#c17f3e", dot: false, strokeDasharray: "4 2" }),
                                    React.createElement(ReferenceLine, { y: 0, stroke: t.textMuted }))))),
                    React.createElement(Card, { icon: PiggyBank, title: "Withdrawal calculator", subtitle: "Safe-withdrawal rate under " + activeScenario.name + ", after tax" },
                        React.createElement("div", { className: "grid grid-cols-1 gap-4 mb-4" },
                            React.createElement(Field, { label: "Age: " + state.withdrawal.age },
                                React.createElement("input", { type: "range", min: state.profile.currentAge, max: state.profile.lifeExpectancy, value: state.withdrawal.age, onChange: (e) => update(["withdrawal", "age"], +e.target.value), className: "w-full" })),
                            React.createElement(Field, { label: "Withdrawal rate: " + state.withdrawal.rate + "%" },
                                React.createElement("input", { type: "range", min: "1", max: "8", step: "0.25", value: state.withdrawal.rate, onChange: (e) => update(["withdrawal", "rate"], +e.target.value), className: "w-full" }))),
                        React.createElement("div", { style: { background: t.hero, color: t.heroText }, className: "grid grid-cols-2 gap-3 rounded-xl p-4" },
                            React.createElement("div", null,
                                React.createElement("p", { style: { color: t.heroMuted }, className: "text-[10px]" }, "Investable balance"),
                                React.createElement("p", { className: "font-mono text-base" }, fmt(investableBalanceNominal))),
                            React.createElement("div", null,
                                React.createElement("p", { style: { color: t.heroMuted }, className: "text-[10px]" }, "Tax rate this stage"),
                                React.createElement("p", { className: "font-mono text-base" },
                                    withdrawalTaxRate,
                                    "%")),
                            React.createElement("div", null,
                                React.createElement("p", { style: { color: t.heroMuted }, className: "text-[10px]" }, "Monthly, pre-tax (future $)"),
                                React.createElement("p", { className: "font-mono text-base" }, fmt(monthlyWithdrawalNominal))),
                            React.createElement("div", null,
                                React.createElement("p", { className: "text-[10px]", style: { color: "#e0b862" } }, "Monthly, after-tax (today's $)"),
                                React.createElement("p", { className: "font-mono text-base" }, fmt(monthlyWithdrawalReal)))),
                        React.createElement("p", { style: { color: t.textMuted }, className: "text-xs mt-2" },
                            "Excludes checking. ",
                            lockedExcluded.length > 0 && (React.createElement(React.Fragment, null,
                                "Also excludes locked: ",
                                lockedExcluded.map((a) => `${a.name} (unlocks ${a.unlockAge})`).join(", "),
                                ".")))),
                    React.createElement(Card, { icon: Receipt, title: "Year-by-year ledger", subtitle: "Tap a year for the full breakdown · " + (mode === "real" ? "today's $" : "future $") },
                        React.createElement("div", { style: { maxHeight: "32rem", overflowY: "auto" } },
                            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, rows.map((r) => {
                                const isOpen = expandedYear === r.age;
                                const change = r.netWorth - r.startNetWorth;
                                const StIcon = ICONS[r.stageIcon] || Sparkles;
                                const investmentGrowth = r.accounts.reduce((s, a) => s + a.growth, 0) + r.goals.reduce((s, g) => s + g.growth, 0);
                                const netOneTime = r.accounts.reduce((s, a) => s + a.oneTime, 0);
                                const totalIncome = r.afterTaxIncome + investmentGrowth + netOneTime;
                                return (React.createElement("div", { key: r.age, style: { background: r.age === state.profile.retirementAge ? t.warnBg : t.inputBg, border: "1px solid " + t.inputBorder, borderRadius: 12, overflow: "hidden", flexShrink: 0 } },
                                    React.createElement("button", { onClick: () => setExpandedYear(isOpen ? null : r.age), style: { width: "100%", textAlign: "left", padding: 12, background: "none", border: "none", display: "block" } },
                                        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } },
                                            React.createElement("span", { style: { background: t.accentSoft, color: t.accent, fontFamily: MONO, fontSize: 12, fontWeight: 600, borderRadius: 999, padding: "2px 8px", flexShrink: 0 } }, r.age),
                                            React.createElement(StIcon, { size: 13, color: t.textMuted, style: { flexShrink: 0 } }),
                                            React.createElement("span", { style: { color: t.textMuted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 } }, r.stageName),
                                            change >= 0 ? React.createElement(ArrowUpRight, { size: 14, color: t.goodText, style: { flexShrink: 0 } }) : React.createElement(ArrowDownRight, { size: 14, color: t.dangerText, style: { flexShrink: 0 } }),
                                            isOpen ? React.createElement(ChevronUp, { size: 16, color: t.textMuted, style: { flexShrink: 0 } }) : React.createElement(ChevronDown, { size: 16, color: t.textMuted, style: { flexShrink: 0 } })),
                                        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 } },
                                            React.createElement("div", null,
                                                React.createElement("p", { style: { color: t.textMuted, fontSize: 10, margin: 0 } }, "Net worth"),
                                                React.createElement("p", { style: { color: t.text, fontFamily: MONO, fontSize: 13, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, fmt(dv(r.netWorth, r.inflFactor, mode)))),
                                            React.createElement("div", null,
                                                React.createElement("p", { style: { color: t.textMuted, fontSize: 10, margin: 0 } }, "Income (+ growth)"),
                                                React.createElement("p", { style: { color: t.goodText, fontFamily: MONO, fontSize: 13, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, fmt(dv(totalIncome, r.inflFactor, mode)))),
                                            React.createElement("div", null,
                                                React.createElement("p", { style: { color: t.textMuted, fontSize: 10, margin: 0 } }, "Expenses"),
                                                React.createElement("p", { style: { color: t.dangerText, fontFamily: MONO, fontSize: 13, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, fmt(dv(r.totalExpenses, r.inflFactor, mode)))))),
                                    isOpen && (React.createElement("div", { style: { borderTop: "1px solid " + t.cardBorder, padding: 12, fontSize: 12, display: "flex", flexDirection: "column", gap: 12 } },
                                        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontFamily: MONO, color: t.textMuted } },
                                            React.createElement("span", null,
                                                "Start of year: ",
                                                fmt(dv(r.startNetWorth, r.inflFactor, mode))),
                                            React.createElement("span", null,
                                                "End of year: ",
                                                fmt(dv(r.netWorth, r.inflFactor, mode)))),
                                        React.createElement("div", null,
                                            React.createElement("p", { style: { color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 } }, "Every account"),
                                            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 } }, r.accounts.map((a) => (React.createElement("div", { key: a.id, style: { background: t.chip, borderRadius: 8, padding: "6px 8px" } },
                                                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4, marginBottom: 2 } },
                                                    a.locked && React.createElement(Lock, { size: 10, color: t.warnText }),
                                                    React.createElement("span", { style: { color: t.text, fontFamily: "inherit", fontWeight: 600 } }, a.name),
                                                    React.createElement("span", { style: { color: t.accent, fontFamily: MONO, marginLeft: "auto" } }, fmt(dv(a.endBal, r.inflFactor, mode)))),
                                                React.createElement("p", { style: { color: t.textMuted, fontFamily: MONO, fontSize: 10, margin: 0 } },
                                                    fmt(dv(a.startBal, r.inflFactor, mode)),
                                                    " start + ",
                                                    fmt(dv(a.growth, r.inflFactor, mode)),
                                                    " growth + ",
                                                    fmt(dv(a.contribution, r.inflFactor, mode)),
                                                    " in",
                                                    a.oneTime ? (a.oneTime >= 0 ? " + " : " − ") + fmt(Math.abs(dv(a.oneTime, r.inflFactor, mode))) + " one-time" : ""))))),
                                            r.goals.filter((g) => g.startBal || g.contribution || g.purchase).length > 0 && (React.createElement(React.Fragment, null,
                                                React.createElement("p", { style: { color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 } }, "Every goal"),
                                                React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, r.goals.filter((g) => g.startBal || g.contribution || g.purchase).map((g) => (React.createElement("div", { key: g.id, style: { background: t.accentSoft, borderRadius: 8, padding: "6px 8px" } },
                                                    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4, marginBottom: 2 } },
                                                        React.createElement(Target, { size: 10, color: t.accent }),
                                                        React.createElement("span", { style: { color: t.text, fontFamily: "inherit", fontWeight: 600 } }, g.name),
                                                        React.createElement("span", { style: { color: t.accent, fontFamily: MONO, marginLeft: "auto" } }, fmt(dv(g.endBal, r.inflFactor, mode)))),
                                                    React.createElement("p", { style: { color: t.textMuted, fontFamily: MONO, fontSize: 10, margin: 0 } },
                                                        fmt(dv(g.startBal, r.inflFactor, mode)),
                                                        " start + ",
                                                        fmt(dv(g.growth, r.inflFactor, mode)),
                                                        " growth",
                                                        g.purchase ? " − " + fmt(dv(g.purchase, r.inflFactor, mode)) + " purchased" : "")))))))),
                                        React.createElement("div", null,
                                            React.createElement("p", { style: { color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 } }, "Cash flow"),
                                            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontFamily: MONO, padding: "2px 0" } },
                                                React.createElement("span", { style: { color: t.text } }, "Gross income"),
                                                React.createElement("span", { style: { color: t.textMuted } }, fmt(dv(r.grossIncome, r.inflFactor, mode)))),
                                            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontFamily: MONO, padding: "2px 0" } },
                                                React.createElement("span", { style: { color: t.text } },
                                                    "Tax (",
                                                    r.stageTaxRate,
                                                    "%)"),
                                                React.createElement("span", { style: { color: t.dangerText } },
                                                    "-",
                                                    fmt(dv(r.tax, r.inflFactor, mode)))),
                                            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontFamily: MONO, padding: "2px 0" } },
                                                React.createElement("span", { style: { color: t.text } }, "After-tax income"),
                                                React.createElement("span", { style: { color: t.textMuted } }, fmt(dv(r.afterTaxIncome, r.inflFactor, mode)))),
                                            r.expenseItems.map((e, i) => (React.createElement("div", { key: i, style: { display: "flex", justifyContent: "space-between", fontFamily: MONO, padding: "2px 0 2px 8px" } },
                                                React.createElement("span", { style: { color: t.textMuted } },
                                                    "\u2212 ",
                                                    e.name),
                                                React.createElement("span", { style: { color: t.textMuted } },
                                                    "-",
                                                    fmt(dv(e.amount, r.inflFactor, mode)))))),
                                            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontFamily: MONO, padding: "2px 0" } },
                                                React.createElement("span", { style: { color: t.text } }, "Contributions out"),
                                                React.createElement("span", { style: { color: t.dangerText } },
                                                    "-",
                                                    fmt(dv(r.totalContrib, r.inflFactor, mode)))),
                                            React.createElement("div", { style: { borderTop: "1px solid " + t.cardBorder, display: "flex", justifyContent: "space-between", fontFamily: MONO, padding: "4px 0", marginTop: 4 } },
                                                React.createElement("span", { style: { color: t.text, fontWeight: 600 } }, "Surplus"),
                                                React.createElement("span", { style: { color: r.surplus < 0 ? t.dangerText : t.goodText, fontWeight: 600 } }, fmt(dv(r.surplus, r.inflFactor, mode))))),
                                        React.createElement("p", { style: { color: t.textMuted, opacity: 0.7, margin: 0 } },
                                            "Inflation index this year: \u00D7",
                                            r.inflFactor.toFixed(2))))));
                            })))))),
                React.createElement("div", { className: "flex flex-col items-center gap-2 pb-2" },
                    React.createElement("div", { className: "flex items-center gap-4" },
                        React.createElement("button", { onClick: exportBackup, style: { color: t.accent }, className: "text-xs underline" }, "Export backup"),
                        React.createElement("button", { onClick: () => importInputRef.current && importInputRef.current.click(), style: { color: t.accent }, className: "text-xs underline" }, "Import backup"),
                        React.createElement("input", { ref: importInputRef, type: "file", accept: "application/json", onChange: importBackup, style: { display: "none" } })),
                    React.createElement("button", { onClick: resetAll, style: { color: t.textMuted }, className: "text-xs underline" }, "Reset plan to example data"))),
            React.createElement("div", { style: { background: t.navBg, borderColor: t.navBorder, paddingBottom: "env(safe-area-inset-bottom)" }, className: "fixed bottom-0 left-0 right-0 border-t flex z-20" }, tabs.map(({ id, label, Icon }) => (React.createElement("button", { key: id, onClick: () => setTab(id), className: "flex-1 flex flex-col items-center gap-0.5 py-2.5 active:opacity-60" },
                React.createElement(Icon, { size: 20, color: tab === id ? t.navActive : t.navInactive }),
                React.createElement("span", { style: { color: tab === id ? t.navActive : t.navInactive }, className: "text-[10px] font-medium" }, label))))))));
}
const __root = ReactDOM.createRoot(document.getElementById("root"));
__root.render(React.createElement(FinancialPlanner));
