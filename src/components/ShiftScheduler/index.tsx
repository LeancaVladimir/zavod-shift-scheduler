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

            return (
              <div
                key={day.toString()}
                className={` p-1 rounded-xl border text-center transition-all duration-200 ${
                  shiftColors[shift]
                } ${!isCurrentMonth ? "opacity-40" : ""} ${
                  isToday ? "ring-2 ring-blue-500 font-bold" : ""
                }`}
              >
                <div className="text-sm">{format(day, "d")}</div>
                <div className="text-[10px] truncate">{shiftNames[shift]}</div>
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

                      return (
                        <div
                          key={day.toString()}
                          className={` p-1 rounded-xl border text-center ${
                            shiftColors[shift]
                          } ${!isCurrentMonth ? "opacity-30" : ""} ${
                            isToday ? "ring-2 ring-blue-500 font-bold" : ""
                          }`}
                        >
                          <div className="text-sm">{format(day, "d")}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
