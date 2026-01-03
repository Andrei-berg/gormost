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
"[project]/src/app/boss/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>BossPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Header$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/Header.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function BossPage() {
    _s();
    const [stats, setStats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [selectedPeriod, setSelectedPeriod] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('shift');
    const [selectedDate, setSelectedDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Date().toISOString().split('T')[0]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "BossPage.useEffect": ()=>{
            loadStats();
            // Real-time обновления каждые 10 секунд
            const interval = setInterval(loadStats, 10000);
            const channel = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].channel('boss-monitoring').on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'requests'
            }, {
                "BossPage.useEffect.channel": ()=>{
                    loadStats();
                }
            }["BossPage.useEffect.channel"]).subscribe();
            return ({
                "BossPage.useEffect": ()=>{
                    clearInterval(interval);
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].removeChannel(channel);
                }
            })["BossPage.useEffect"];
        }
    }["BossPage.useEffect"], [
        selectedDate,
        selectedPeriod
    ]);
    async function loadStats() {
        const { data: requests } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('requests').select('*').eq('date_work', selectedDate);
        if (!requests) return;
        // Группировка по службам
        const byService = {
            'SRV-STR': {
                total: 0,
                done: 0,
                inProgress: 0,
                problems: 0
            },
            'SRV-ENG': {
                total: 0,
                done: 0,
                inProgress: 0,
                problems: 0
            },
            'SRV-FIRE': {
                total: 0,
                done: 0,
                inProgress: 0,
                problems: 0
            },
            'SRV-VENT': {
                total: 0,
                done: 0,
                inProgress: 0,
                problems: 0
            },
            'SRV-CCTV': {
                total: 0,
                done: 0,
                inProgress: 0,
                problems: 0
            },
            'SRV-OTHER': {
                total: 0,
                done: 0,
                inProgress: 0,
                problems: 0
            }
        };
        requests.forEach((r)=>{
            const service = r.service_id || 'SRV-OTHER';
            if (byService[service]) {
                byService[service].total++;
                if (r.status === 'done') byService[service].done++;
                if (r.status === 'in_progress') byService[service].inProgress++;
                if (r.priority === 'urgent' && r.status !== 'done') byService[service].problems++;
            }
        });
        // KPI
        const totalRequests = requests.length;
        const doneRequests = requests.filter((r)=>r.status === 'done').length;
        const urgentRequests = requests.filter((r)=>r.priority === 'urgent').length;
        const problemRequests = requests.filter((r)=>r.priority === 'urgent' && r.status !== 'done').length;
        const completionRate = totalRequests > 0 ? Math.round(doneRequests / totalRequests * 100) : 0;
        // Средняя скорость (mock)
        const avgSpeed = '2.5 часа';
        setStats({
            byService,
            totalRequests,
            doneRequests,
            urgentRequests,
            problemRequests,
            completionRate,
            avgSpeed
        });
    }
    async function exportReport() {
        alert('Экспорт отчёта в Excel (функция в разработке)');
    // TODO: Генерация Excel через библиотеку
    }
    if (!stats) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
            },
            children: "Загрузка дашборда..."
        }, void 0, false, {
            fileName: "[project]/src/app/boss/page.tsx",
            lineNumber: 86,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '20px'
        },
        className: "jsx-82800555234e8b51",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Header$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                title: "👔 ДАШБОРД НАЧАЛЬНИКА УЧАСТКА",
                subtitle: "Мониторинг всех служб • KPI • Проблемы • Аналитика",
                userRole: "Начальник участка",
                userName: "Лефортовский тоннель"
            }, void 0, false, {
                fileName: "[project]/src/app/boss/page.tsx",
                lineNumber: 105,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '20px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                },
                className: "jsx-82800555234e8b51",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                        value: selectedPeriod,
                        onChange: (e)=>setSelectedPeriod(e.target.value),
                        style: {
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '10px',
                            padding: '10px 16px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        },
                        className: "jsx-82800555234e8b51",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "shift",
                                className: "jsx-82800555234e8b51",
                                children: "За смену"
                            }, void 0, false, {
                                fileName: "[project]/src/app/boss/page.tsx",
                                lineNumber: 137,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "week",
                                className: "jsx-82800555234e8b51",
                                children: "За неделю"
                            }, void 0, false, {
                                fileName: "[project]/src/app/boss/page.tsx",
                                lineNumber: 138,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "month",
                                className: "jsx-82800555234e8b51",
                                children: "За месяц"
                            }, void 0, false, {
                                fileName: "[project]/src/app/boss/page.tsx",
                                lineNumber: 139,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/boss/page.tsx",
                        lineNumber: 124,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "date",
                        value: selectedDate,
                        onChange: (e)=>setSelectedDate(e.target.value),
                        style: {
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '10px',
                            padding: '10px 16px',
                            color: 'white',
                            fontSize: '14px'
                        },
                        className: "jsx-82800555234e8b51"
                    }, void 0, false, {
                        fileName: "[project]/src/app/boss/page.tsx",
                        lineNumber: 142,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: exportReport,
                        style: {
                            marginLeft: 'auto',
                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px 20px',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        },
                        className: "jsx-82800555234e8b51",
                        children: "📥 Экспорт отчёта"
                    }, void 0, false, {
                        fileName: "[project]/src/app/boss/page.tsx",
                        lineNumber: 156,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/boss/page.tsx",
                lineNumber: 113,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '16px',
                    marginBottom: '20px'
                },
                className: "jsx-82800555234e8b51",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(KPICard, {
                        title: "Всего заявок",
                        value: stats.totalRequests,
                        color: "#8b5cf6",
                        trend: "+12%"
                    }, void 0, false, {
                        fileName: "[project]/src/app/boss/page.tsx",
                        lineNumber: 180,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(KPICard, {
                        title: "Выполнено",
                        value: stats.doneRequests,
                        color: "#22c55e",
                        percentage: stats.completionRate
                    }, void 0, false, {
                        fileName: "[project]/src/app/boss/page.tsx",
                        lineNumber: 186,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(KPICard, {
                        title: "Проблемы",
                        value: stats.problemRequests,
                        color: "#ef4444",
                        trend: stats.problemRequests > 0 ? '🚨' : '✅'
                    }, void 0, false, {
                        fileName: "[project]/src/app/boss/page.tsx",
                        lineNumber: 192,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(KPICard, {
                        title: "Срочные",
                        value: stats.urgentRequests,
                        color: "#eab308"
                    }, void 0, false, {
                        fileName: "[project]/src/app/boss/page.tsx",
                        lineNumber: 198,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(KPICard, {
                        title: "Средняя скорость",
                        value: stats.avgSpeed,
                        color: "#3b82f6",
                        isText: true
                    }, void 0, false, {
                        fileName: "[project]/src/app/boss/page.tsx",
                        lineNumber: 203,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/boss/page.tsx",
                lineNumber: 174,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr',
                    gap: '20px',
                    marginBottom: '20px'
                },
                className: "jsx-82800555234e8b51",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                            padding: '20px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        },
                        className: "jsx-82800555234e8b51",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                style: {
                                    color: 'white',
                                    fontSize: '20px',
                                    marginBottom: '20px'
                                },
                                className: "jsx-82800555234e8b51",
                                children: "📊 Мониторинг служб (LIVE)"
                            }, void 0, false, {
                                fileName: "[project]/src/app/boss/page.tsx",
                                lineNumber: 225,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px'
                                },
                                className: "jsx-82800555234e8b51",
                                children: Object.entries(stats.byService).map(([serviceId, data])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ServiceMonitor, {
                                        serviceId: serviceId,
                                        data: data
                                    }, serviceId, false, {
                                        fileName: "[project]/src/app/boss/page.tsx",
                                        lineNumber: 231,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/app/boss/page.tsx",
                                lineNumber: 229,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/boss/page.tsx",
                        lineNumber: 219,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                            padding: '20px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        },
                        className: "jsx-82800555234e8b51",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                style: {
                                    color: 'white',
                                    fontSize: '20px',
                                    marginBottom: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                },
                                className: "jsx-82800555234e8b51",
                                children: [
                                    "🚨 Проблемы и риски",
                                    stats.problemRequests > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            background: 'rgba(239,68,68,0.3)',
                                            borderRadius: '999px',
                                            padding: '4px 12px',
                                            fontSize: '14px',
                                            animation: 'pulse 2s infinite'
                                        },
                                        className: "jsx-82800555234e8b51",
                                        children: stats.problemRequests
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/boss/page.tsx",
                                        lineNumber: 257,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/boss/page.tsx",
                                lineNumber: 247,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                },
                                className: "jsx-82800555234e8b51",
                                children: [
                                    stats.problemRequests > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ProblemAlert, {
                                        type: "urgent",
                                        message: `${stats.problemRequests} срочных заявок не выполнены`
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/boss/page.tsx",
                                        lineNumber: 271,
                                        columnNumber: 15
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            textAlign: 'center',
                                            padding: '40px 20px',
                                            color: 'rgba(255,255,255,0.4)'
                                        },
                                        className: "jsx-82800555234e8b51",
                                        children: "✅ Критических проблем нет"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/boss/page.tsx",
                                        lineNumber: 276,
                                        columnNumber: 15
                                    }, this),
                                    stats.totalRequests === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ProblemAlert, {
                                        type: "warning",
                                        message: "Нет заявок на сегодня"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/boss/page.tsx",
                                        lineNumber: 286,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/boss/page.tsx",
                                lineNumber: 269,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/boss/page.tsx",
                        lineNumber: 241,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/boss/page.tsx",
                lineNumber: 212,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px'
                },
                className: "jsx-82800555234e8b51",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                            padding: '20px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        },
                        className: "jsx-82800555234e8b51",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                style: {
                                    color: 'white',
                                    fontSize: '16px',
                                    marginBottom: '16px'
                                },
                                className: "jsx-82800555234e8b51",
                                children: "📈 Динамика выполнения"
                            }, void 0, false, {
                                fileName: "[project]/src/app/boss/page.tsx",
                                lineNumber: 308,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    height: '200px',
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    gap: '8px',
                                    padding: '20px 0'
                                },
                                className: "jsx-82800555234e8b51",
                                children: [
                                    'Пн',
                                    'Вт',
                                    'Ср',
                                    'Чт',
                                    'Пт',
                                    'Сб',
                                    'Вс'
                                ].map((day, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '8px'
                                        },
                                        className: "jsx-82800555234e8b51",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    width: '100%',
                                                    height: `${Math.random() * 150 + 50}px`,
                                                    background: 'linear-gradient(180deg, #8b5cf6 0%, #3b82f6 100%)',
                                                    borderRadius: '8px 8px 0 0',
                                                    transition: 'all 0.3s'
                                                },
                                                className: "jsx-82800555234e8b51"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/boss/page.tsx",
                                                lineNumber: 320,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    color: 'rgba(255,255,255,0.6)',
                                                    fontSize: '12px'
                                                },
                                                className: "jsx-82800555234e8b51",
                                                children: day
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/boss/page.tsx",
                                                lineNumber: 327,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, day, true, {
                                        fileName: "[project]/src/app/boss/page.tsx",
                                        lineNumber: 319,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/app/boss/page.tsx",
                                lineNumber: 311,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/boss/page.tsx",
                        lineNumber: 302,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                            padding: '20px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        },
                        className: "jsx-82800555234e8b51",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                style: {
                                    color: 'white',
                                    fontSize: '16px',
                                    marginBottom: '16px'
                                },
                                className: "jsx-82800555234e8b51",
                                children: "🔥 Heatmap загрузки служб"
                            }, void 0, false, {
                                fileName: "[project]/src/app/boss/page.tsx",
                                lineNumber: 340,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                },
                                className: "jsx-82800555234e8b51",
                                children: Object.entries(stats.byService).map(([serviceId, data])=>{
                                    const load = data.total > 0 ? Math.round(data.inProgress / data.total * 100) : 0;
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        },
                                        className: "jsx-82800555234e8b51",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    color: 'rgba(255,255,255,0.7)',
                                                    fontSize: '12px',
                                                    width: '80px'
                                                },
                                                className: "jsx-82800555234e8b51",
                                                children: serviceId
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/boss/page.tsx",
                                                lineNumber: 348,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    flex: 1,
                                                    height: '24px',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    borderRadius: '999px',
                                                    overflow: 'hidden'
                                                },
                                                className: "jsx-82800555234e8b51",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        width: `${load}%`,
                                                        height: '100%',
                                                        background: load > 70 ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)' : load > 40 ? 'linear-gradient(90deg, #eab308 0%, #ca8a04 100%)' : 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                                                        transition: 'width 0.5s'
                                                    },
                                                    className: "jsx-82800555234e8b51"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/boss/page.tsx",
                                                    lineNumber: 358,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/boss/page.tsx",
                                                lineNumber: 351,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    color: 'white',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    width: '50px',
                                                    textAlign: 'right'
                                                },
                                                className: "jsx-82800555234e8b51",
                                                children: [
                                                    load,
                                                    "%"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/boss/page.tsx",
                                                lineNumber: 367,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, serviceId, true, {
                                        fileName: "[project]/src/app/boss/page.tsx",
                                        lineNumber: 347,
                                        columnNumber: 17
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/src/app/boss/page.tsx",
                                lineNumber: 343,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/boss/page.tsx",
                        lineNumber: 334,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/boss/page.tsx",
                lineNumber: 296,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                id: "82800555234e8b51",
                children: "@keyframes pulse{0%,to{opacity:1}50%{opacity:.5}}"
            }, void 0, false, void 0, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/boss/page.tsx",
        lineNumber: 100,
        columnNumber: 5
    }, this);
}
_s(BossPage, "tPhhc/S7OJiSqu/HwLnWKXZFGR8=");
_c = BossPage;
function KPICard({ title, value, color, trend, percentage, isText }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${color}40`
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '12px',
                    marginBottom: '8px'
                },
                children: title
            }, void 0, false, {
                fileName: "[project]/src/app/boss/page.tsx",
                lineNumber: 395,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    color: isText ? color : color,
                    fontSize: isText ? '20px' : '32px',
                    fontWeight: 'bold',
                    marginBottom: '8px'
                },
                children: value
            }, void 0, false, {
                fileName: "[project]/src/app/boss/page.tsx",
                lineNumber: 398,
                columnNumber: 7
            }, this),
            trend && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    color: trend.startsWith('+') ? '#22c55e' : trend === '🚨' ? '#ef4444' : '#6b7280',
                    fontSize: '12px'
                },
                children: trend
            }, void 0, false, {
                fileName: "[project]/src/app/boss/page.tsx",
                lineNumber: 407,
                columnNumber: 9
            }, this),
            percentage !== undefined && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    marginTop: '8px',
                    height: '4px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '999px',
                    overflow: 'hidden'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        width: `${percentage}%`,
                        height: '100%',
                        background: color,
                        transition: 'width 0.5s'
                    }
                }, void 0, false, {
                    fileName: "[project]/src/app/boss/page.tsx",
                    lineNumber: 422,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/boss/page.tsx",
                lineNumber: 415,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/boss/page.tsx",
        lineNumber: 389,
        columnNumber: 5
    }, this);
}
_c1 = KPICard;
function ServiceMonitor({ serviceId, data }) {
    const serviceColors = {
        'SRV-STR': '#8b5cf6',
        'SRV-ENG': '#eab308',
        'SRV-FIRE': '#ef4444',
        'SRV-VENT': '#06b6d4',
        'SRV-CCTV': '#22c55e'
    };
    const color = serviceColors[serviceId] || '#6b7280';
    const completionRate = data.total > 0 ? Math.round(data.done / data.total * 100) : 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${color}30`
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    color: 'white',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    marginBottom: '4px'
                                },
                                children: serviceId
                            }, void 0, false, {
                                fileName: "[project]/src/app/boss/page.tsx",
                                lineNumber: 455,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    color: 'rgba(255,255,255,0.6)',
                                    fontSize: '12px'
                                },
                                children: [
                                    "Всего: ",
                                    data.total,
                                    " • Выполнено: ",
                                    data.done,
                                    " • В работе: ",
                                    data.inProgress
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/boss/page.tsx",
                                lineNumber: 458,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/boss/page.tsx",
                        lineNumber: 454,
                        columnNumber: 9
                    }, this),
                    data.problems > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: 'rgba(239,68,68,0.3)',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            color: '#ef4444',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            height: 'fit-content'
                        },
                        children: [
                            "🚨 ",
                            data.problems
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/boss/page.tsx",
                        lineNumber: 463,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/boss/page.tsx",
                lineNumber: 453,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    height: '8px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '999px',
                    overflow: 'hidden'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        width: `${completionRate}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`,
                        transition: 'width 0.5s'
                    }
                }, void 0, false, {
                    fileName: "[project]/src/app/boss/page.tsx",
                    lineNumber: 483,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/boss/page.tsx",
                lineNumber: 477,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    marginTop: '8px',
                    color: color,
                    fontSize: '14px',
                    fontWeight: 'bold'
                },
                children: [
                    completionRate,
                    "% выполнено"
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/boss/page.tsx",
                lineNumber: 491,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/boss/page.tsx",
        lineNumber: 447,
        columnNumber: 5
    }, this);
}
_c2 = ServiceMonitor;
function ProblemAlert({ type, message }) {
    const colors = {
        urgent: {
            bg: 'rgba(239,68,68,0.2)',
            border: '#ef4444',
            icon: '🚨'
        },
        warning: {
            bg: 'rgba(234,179,8,0.2)',
            border: '#eab308',
            icon: '⚠️'
        }
    };
    const c = colors[type] || colors.warning;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            background: c.bg,
            border: `1px solid ${c.border}`,
            borderRadius: '10px',
            padding: '12px',
            color: 'white',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                style: {
                    fontSize: '20px'
                },
                children: c.icon
            }, void 0, false, {
                fileName: "[project]/src/app/boss/page.tsx",
                lineNumber: 523,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: message
            }, void 0, false, {
                fileName: "[project]/src/app/boss/page.tsx",
                lineNumber: 524,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/boss/page.tsx",
        lineNumber: 512,
        columnNumber: 5
    }, this);
}
_c3 = ProblemAlert;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "BossPage");
__turbopack_context__.k.register(_c1, "KPICard");
__turbopack_context__.k.register(_c2, "ServiceMonitor");
__turbopack_context__.k.register(_c3, "ProblemAlert");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_5c801543._.js.map