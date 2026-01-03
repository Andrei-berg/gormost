(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/supabase.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-client] (ecmascript) <locals>");
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://wwwtsvboqffzbnliuiun.supabase.co");
const supabaseKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3RzdmJvcWZmemJubGl1aXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTc2MzYsImV4cCI6MjA4Mjg3MzYzNn0.FpjVq4aU2BNn958ZQrqCPIJ4ApGn9X-H0DKKoLt-0_g");
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseKey);
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/shifts.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Утилита для расчёта смен
// База: 2 января 2025 = 4 смена (Станишевский А.В.)
__turbopack_context__.s([
    "formatDate",
    ()=>formatDate,
    "formatTime",
    ()=>formatTime,
    "getCurrentPeriod",
    ()=>getCurrentPeriod,
    "getCurrentShift",
    ()=>getCurrentShift,
    "getPeriodText",
    ()=>getPeriodText,
    "getShiftForDate",
    ()=>getShiftForDate
]);
const SHIFT_CHIEFS = [
    {
        no: 1,
        name: 'Чекин А.В.',
        tab: '0000-00001'
    },
    {
        no: 2,
        name: 'Максимов И.Н.',
        tab: '0000-00002'
    },
    {
        no: 3,
        name: 'Кожин В.М.',
        tab: '0000-00003'
    },
    {
        no: 4,
        name: 'Станишевский А.В.',
        tab: '0000-00004'
    }
];
// Базовая дата: 2 января 2025 = смена 4
const BASE_DATE = new Date('2025-01-02');
const BASE_SHIFT = 4;
function getShiftForDate(date) {
    // Обнуляем время для точного расчёта дней
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const baseDate = new Date(BASE_DATE);
    baseDate.setHours(0, 0, 0, 0);
    // Разница в днях
    const daysDiff = Math.floor((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    // Определяем позицию в 4-дневном цикле (сутки/трое)
    const cyclePosition = daysDiff % 4;
    // Рабочий день (0-й день цикла)
    const isWorking = cyclePosition === 0;
    // Номер смены (сдвиг от базовой)
    let shiftNumber;
    if (isWorking) {
        const shiftsCycled = Math.floor(daysDiff / 4);
        shiftNumber = (BASE_SHIFT - 1 + shiftsCycled) % 4 + 1;
    } else {
        // В дни отдыха показываем следующую рабочую смену
        const daysUntilWork = 4 - cyclePosition;
        const nextWorkDate = new Date(targetDate);
        nextWorkDate.setDate(targetDate.getDate() + daysUntilWork);
        return getShiftForDate(nextWorkDate);
    }
    const chief = SHIFT_CHIEFS.find((c)=>c.no === shiftNumber);
    // SHIFT-DA-1-3 работает КРУГЛОСУТОЧНО (день + ночь)
    return {
        shiftNumber,
        shiftName: `SHIFT-DA-${shiftNumber}-3`,
        chiefName: chief.name,
        chiefTabNumber: chief.tab,
        isWorking,
        period: 'both' // сутки
    };
}
function getCurrentShift() {
    return getShiftForDate(new Date());
}
function getCurrentPeriod() {
    const hour = new Date().getHours();
    // День: 07:00-19:00, Ночь: 19:00-07:00
    return hour >= 7 && hour < 19 ? 'day' : 'night';
}
function getPeriodText(period) {
    return period === 'day' ? 'ДНЕВНАЯ (07:00-19:00)' : 'НОЧНАЯ (19:00-07:00)';
}
function formatDate(date) {
    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}
function formatTime(date) {
    return new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(date);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/Header.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Header
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$shifts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/shifts.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function Header({ title, subtitle, userRole, userName }) {
    _s();
    const [currentTime, setCurrentTime] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Date());
    const [shift, setShift] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [period, setPeriod] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('day');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Header.useEffect": ()=>{
            // Обновляем время каждую секунду
            const timer = setInterval({
                "Header.useEffect.timer": ()=>{
                    setCurrentTime(new Date());
                }
            }["Header.useEffect.timer"], 1000);
            // Обновляем смену каждую минуту
            const updateShift = {
                "Header.useEffect.updateShift": ()=>{
                    setShift((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$shifts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCurrentShift"])());
                    setPeriod((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$shifts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCurrentPeriod"])());
                }
            }["Header.useEffect.updateShift"];
            updateShift();
            const shiftTimer = setInterval(updateShift, 60000);
            return ({
                "Header.useEffect": ()=>{
                    clearInterval(timer);
                    clearInterval(shiftTimer);
                }
            })["Header.useEffect"];
        }
    }["Header.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.15) 100%)',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '20px',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        style: {
                            color: 'white',
                            margin: 0,
                            fontSize: '28px',
                            fontWeight: 'bold',
                            marginBottom: subtitle ? '8px' : 0
                        },
                        children: title || 'Лефортовский тоннель'
                    }, void 0, false, {
                        fileName: "[project]/src/components/Header.tsx",
                        lineNumber: 52,
                        columnNumber: 9
                    }, this),
                    subtitle && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            color: 'rgba(255,255,255,0.7)',
                            margin: 0,
                            fontSize: '14px'
                        },
                        children: subtitle
                    }, void 0, false, {
                        fileName: "[project]/src/components/Header.tsx",
                        lineNumber: 62,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Header.tsx",
                lineNumber: 51,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '12px',
                            padding: '10px 16px',
                            border: '1px solid rgba(255,255,255,0.2)'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    color: 'rgba(255,255,255,0.6)',
                                    fontSize: '11px',
                                    marginBottom: '4px'
                                },
                                children: "ДАТА И ВРЕМЯ"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Header.tsx",
                                lineNumber: 86,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    color: 'white',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    fontFamily: 'monospace'
                                },
                                children: [
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$shifts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatDate"])(currentTime),
                                    " • ",
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$shifts$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatTime"])(currentTime)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/Header.tsx",
                                lineNumber: 93,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Header.tsx",
                        lineNumber: 80,
                        columnNumber: 9
                    }, this),
                    shift && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'rgba(139,92,246,0.25)',
                            borderRadius: '12px',
                            padding: '10px 16px',
                            border: '1px solid rgba(139,92,246,0.4)'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    color: 'rgba(255,255,255,0.6)',
                                    fontSize: '11px',
                                    marginBottom: '4px'
                                },
                                children: "ТЕКУЩАЯ СМЕНА"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Header.tsx",
                                lineNumber: 111,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    color: 'white',
                                    fontSize: '16px',
                                    fontWeight: 'bold'
                                },
                                children: [
                                    shift.shiftName,
                                    " • ",
                                    shift.chiefName
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/Header.tsx",
                                lineNumber: 118,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Header.tsx",
                        lineNumber: 105,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: period === 'day' ? 'rgba(234,179,8,0.25)' : 'rgba(59,130,246,0.25)',
                            borderRadius: '12px',
                            padding: '10px 16px',
                            border: period === 'day' ? '1px solid rgba(234,179,8,0.4)' : '1px solid rgba(59,130,246,0.4)'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    color: 'rgba(255,255,255,0.6)',
                                    fontSize: '11px',
                                    marginBottom: '4px'
                                },
                                children: "ПЕРИОД"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Header.tsx",
                                lineNumber: 139,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    color: 'white',
                                    fontSize: '16px',
                                    fontWeight: 'bold'
                                },
                                children: period === 'day' ? '☀️ ДЕНЬ' : '🌙 НОЧЬ'
                            }, void 0, false, {
                                fileName: "[project]/src/components/Header.tsx",
                                lineNumber: 146,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Header.tsx",
                        lineNumber: 129,
                        columnNumber: 9
                    }, this),
                    userName && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'rgba(34,197,94,0.25)',
                            borderRadius: '12px',
                            padding: '10px 16px',
                            border: '1px solid rgba(34,197,94,0.4)'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    color: 'rgba(255,255,255,0.6)',
                                    fontSize: '11px',
                                    marginBottom: '4px'
                                },
                                children: userRole?.toUpperCase() || 'ПОЛЬЗОВАТЕЛЬ'
                            }, void 0, false, {
                                fileName: "[project]/src/components/Header.tsx",
                                lineNumber: 163,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    color: 'white',
                                    fontSize: '16px',
                                    fontWeight: 'bold'
                                },
                                children: userName
                            }, void 0, false, {
                                fileName: "[project]/src/components/Header.tsx",
                                lineNumber: 170,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Header.tsx",
                        lineNumber: 157,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Header.tsx",
                lineNumber: 73,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Header.tsx",
        lineNumber: 38,
        columnNumber: 5
    }, this);
}
_s(Header, "mYX1OzxFfSeHJgam/lRjtPl9M9o=");
_c = Header;
var _c;
__turbopack_context__.k.register(_c, "Header");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/dispatcher/KPIPanel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>KPIPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
function KPIPanel({ data }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(KPICard, {
                title: "Всего заявок",
                value: data.total,
                color: "#3b82f6"
            }, void 0, false, {
                fileName: "[project]/src/components/dispatcher/KPIPanel.tsx",
                lineNumber: 17,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(KPICard, {
                title: "Новых",
                value: data.new,
                color: "#eab308"
            }, void 0, false, {
                fileName: "[project]/src/components/dispatcher/KPIPanel.tsx",
                lineNumber: 18,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(KPICard, {
                title: "В работе",
                value: data.inProgress,
                color: "#8b5cf6"
            }, void 0, false, {
                fileName: "[project]/src/components/dispatcher/KPIPanel.tsx",
                lineNumber: 19,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(KPICard, {
                title: "Проблемы",
                value: data.problems,
                color: "#ef4444"
            }, void 0, false, {
                fileName: "[project]/src/components/dispatcher/KPIPanel.tsx",
                lineNumber: 20,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(KPICard, {
                title: "Выполнено",
                value: data.done,
                color: "#22c55e"
            }, void 0, false, {
                fileName: "[project]/src/components/dispatcher/KPIPanel.tsx",
                lineNumber: 21,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/dispatcher/KPIPanel.tsx",
        lineNumber: 11,
        columnNumber: 5
    }, this);
}
_c = KPIPanel;
function KPICard({ title, value, color }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
            border: `1px solid ${color}40`,
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.6)',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                },
                children: title
            }, void 0, false, {
                fileName: "[project]/src/components/dispatcher/KPIPanel.tsx",
                lineNumber: 35,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: color,
                    textShadow: `0 0 20px ${color}60`
                },
                children: value
            }, void 0, false, {
                fileName: "[project]/src/components/dispatcher/KPIPanel.tsx",
                lineNumber: 44,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/dispatcher/KPIPanel.tsx",
        lineNumber: 28,
        columnNumber: 5
    }, this);
}
_c1 = KPICard;
var _c, _c1;
__turbopack_context__.k.register(_c, "KPIPanel");
__turbopack_context__.k.register(_c1, "KPICard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/dispatcher/KanbanBoard.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>KanbanBoard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
const STATUSES = [
    {
        code: 'NEW',
        label: 'НОВАЯ',
        color: '#eab308'
    },
    {
        code: 'PLANNED',
        label: 'ПЛАН',
        color: '#3b82f6'
    },
    {
        code: 'IN_PROGRESS',
        label: 'В РАБОТЕ',
        color: '#8b5cf6'
    },
    {
        code: 'CHECKING',
        label: 'ПРОВЕРКА',
        color: '#f97316'
    },
    {
        code: 'DONE',
        label: 'ВЫПОЛНЕНО',
        color: '#22c55e'
    }
];
const SERVICE_COLORS = {
    'SRV-STR': '#8b5cf6',
    'SRV-ENG': '#eab308',
    'SRV-FIRE': '#ef4444',
    'SRV-VENT': '#06b6d4',
    'SRV-CCTV': '#22c55e'
};
function KanbanBoard({ requests, onRefresh }) {
    _s();
    const [draggedCard, setDraggedCard] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [selectedCard, setSelectedCard] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    async function handleDrop(newStatus) {
        if (!draggedCard) return;
        if (!confirm(`Изменить статус на "${STATUSES.find((s)=>s.code === newStatus)?.label}"?`)) {
            setDraggedCard(null);
            return;
        }
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('requests').update({
            status: newStatus
        }).eq('request_id', draggedCard.request_id);
        setDraggedCard(null);
        onRefresh();
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '15px',
                    minHeight: '600px'
                },
                children: STATUSES.map((status)=>{
                    const cards = requests.filter((r)=>r.status === status.code);
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        onDragOver: (e)=>e.preventDefault(),
                        onDrop: ()=>handleDrop(status.code),
                        style: {
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px',
                            padding: '15px',
                            minHeight: '500px'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '15px',
                                    paddingBottom: '12px',
                                    borderBottom: `2px solid ${status.color}40`
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            color: 'white',
                                            fontWeight: 'bold',
                                            fontSize: '14px'
                                        },
                                        children: status.label
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                                        lineNumber: 74,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            background: `${status.color}40`,
                                            color: status.color,
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                        },
                                        children: cards.length
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                                        lineNumber: 77,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                                lineNumber: 66,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                },
                                children: cards.map((card)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RequestCard, {
                                        card: card,
                                        onDragStart: ()=>setDraggedCard(card),
                                        onClick: ()=>setSelectedCard(card)
                                    }, card.request_id, false, {
                                        fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                                        lineNumber: 91,
                                        columnNumber: 19
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                                lineNumber: 89,
                                columnNumber: 15
                            }, this)
                        ]
                    }, status.code, true, {
                        fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                        lineNumber: 54,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                lineNumber: 44,
                columnNumber: 7
            }, this),
            selectedCard && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CardModal, {
                card: selectedCard,
                onClose: ()=>setSelectedCard(null)
            }, void 0, false, {
                fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                lineNumber: 105,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true);
}
_s(KanbanBoard, "UoDbw22QNNfSbYJY0jMR9d7Lkdo=");
_c = KanbanBoard;
function RequestCard({ card, onDragStart, onClick }) {
    const isProblem = !card.fact_finish && card.status !== 'DONE';
    const serviceColor = SERVICE_COLORS[card.service_id] || '#64748b';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        draggable: true,
        onDragStart: onDragStart,
        onClick: onClick,
        style: {
            background: isProblem ? 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)' : 'rgba(255,255,255,0.05)',
            border: isProblem ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.5)',
                    fontFamily: 'monospace',
                    marginBottom: '6px'
                },
                children: [
                    card.request_id,
                    isProblem && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        style: {
                            marginLeft: '6px',
                            color: '#ef4444'
                        },
                        children: "🔴"
                    }, void 0, false, {
                        fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                        lineNumber: 138,
                        columnNumber: 23
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                lineNumber: 131,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    fontSize: '13px',
                    color: 'white',
                    fontWeight: 'bold',
                    marginBottom: '6px'
                },
                children: [
                    "📍 ",
                    card.location_text
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                lineNumber: 141,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.7)',
                    marginBottom: '8px',
                    lineHeight: '1.4'
                },
                children: [
                    card.work_description?.substring(0, 60),
                    "..."
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                lineNumber: 150,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'wrap'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        style: {
                            background: `${serviceColor}30`,
                            border: `1px solid ${serviceColor}50`,
                            color: serviceColor,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 'bold'
                        },
                        children: card.service_id?.replace('SRV-', '')
                    }, void 0, false, {
                        fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                        lineNumber: 160,
                        columnNumber: 9
                    }, this),
                    card.priority && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        style: {
                            background: 'rgba(234,179,8,0.2)',
                            border: '1px solid rgba(234,179,8,0.3)',
                            color: '#eab308',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 'bold'
                        },
                        children: [
                            "⚡ ",
                            card.priority
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                        lineNumber: 173,
                        columnNumber: 11
                    }, this),
                    card.fact_start && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        style: {
                            background: 'rgba(34,197,94,0.2)',
                            color: '#22c55e',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '10px'
                        },
                        children: "▶️"
                    }, void 0, false, {
                        fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                        lineNumber: 187,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                lineNumber: 159,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
        lineNumber: 116,
        columnNumber: 5
    }, this);
}
_c1 = RequestCard;
function CardModal({ card, onClose }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        onClick: onClose,
        style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            onClick: (e)=>e.stopPropagation(),
            style: {
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '20px',
                padding: '30px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto'
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.5)',
                        fontFamily: 'monospace',
                        marginBottom: '10px'
                    },
                    children: card.request_id
                }, void 0, false, {
                    fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                    lineNumber: 232,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    style: {
                        color: 'white',
                        fontSize: '24px',
                        margin: '0 0 20px 0'
                    },
                    children: [
                        "📍 ",
                        card.location_text
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                    lineNumber: 241,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        padding: '15px',
                        marginBottom: '20px'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                color: 'rgba(255,255,255,0.6)',
                                fontSize: '12px',
                                marginBottom: '6px'
                            },
                            children: "Описание работы:"
                        }, void 0, false, {
                            fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                            lineNumber: 251,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                color: 'white',
                                fontSize: '14px',
                                lineHeight: '1.6'
                            },
                            children: card.work_description
                        }, void 0, false, {
                            fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                            lineNumber: 254,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                    lineNumber: 245,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '15px',
                        marginBottom: '20px'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(InfoRow, {
                            label: "Служба",
                            value: card.service_id
                        }, void 0, false, {
                            fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                            lineNumber: 260,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(InfoRow, {
                            label: "Статус",
                            value: card.status
                        }, void 0, false, {
                            fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                            lineNumber: 261,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(InfoRow, {
                            label: "Приоритет",
                            value: card.priority || '—'
                        }, void 0, false, {
                            fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                            lineNumber: 262,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(InfoRow, {
                            label: "Срочность",
                            value: card.urgency || '—'
                        }, void 0, false, {
                            fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                            lineNumber: 263,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(InfoRow, {
                            label: "Факт старт",
                            value: card.fact_start ? new Date(card.fact_start).toLocaleString('ru') : '—'
                        }, void 0, false, {
                            fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                            lineNumber: 264,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(InfoRow, {
                            label: "Факт финиш",
                            value: card.fact_finish ? new Date(card.fact_finish).toLocaleString('ru') : '—'
                        }, void 0, false, {
                            fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                            lineNumber: 265,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                    lineNumber: 259,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: onClose,
                    style: {
                        width: '100%',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        padding: '12px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px'
                    },
                    children: "Закрыть"
                }, void 0, false, {
                    fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                    lineNumber: 268,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
            lineNumber: 219,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
        lineNumber: 204,
        columnNumber: 5
    }, this);
}
_c2 = CardModal;
function InfoRow({ label, value }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '11px',
                    marginBottom: '4px'
                },
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                lineNumber: 291,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 'bold'
                },
                children: value
            }, void 0, false, {
                fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
                lineNumber: 294,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/dispatcher/KanbanBoard.tsx",
        lineNumber: 290,
        columnNumber: 5
    }, this);
}
_c3 = InfoRow;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "KanbanBoard");
__turbopack_context__.k.register(_c1, "RequestCard");
__turbopack_context__.k.register(_c2, "CardModal");
__turbopack_context__.k.register(_c3, "InfoRow");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/dispatcher/TableView.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TableView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
const SERVICE_COLORS = {
    'SRV-STR': '#8b5cf6',
    'SRV-ENG': '#eab308',
    'SRV-FIRE': '#ef4444',
    'SRV-VENT': '#06b6d4',
    'SRV-CCTV': '#22c55e'
};
const STATUS_COLORS = {
    'NEW': '#eab308',
    'PLANNED': '#3b82f6',
    'IN_PROGRESS': '#8b5cf6',
    'CHECKING': '#f97316',
    'DONE': '#22c55e'
};
function TableView({ requests }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            overflow: 'hidden'
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                overflowX: 'auto'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                style: {
                    width: '100%',
                    borderCollapse: 'collapse'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                            style: {
                                background: 'rgba(255,255,255,0.05)',
                                borderBottom: '1px solid rgba(255,255,255,0.1)'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Th, {
                                    children: "Заявка"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                    lineNumber: 35,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Th, {
                                    children: "Служба"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                    lineNumber: 36,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Th, {
                                    children: "Статус"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                    lineNumber: 37,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Th, {
                                    children: "Место"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                    lineNumber: 38,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Th, {
                                    children: "Работа"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                    lineNumber: 39,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Th, {
                                    children: "Приоритет"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                    lineNumber: 40,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Th, {
                                    children: "Факт старт"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                    lineNumber: 41,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Th, {
                                    children: "Факт финиш"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                    lineNumber: 42,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/dispatcher/TableView.tsx",
                            lineNumber: 31,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/dispatcher/TableView.tsx",
                        lineNumber: 30,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                        children: requests.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                colSpan: 8,
                                style: {
                                    padding: '40px',
                                    textAlign: 'center',
                                    color: 'rgba(255,255,255,0.4)',
                                    fontSize: '14px'
                                },
                                children: "Нет заявок"
                            }, void 0, false, {
                                fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                lineNumber: 48,
                                columnNumber: 17
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/dispatcher/TableView.tsx",
                            lineNumber: 47,
                            columnNumber: 15
                        }, this) : requests.map((req, idx)=>{
                            const isProblem = !req.fact_finish && req.status !== 'DONE';
                            const serviceColor = SERVICE_COLORS[req.service_id] || '#64748b';
                            const statusColor = STATUS_COLORS[req.status] || '#64748b';
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                style: {
                                    background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Td, {
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontFamily: 'monospace',
                                                fontSize: '12px',
                                                color: isProblem ? '#ef4444' : 'rgba(255,255,255,0.8)'
                                            },
                                            children: [
                                                isProblem && '🔴 ',
                                                req.request_id
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                            lineNumber: 74,
                                            columnNumber: 23
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                        lineNumber: 73,
                                        columnNumber: 21
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Td, {
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                background: `${serviceColor}30`,
                                                border: `1px solid ${serviceColor}50`,
                                                color: serviceColor,
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '11px',
                                                fontWeight: 'bold'
                                            },
                                            children: req.service_id?.replace('SRV-', '')
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                            lineNumber: 85,
                                            columnNumber: 23
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                        lineNumber: 84,
                                        columnNumber: 21
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Td, {
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                background: `${statusColor}30`,
                                                border: `1px solid ${statusColor}50`,
                                                color: statusColor,
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '11px',
                                                fontWeight: 'bold'
                                            },
                                            children: req.status
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                            lineNumber: 99,
                                            columnNumber: 23
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                        lineNumber: 98,
                                        columnNumber: 21
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Td, {
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                color: 'white',
                                                fontSize: '13px'
                                            },
                                            children: req.location_text
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                            lineNumber: 113,
                                            columnNumber: 23
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                        lineNumber: 112,
                                        columnNumber: 21
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Td, {
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                color: 'rgba(255,255,255,0.7)',
                                                fontSize: '12px',
                                                maxWidth: '300px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            },
                                            children: req.work_description
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                            lineNumber: 119,
                                            columnNumber: 23
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                        lineNumber: 118,
                                        columnNumber: 21
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Td, {
                                        children: req.priority ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                background: 'rgba(234,179,8,0.2)',
                                                border: '1px solid rgba(234,179,8,0.3)',
                                                color: '#eab308',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '11px',
                                                fontWeight: 'bold'
                                            },
                                            children: [
                                                "⚡ ",
                                                req.priority
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                            lineNumber: 133,
                                            columnNumber: 25
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: 'rgba(255,255,255,0.3)'
                                            },
                                            children: "—"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                            lineNumber: 145,
                                            columnNumber: 25
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                        lineNumber: 131,
                                        columnNumber: 21
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Td, {
                                        children: req.fact_start ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                color: '#22c55e',
                                                fontSize: '12px'
                                            },
                                            children: formatDateTime(req.fact_start)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                            lineNumber: 151,
                                            columnNumber: 25
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: 'rgba(255,255,255,0.3)'
                                            },
                                            children: "—"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                            lineNumber: 158,
                                            columnNumber: 25
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                        lineNumber: 149,
                                        columnNumber: 21
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Td, {
                                        children: req.fact_finish ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                color: '#22c55e',
                                                fontSize: '12px'
                                            },
                                            children: formatDateTime(req.fact_finish)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                            lineNumber: 164,
                                            columnNumber: 25
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            style: {
                                                color: 'rgba(255,255,255,0.3)'
                                            },
                                            children: "—"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                            lineNumber: 171,
                                            columnNumber: 25
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                        lineNumber: 162,
                                        columnNumber: 21
                                    }, this)
                                ]
                            }, req.request_id, true, {
                                fileName: "[project]/src/components/dispatcher/TableView.tsx",
                                lineNumber: 64,
                                columnNumber: 19
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/src/components/dispatcher/TableView.tsx",
                        lineNumber: 45,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/dispatcher/TableView.tsx",
                lineNumber: 26,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/dispatcher/TableView.tsx",
            lineNumber: 25,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/dispatcher/TableView.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, this);
}
_c = TableView;
function Th({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
        style: {
            padding: '15px 12px',
            textAlign: 'left',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/dispatcher/TableView.tsx",
        lineNumber: 187,
        columnNumber: 5
    }, this);
}
_c1 = Th;
function Td({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
        style: {
            padding: '15px 12px',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '13px'
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/dispatcher/TableView.tsx",
        lineNumber: 203,
        columnNumber: 5
    }, this);
}
_c2 = Td;
function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month} ${hours}:${minutes}`;
}
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "TableView");
__turbopack_context__.k.register(_c1, "Th");
__turbopack_context__.k.register(_c2, "Td");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/dispatcher/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DispatcherPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Header$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/Header.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$dispatcher$2f$KPIPanel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/dispatcher/KPIPanel.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$dispatcher$2f$KanbanBoard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/dispatcher/KanbanBoard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$dispatcher$2f$TableView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/dispatcher/TableView.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
function DispatcherPage() {
    _s();
    const [viewMode, setViewMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('kanban');
    const [requests, setRequests] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [selectedDate, setSelectedDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Date().toISOString().split('T')[0]);
    const [selectedShift, setSelectedShift] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('DAY');
    const [selectedService, setSelectedService] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('ALL');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DispatcherPage.useEffect": ()=>{
            loadRequests();
        }
    }["DispatcherPage.useEffect"], [
        selectedDate,
        selectedShift,
        selectedService
    ]);
    async function loadRequests() {
        setLoading(true);
        let query = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('requests').select('*').eq('date_work', selectedDate).eq('shift_type', selectedShift);
        if (selectedService !== 'ALL') {
            query = query.eq('service_id', selectedService);
        }
        const { data } = await query;
        setRequests(data || []);
        setLoading(false);
    }
    const kpiData = {
        total: requests.length,
        new: requests.filter((r)=>r.status === 'NEW').length,
        inProgress: requests.filter((r)=>r.status === 'IN_PROGRESS').length,
        problems: requests.filter((r)=>!r.fact_finish && r.status !== 'DONE').length,
        done: requests.filter((r)=>r.status === 'DONE').length
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '20px'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Header$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                title: "📡 ДИСПЕТЧЕРСКАЯ",
                subtitle: "Центральный узел управления • Контроль смены • Мониторинг всех служб",
                userRole: "Начальник смены",
                userName: "ДДС"
            }, void 0, false, {
                fileName: "[project]/src/app/dispatcher/page.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '20px',
                    border: '1px solid rgba(255,255,255,0.1)'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    style: {
                                        color: 'rgba(255,255,255,0.6)',
                                        margin: '5px 0 0 0',
                                        fontSize: '14px'
                                    },
                                    children: "Мониторинг смены в режиме реального времени"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/dispatcher/page.tsx",
                                    lineNumber: 73,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/dispatcher/page.tsx",
                                lineNumber: 72,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: loadRequests,
                                style: {
                                    background: 'rgba(59,130,246,0.2)',
                                    border: '1px solid rgba(59,130,246,0.3)',
                                    borderRadius: '12px',
                                    padding: '12px 24px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '16px'
                                },
                                children: "⟳ Обновить"
                            }, void 0, false, {
                                fileName: "[project]/src/app/dispatcher/page.tsx",
                                lineNumber: 77,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/dispatcher/page.tsx",
                        lineNumber: 71,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            gap: '10px',
                            flexWrap: 'wrap'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        style: {
                                            display: 'block',
                                            color: 'rgba(255,255,255,0.6)',
                                            fontSize: '12px',
                                            marginBottom: '5px'
                                        },
                                        children: "Дата"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/dispatcher/page.tsx",
                                        lineNumber: 90,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "date",
                                        value: selectedDate,
                                        onChange: (e)=>setSelectedDate(e.target.value),
                                        style: {
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            padding: '10px',
                                            color: 'white',
                                            fontSize: '14px'
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/dispatcher/page.tsx",
                                        lineNumber: 91,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/dispatcher/page.tsx",
                                lineNumber: 89,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        style: {
                                            display: 'block',
                                            color: 'rgba(255,255,255,0.6)',
                                            fontSize: '12px',
                                            marginBottom: '5px'
                                        },
                                        children: "Смена"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/dispatcher/page.tsx",
                                        lineNumber: 98,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: selectedShift,
                                        onChange: (e)=>setSelectedShift(e.target.value),
                                        style: {
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            padding: '10px',
                                            color: 'white',
                                            fontSize: '14px',
                                            minWidth: '120px'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "DAY",
                                                children: "🌞 ДЕНЬ (7-19)"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dispatcher/page.tsx",
                                                lineNumber: 103,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "NIGHT",
                                                children: "🌙 НОЧЬ (19-7)"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dispatcher/page.tsx",
                                                lineNumber: 104,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dispatcher/page.tsx",
                                        lineNumber: 99,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/dispatcher/page.tsx",
                                lineNumber: 97,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        style: {
                                            display: 'block',
                                            color: 'rgba(255,255,255,0.6)',
                                            fontSize: '12px',
                                            marginBottom: '5px'
                                        },
                                        children: "Служба"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/dispatcher/page.tsx",
                                        lineNumber: 109,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: selectedService,
                                        onChange: (e)=>setSelectedService(e.target.value),
                                        style: {
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            padding: '10px',
                                            color: 'white',
                                            fontSize: '14px',
                                            minWidth: '150px'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "ALL",
                                                children: "Все службы"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dispatcher/page.tsx",
                                                lineNumber: 114,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "SRV-STR",
                                                children: "СЭИС"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dispatcher/page.tsx",
                                                lineNumber: 115,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "SRV-ENG",
                                                children: "Энергетика"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dispatcher/page.tsx",
                                                lineNumber: 116,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "SRV-FIRE",
                                                children: "Пожарка"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dispatcher/page.tsx",
                                                lineNumber: 117,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "SRV-VENT",
                                                children: "Вентиляция"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dispatcher/page.tsx",
                                                lineNumber: 118,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "SRV-CCTV",
                                                children: "Видеонаблюдение"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/dispatcher/page.tsx",
                                                lineNumber: 119,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/dispatcher/page.tsx",
                                        lineNumber: 110,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/dispatcher/page.tsx",
                                lineNumber: 108,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/dispatcher/page.tsx",
                        lineNumber: 88,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/dispatcher/page.tsx",
                lineNumber: 64,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$dispatcher$2f$KPIPanel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                data: kpiData
            }, void 0, false, {
                fileName: "[project]/src/app/dispatcher/page.tsx",
                lineNumber: 126,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    padding: '10px',
                    marginTop: '20px',
                    marginBottom: '20px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'inline-flex',
                    gap: '10px'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setViewMode('kanban'),
                        style: {
                            background: viewMode === 'kanban' ? 'rgba(59,130,246,0.3)' : 'transparent',
                            border: viewMode === 'kanban' ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent',
                            borderRadius: '10px',
                            padding: '10px 20px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: viewMode === 'kanban' ? 'bold' : 'normal'
                        },
                        children: "🗂️ Канбан"
                    }, void 0, false, {
                        fileName: "[project]/src/app/dispatcher/page.tsx",
                        lineNumber: 134,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setViewMode('table'),
                        style: {
                            background: viewMode === 'table' ? 'rgba(59,130,246,0.3)' : 'transparent',
                            border: viewMode === 'table' ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent',
                            borderRadius: '10px',
                            padding: '10px 20px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: viewMode === 'table' ? 'bold' : 'normal'
                        },
                        children: "📊 Таблица"
                    }, void 0, false, {
                        fileName: "[project]/src/app/dispatcher/page.tsx",
                        lineNumber: 140,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/dispatcher/page.tsx",
                lineNumber: 129,
                columnNumber: 7
            }, this),
            loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    textAlign: 'center',
                    padding: '60px',
                    color: 'rgba(255,255,255,0.5)'
                },
                children: "⏳ Загрузка..."
            }, void 0, false, {
                fileName: "[project]/src/app/dispatcher/page.tsx",
                lineNumber: 150,
                columnNumber: 9
            }, this) : viewMode === 'kanban' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$dispatcher$2f$KanbanBoard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                requests: requests,
                onRefresh: loadRequests
            }, void 0, false, {
                fileName: "[project]/src/app/dispatcher/page.tsx",
                lineNumber: 152,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$dispatcher$2f$TableView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                requests: requests
            }, void 0, false, {
                fileName: "[project]/src/app/dispatcher/page.tsx",
                lineNumber: 154,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/dispatcher/page.tsx",
        lineNumber: 50,
        columnNumber: 5
    }, this);
}
_s(DispatcherPage, "4T1Mbzq6dK8k5jpg3EBGhW4RqsA=");
_c = DispatcherPage;
var _c;
__turbopack_context__.k.register(_c, "DispatcherPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_7807a6d1._.js.map