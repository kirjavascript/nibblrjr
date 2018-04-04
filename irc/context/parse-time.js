const {
    addDays,
    addWeeks,
    addMonths,
    addYears,
    addHours,
    addMinutes,
    addSeconds,
    setYear,
    setMonth,
    setDate,
    setDay,
    setHours,
    setMinutes,
    setSeconds,
    format,
    parse,
} = require('date-fns');

const months = Array.from({length: 12}, (_,i) => format(new Date(1234,i,1), 'MMMM').toLowerCase());
const monthsShort = Array.from({length: 12}, (_,i) => format(new Date(1234,i,1), 'MMM').toLowerCase());
const ordinalDays = Array.from({length: 31}, (_,i) => format(new Date(1234,12,i+1), 'Do'));
const days = Array.from({length: 7}, (_,i) => format(new Date(1234,12,i), 'dddd').toLowerCase());
const daysShort = Array.from({length: 7}, (_,i) => format(new Date(1234,12,i), 'ddd').toLowerCase());

function parseTime(str) {

    const clean = str.toLowerCase();
    const tokens = clean.split(/(\s+)/g).map(d => d.trim());

    let out = new Date();

    // offsets

    if (tokens.includes('tomorrow')) {
        out = addDays(out, 1);
    }
    else if (/next\s+week/.test(clean)) {
        out = addWeeks(out, 1);
    }
    const dayOffset = str.match(/(\d+)\s*(d|days|day|dy)/);
    if (dayOffset) {
        const days = +dayOffset[1];
        out = addDays(out, days);
    }
    const monthOffset = str.match(/(\d+)\s*(M|month|months|mo)/);
    if (monthOffset) {
        const months = +monthOffset[1];
        out = addMonths(out, months);
    }
    const yearOffset = str.match(/(\d+)\s*(y|years|year|yr)/);
    if (yearOffset) {
        const years = +yearOffset[1];
        out = addYears(out, years);
    }
    const weekOffset = str.match(/(\d+)\s*(w|weeks|week|wk)/);
    if (weekOffset) {
        const weeks = +weekOffset[1];
        out = addWeeks(out, weeks);
    }
    const hourOffset = str.match(/(\d+)\s*(h|hours|hour|hr)/);
    if (hourOffset) {
        const hours = +hourOffset[1];
        out = addHours(out, hours);
    }
    const minuteOffset = str.match(/(\d+)\s*(m|minutes|minute|mins|min)/);
    if (minuteOffset) {
        const minutes = +minuteOffset[1];
        out = addMinutes(out, minutes);
    }
    const secondOffset = str.match(/(\d+)\s*(s|secs|seconds|second|sec)/);
    if (secondOffset) {
        const seconds = +secondOffset[1];
        out = addSeconds(out, seconds);
    }

    // overwrites

    // year
    const year = tokens.find(d => /\d{4}/g.test(d)); // TODO: update in 8000 years
    if (year) {
        out = setYear(out, year);
    }
    // month
    const month = tokens.find(d => months.includes(d));
    if (month) {
        out = setMonth(out, months.indexOf(month));
    }
    const monthShort = tokens.find(d => monthsShort.includes(d));
    if (monthShort) {
        out = setMonth(out, monthsShort.indexOf(monthShort));
    }
    // day
    const dayWord = tokens.find(d => days.includes(d));
    if (dayWord) {
        out = setDay(out, days.indexOf(dayWord));
    }
    const dayShort = tokens.find(d => daysShort.includes(d));
    if (dayShort) {
        out = setDay(out, daysShort.indexOf(dayShort));
    }
    const ordinalDay = tokens.find(d => ordinalDays.includes(d));
    if (ordinalDay) {
        out = setDate(out, ordinalDays.indexOf(ordinalDay) + 1);
    }
    // YYYY-MM-DD
    const iso = clean.match(/(\d{4}).(\d{2}).(\d{2})/);
    if (iso) {
        const [match, y, m, d] = iso;
        out = setYear(out, y);
        out = setMonth(out, m-1);
        out = setDay(out, d);
    }
    // HH:MM
    const time = clean.match(/(\d{2}):(\d{2})/);
    if (time) {
        const [match, h, m] = time;
        out = setHours(out, h);
        out = setMinutes(out, m);
    }
    // HH:MM:SS
    const timeFull = clean.match(/(\d{2}):(\d{2}):(\d{2})/);
    if (timeFull) {
        const [match, h, m, s] = timeFull;
        out = setHours(out, h);
        out = setMinutes(out, m);
        out = setSeconds(out, s);
    }
    // pm
    const pm = clean.match(/(\d+)\s*pm/);
    if (pm) {
        out = setHours(out, +pm[1] + 12);
    }
    // am
    const am = clean.match(/(\d+)\s*am/);
    if (am) {
        out = setHours(out, +am[1]);
    }

    return out;
}

const formatTime = (date) => {
    return format(date, 'dddd MMMM Do YYYY HH:mm:ss');
};

module.exports = {
    parseTime,
};
