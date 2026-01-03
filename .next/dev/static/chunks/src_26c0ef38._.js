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
"[project]/src/app/service-chief/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ServiceChiefPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Header$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/Header.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function ServiceChiefPage() {
    _s();
    const [serviceRequests, setServiceRequests] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedService, setSelectedService] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('SRV-STR');
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ServiceChiefPage.useEffect": ()=>{
            loadServiceRequests();
            // Real-time обновления
            const channel = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].channel('service-chief-updates').on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'requests',
                filter: `service_id=eq.${selectedService}`
            }, {
                "ServiceChiefPage.useEffect.channel": ()=>{
                    loadServiceRequests();
                }
            }["ServiceChiefPage.useEffect.channel"]).subscribe();
            return ({
                "ServiceChiefPage.useEffect": ()=>{
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].removeChannel(channel);
                }
            })["ServiceChiefPage.useEffect"];
        }
    }["ServiceChiefPage.useEffect"], [
        selectedService
    ]);
    async function loadServiceRequests() {
        setLoading(true);
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('requests').select('*').eq('service_id', selectedService).order('created_at', {
            ascending: false
        });
        if (error) {
            console.error('Ошибка загрузки заявок:', error);
            setLoading(false);
            return;
        }
        setServiceRequests(data || []);
        setLoading(false);
    }
    // Группировка по статусам (с явной типизацией)
    const groupedRequests = {
        'NEW': [],
        'PLANNED': [],
        'IN_PROGRESS': [],
        'CHECKING': [],
        'DONE': []
    };
    serviceRequests.forEach((req)=>{
        const status = req.status || 'NEW';
        if (groupedRequests[status]) {
            groupedRequests[status].push(req);
        } else {
            groupedRequests['NEW'].push(req);
        }
    });
    const statusLabels = {
        'NEW': '🆕 Новые',
        'PLANNED': '📋 Запланированные',
        'IN_PROGRESS': '⚙️ В работе',
        'CHECKING': '🔍 На проверке',
        'DONE': '✅ Выполнено'
    };
    const statusColors = {
        'NEW': 'rgba(234,179,8,0.2)',
        'PLANNED': 'rgba(59,130,246,0.2)',
        'IN_PROGRESS': 'rgba(139,92,246,0.2)',
        'CHECKING': 'rgba(249,115,22,0.2)',
        'DONE': 'rgba(34,197,94,0.2)'
    };
    const serviceNames = {
        'SRV-STR': '🔧 СЭИС',
        'SRV-ENG': '⚡ Энергетика',
        'SRV-FIRE': '🔥 Пожарка/Сантехника',
        'SRV-VENT': '💨 Вентиляция',
        'SRV-CCTV': '📹 Видеонаблюдение'
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '20px'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Header$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                title: "🏢 НАЧАЛЬНИК СЛУЖБЫ",
                subtitle: "План работ • Назначение людей • Контроль выполнения",
                userRole: "Начальник службы",
                userName: serviceNames[selectedService] || selectedService
            }, void 0, false, {
                fileName: "[project]/src/app/service-chief/page.tsx",
                lineNumber: 115,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '20px',
                    border: '1px solid rgba(255,255,255,0.1)'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'flex',
                        gap: '15px',
                        alignItems: 'flex-end'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                flex: 1
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    style: {
                                        color: 'rgba(255,255,255,0.7)',
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontSize: '14px'
                                    },
                                    children: "Выберите службу:"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/service-chief/page.tsx",
                                    lineNumber: 132,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                    value: selectedService,
                                    onChange: (e)=>setSelectedService(e.target.value),
                                    style: {
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        color: 'white',
                                        fontSize: '14px',
                                        width: '100%',
                                        maxWidth: '300px',
                                        cursor: 'pointer'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "SRV-STR",
                                            children: "🔧 СЭИС (STR)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/service-chief/page.tsx",
                                            lineNumber: 155,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "SRV-ENG",
                                            children: "⚡ Энергетика (ENG)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/service-chief/page.tsx",
                                            lineNumber: 156,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "SRV-FIRE",
                                            children: "🔥 Пожарка/Сантехника (FIRE)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/service-chief/page.tsx",
                                            lineNumber: 157,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "SRV-VENT",
                                            children: "💨 Вентиляция (VENT)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/service-chief/page.tsx",
                                            lineNumber: 158,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "SRV-CCTV",
                                            children: "📹 Видеонаблюдение/СКС (CCTV)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/service-chief/page.tsx",
                                            lineNumber: 159,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/service-chief/page.tsx",
                                    lineNumber: 140,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/service-chief/page.tsx",
                            lineNumber: 131,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: loadServiceRequests,
                            style: {
                                background: 'rgba(59,130,246,0.2)',
                                border: '1px solid rgba(59,130,246,0.3)',
                                borderRadius: '10px',
                                padding: '10px 20px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '14px'
                            },
                            children: "🔄 Обновить"
                        }, void 0, false, {
                            fileName: "[project]/src/app/service-chief/page.tsx",
                            lineNumber: 163,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/service-chief/page.tsx",
                    lineNumber: 130,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/service-chief/page.tsx",
                lineNumber: 123,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '16px',
                    marginBottom: '20px'
                },
                children: Object.entries(statusLabels).map(([status, label])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            background: statusColors[status],
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '16px',
                            textAlign: 'center'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '28px',
                                    fontWeight: 'bold',
                                    color: 'white',
                                    marginBottom: '8px'
                                },
                                children: groupedRequests[status].length
                            }, void 0, false, {
                                fileName: "[project]/src/app/service-chief/page.tsx",
                                lineNumber: 198,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: '13px',
                                    color: 'rgba(255,255,255,0.7)'
                                },
                                children: label
                            }, void 0, false, {
                                fileName: "[project]/src/app/service-chief/page.tsx",
                                lineNumber: 206,
                                columnNumber: 13
                            }, this)
                        ]
                    }, status, true, {
                        fileName: "[project]/src/app/service-chief/page.tsx",
                        lineNumber: 188,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/app/service-chief/page.tsx",
                lineNumber: 181,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid rgba(255,255,255,0.1)'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        style: {
                            color: 'white',
                            marginBottom: '20px',
                            fontSize: '18px'
                        },
                        children: [
                            "📊 Заявки службы ",
                            serviceNames[selectedService],
                            " (",
                            serviceRequests.length,
                            ")"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/service-chief/page.tsx",
                        lineNumber: 223,
                        columnNumber: 9
                    }, this),
                    loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            textAlign: 'center',
                            padding: '60px',
                            color: 'rgba(255,255,255,0.5)'
                        },
                        children: "⏳ Загрузка..."
                    }, void 0, false, {
                        fileName: "[project]/src/app/service-chief/page.tsx",
                        lineNumber: 228,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '16px'
                        },
                        children: Object.entries(groupedRequests).map(([status, requests])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        style: {
                                            color: 'white',
                                            marginBottom: '12px',
                                            fontSize: '14px',
                                            fontWeight: 'bold'
                                        },
                                        children: [
                                            statusLabels[status],
                                            " (",
                                            requests.length,
                                            ")"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/service-chief/page.tsx",
                                        lineNumber: 239,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '12px',
                                            minHeight: '200px'
                                        },
                                        children: [
                                            requests.map((req)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: '12px',
                                                        padding: '16px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    },
                                                    onMouseEnter: (e)=>{
                                                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                                    },
                                                    onMouseLeave: (e)=>{
                                                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                color: 'white',
                                                                fontWeight: 'bold',
                                                                marginBottom: '8px',
                                                                fontSize: '13px',
                                                                fontFamily: 'monospace'
                                                            },
                                                            children: req.request_id
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/service-chief/page.tsx",
                                                            lineNumber: 272,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                color: 'rgba(255,255,255,0.6)',
                                                                fontSize: '11px',
                                                                marginBottom: '8px'
                                                            },
                                                            children: [
                                                                req.date_work,
                                                                " • ",
                                                                req.shift_type === 'DAY' ? '🌞 День' : '🌙 Ночь'
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/service-chief/page.tsx",
                                                            lineNumber: 282,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                color: 'rgba(255,255,255,0.7)',
                                                                fontSize: '13px',
                                                                marginBottom: '8px'
                                                            },
                                                            children: [
                                                                "📍 ",
                                                                req.location_text
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/service-chief/page.tsx",
                                                            lineNumber: 290,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                color: 'rgba(255,255,255,0.9)',
                                                                fontSize: '13px',
                                                                marginBottom: '12px',
                                                                lineHeight: '1.4'
                                                            },
                                                            children: req.work_description
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/service-chief/page.tsx",
                                                            lineNumber: 298,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                display: 'flex',
                                                                gap: '6px',
                                                                flexWrap: 'wrap'
                                                            },
                                                            children: [
                                                                req.priority === 'HIGH' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    style: {
                                                                        display: 'inline-block',
                                                                        padding: '4px 8px',
                                                                        background: 'rgba(239,68,68,0.2)',
                                                                        border: '1px solid rgba(239,68,68,0.3)',
                                                                        borderRadius: '6px',
                                                                        fontSize: '11px',
                                                                        color: 'white'
                                                                    },
                                                                    children: "🔥 Приоритет"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/service-chief/page.tsx",
                                                                    lineNumber: 309,
                                                                    columnNumber: 27
                                                                }, this),
                                                                req.assigned_users && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    style: {
                                                                        display: 'inline-block',
                                                                        padding: '4px 8px',
                                                                        background: 'rgba(59,130,246,0.2)',
                                                                        border: '1px solid rgba(59,130,246,0.3)',
                                                                        borderRadius: '6px',
                                                                        fontSize: '11px',
                                                                        color: 'white'
                                                                    },
                                                                    children: [
                                                                        "👤 ",
                                                                        req.assigned_users
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/app/service-chief/page.tsx",
                                                                    lineNumber: 323,
                                                                    columnNumber: 27
                                                                }, this),
                                                                req.fact_start && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    style: {
                                                                        display: 'inline-block',
                                                                        padding: '4px 8px',
                                                                        background: 'rgba(139,92,246,0.2)',
                                                                        border: '1px solid rgba(139,92,246,0.3)',
                                                                        borderRadius: '6px',
                                                                        fontSize: '11px',
                                                                        color: 'white'
                                                                    },
                                                                    children: "▶️ Начато"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/service-chief/page.tsx",
                                                                    lineNumber: 337,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/app/service-chief/page.tsx",
                                                            lineNumber: 307,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, req.request_id, true, {
                                                    fileName: "[project]/src/app/service-chief/page.tsx",
                                                    lineNumber: 255,
                                                    columnNumber: 21
                                                }, this)),
                                            requests.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    textAlign: 'center',
                                                    padding: '40px 20px',
                                                    color: 'rgba(255,255,255,0.3)',
                                                    fontSize: '13px'
                                                },
                                                children: "Нет заявок"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/service-chief/page.tsx",
                                                lineNumber: 354,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/service-chief/page.tsx",
                                        lineNumber: 248,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, status, true, {
                                fileName: "[project]/src/app/service-chief/page.tsx",
                                lineNumber: 238,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/app/service-chief/page.tsx",
                        lineNumber: 232,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/service-chief/page.tsx",
                lineNumber: 217,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/service-chief/page.tsx",
        lineNumber: 109,
        columnNumber: 5
    }, this);
}
_s(ServiceChiefPage, "Xkz47H2UNGjxu0sxxAB2AK1RMFk=");
_c = ServiceChiefPage;
var _c;
__turbopack_context__.k.register(_c, "ServiceChiefPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_26c0ef38._.js.map