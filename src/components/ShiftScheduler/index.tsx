import { useCallback, useMemo, useState } from "react";
import {
  format,
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  getDay,
  subDays,
  getYear,
} from "date-fns";
import { ru } from "date-fns/locale";

const shiftNames = ["Выходной", "Утро (1)", "День (2)", "Ночь (3)"];
const shiftColors = [
  "bg-green-100 border-green-400 text-green-800",
  "bg-blue-100 border-blue-400 text-blue-800",
  "bg-yellow-100 border-yellow-400 text-yellow-800",
  "bg-red-100 border-red-400 text-red-800",
];

const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
enum Team {
  A = "A",
  B = "B",
  C = "C",
  D = "D",
}
const teamPatterns: Record<Team, number[]> = {
  D: [1, 1, 2, 2, 3, 3, 0, 0],
  A: [2, 2, 3, 3, 0, 0, 1, 1],
  B: [3, 3, 0, 0, 1, 1, 2, 2],
  C: [0, 0, 1, 1, 2, 2, 3, 3],
};

type Holiday = {
  date: string;
  name: string;
};

const fixedMoldovaHolidays = [
  { month: 1, day: 1, name: "Новый год" },
  { month: 1, day: 2, name: "Новый год (день 2)" },
  { month: 1, day: 7, name: "Рождество (юлиан.)" },
  { month: 3, day: 8, name: "Международный женский день" },
  { month: 5, day: 1, name: "День труда" },
  { month: 5, day: 9, name: "День Победы" },
  { month: 8, day: 27, name: "День независимости" },
  { month: 8, day: 31, name: "День языка" },
  { month: 12, day: 25, name: "Рождество (григ.)" },
] as const;

// Алгоритм Пасхи (юлианский -> григорианский) — источник: Meeus.
const getOrthodoxEaster = (year: number): Date => {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;

  // Юлианская дата Пасхи
  const julianEaster = new Date(Date.UTC(year, month - 1, day));
  // Переход к григорианскому календарю: разница 13 дней в XXI веке.
  return addDays(julianEaster, 13);
};

const getMoldovaHolidays = (year: number): Holiday[] => {
  const easter = getOrthodoxEaster(year);
  const holidays: Holiday[] = [
    ...fixedMoldovaHolidays.map((h) => ({
      date: format(new Date(year, h.month - 1, h.day), "yyyy-MM-dd"),
      name: h.name,
    })),
    { date: format(easter, "yyyy-MM-dd"), name: "Пасха (юлиан.)" },
    {
      date: format(addDays(easter, 1), "yyyy-MM-dd"),
      name: "Пасхальный понедельник",
    },
    { date: format(addDays(easter, 8), "yyyy-MM-dd"), name: "Радоница" },
  ];

  return holidays;
};

const baseDate = new Date("2025-01-20");

export const ShiftScheduler = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedTeam, setSelectedTeamState] = useState<Team>(() => {
    const savedTeam = localStorage.getItem("selectedTeam") as Team | null;
    return savedTeam ?? Team.A;
  });

  const setSelectedTeam = useCallback((team: Team) => {
    setSelectedTeamState(team);
    localStorage.setItem("selectedTeam", team);
  }, []);

  const prevMonth = () => setSelectedMonth(addMonths(selectedMonth, -1));
  const nextMonth = () => setSelectedMonth(addMonths(selectedMonth, 1));

  const generateShiftsMap = useCallback(
    (start: Date, end: Date, pattern: number[]): Map<string, number> => {
      const shiftsMap = new Map<string, number>();
      let currentDate = new Date(start);
      let patternIndex = 0;

      while (currentDate <= end) {
        const dayOfWeek = getDay(currentDate);
        const dateStr = format(currentDate, "yyyy-MM-dd");

        if (dayOfWeek === 0) {
          const friday = subDays(currentDate, 2);
          const fridayKey = format(friday, "yyyy-MM-dd");
          shiftsMap.set(dateStr, shiftsMap.get(fridayKey) ?? 0);
        } else {
          shiftsMap.set(dateStr, pattern[patternIndex % pattern.length]);
          patternIndex++;
        }

        currentDate = addDays(currentDate, 1);
      }

      return shiftsMap;
    },
    []
  );

  const shiftMap = useMemo(() => {
    const end = addMonths(selectedMonth, 4);
    const pattern = teamPatterns[selectedTeam];
    return generateShiftsMap(baseDate, end, pattern);
  }, [selectedMonth, selectedTeam, generateShiftsMap]);

  const holidayMap = useMemo(() => {
    const yearsToShow = [
      getYear(addMonths(selectedMonth, -1)),
      getYear(selectedMonth),
      getYear(addMonths(selectedMonth, 1)),
    ];

    const map = new Map<string, Holiday>();
    yearsToShow.forEach((year) => {
      getMoldovaHolidays(year).forEach((holiday) => {
        map.set(holiday.date, holiday);
      });
    });
    return map;
  }, [selectedMonth]);

  const getShiftForDate = useCallback(
    (date: Date): number => shiftMap.get(format(date, "yyyy-MM-dd")) ?? 0,
    [shiftMap]
  );

  const generateCalendarDays = useCallback(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    const startDay = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1;
    const calendarStart = subDays(monthStart, startDay);

    const endDay = getDay(monthEnd) === 0 ? 6 : getDay(monthEnd) - 1;
    const daysToAdd = 6 - endDay;
    const calendarEnd = addDays(monthEnd, daysToAdd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [selectedMonth]);

  return (
    <div className="container md:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
          График смен
        </h1>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Выберите свою команду:</h2>
          <div className="flex flex-wrap gap-2">
            {Object.values(Team).map((team) => (
              <button
                key={team}
                onClick={() => setSelectedTeam(team)}
                className={`px-4 py-2 rounded-xl border transition-all duration-200 text-sm font-medium ${
                  selectedTeam === team
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
                }`}
              >
                Команда {team}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-row justify-between items-center gap-4 mb-6">
          <button
            onClick={prevMonth}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300"
          >
            ←<span className="hidden sm:inline-block">Предыдущий</span>
          </button>
          <h2 className="text-xl font-semibold text-center">
            {format(selectedMonth, "MMMM yyyy", { locale: ru })}
          </h2>
          <button
            onClick={nextMonth}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300"
          >
            <span className="hidden sm:inline-block">Следующий</span>→
          </button>
        </div>

        <div className="grid grid-cols-7 text-sm font-semibold text-center text-gray-600 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {generateCalendarDays().map((day) => {
            const shift = getShiftForDate(day);
            const isCurrentMonth = isSameMonth(day, selectedMonth);
            const isToday =
              format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            const dateKey = format(day, "yyyy-MM-dd");
            const holiday = holidayMap.get(dateKey);

            return (
              <div
                key={day.toString()}
                className={`relative p-1 rounded-xl border text-center transition-all duration-200 ${
                  shiftColors[shift]
                } ${!isCurrentMonth ? "opacity-40" : ""} ${
                  isToday ? "ring-2 ring-blue-500 font-bold" : ""
                }`}
              >
                <div className="text-sm">{format(day, "d")}</div>
                <div className="text-[10px] truncate">{shiftNames[shift]}</div>
                {holiday && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] px-1 rounded-full border border-white">
                    {holiday.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4 text-center">Планировщик</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[-1, 0, 1].map((offset) => {
              const monthDate = addMonths(selectedMonth, offset);
              const monthStart = startOfMonth(monthDate);
              const monthEnd = endOfMonth(monthDate);
              const startWeekDay = (monthStart.getDay() + 6) % 7;

              const days = [
                ...Array(startWeekDay).fill(null),
                ...eachDayOfInterval({ start: monthStart, end: monthEnd }),
              ];

              return (
                <div
                  key={offset}
                  className="bg-white p-4 rounded-2xl shadow-md"
                >
                  <h3 className="text-lg font-semibold text-center mb-2">
                    {format(monthDate, "MMMM yyyy", { locale: ru })}
                  </h3>

                  <div className="grid grid-cols-7 text-xs font-medium text-center text-gray-600 mb-1">
                    {weekDays.map((day) => (
                      <div key={day}>{day}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {days.map((day, index) => {
                      if (!day) return <div key={`empty-${index}`} />;
                      const shift = getShiftForDate(day);
                      const isCurrentMonth = isSameMonth(day, monthDate);
                      const isToday =
                        format(day, "yyyy-MM-dd") ===
                        format(new Date(), "yyyy-MM-dd");
                      const dateKey = format(day, "yyyy-MM-dd");

                      return (
                        <div
                          key={day.toString()}
                          className={`relative p-1 rounded-xl border text-center ${
                            shiftColors[shift]
                          } ${!isCurrentMonth ? "opacity-30" : ""} ${
                            isToday ? "ring-2 ring-blue-500 font-bold" : ""
                          }`}
                        >
                          <div className="text-sm">{format(day, "d")}</div>
                          {holidayMap.get(dateKey) && (
                            <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-red-500 border border-white" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 border-t pt-4">
          <h3 className="text-lg font-semibold mb-2">
            Праздники Молдовы {getYear(selectedMonth)}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Праздники помечены красной меткой в календаре.
          </p>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {getMoldovaHolidays(getYear(selectedMonth)).map((holiday) => (
              <div
                key={holiday.date}
                className="flex items-center gap-2 rounded-lg border px-3 py-2"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="font-medium">
                  {format(new Date(holiday.date), "d MMMM", { locale: ru })}
                </span>
                <span className="text-gray-700">{holiday.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
