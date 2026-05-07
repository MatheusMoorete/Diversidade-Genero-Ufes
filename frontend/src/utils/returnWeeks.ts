import {
  addWeeks,
  differenceInCalendarDays,
  differenceInCalendarWeeks,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns';

const WEEK_STARTS_ON = 1;

export const parseReturnDate = (dateValue: string | Date): Date => {
  const parsedDate = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
  return startOfDay(parsedDate);
};

export const getReturnWeekStart = (dateValue: string | Date): Date => {
  return startOfWeek(parseReturnDate(dateValue), { weekStartsOn: WEEK_STARTS_ON });
};

export const getReturnWeekKey = (dateValue: string | Date): string => {
  return format(getReturnWeekStart(dateValue), 'yyyy-MM-dd');
};

export const formatReturnWeekRange = (dateValue: string | Date): string => {
  const weekStart = getReturnWeekStart(dateValue);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: WEEK_STARTS_ON });
  return `${format(weekStart, 'dd/MM/yyyy')} a ${format(weekEnd, 'dd/MM/yyyy')}`;
};

export const getRelativeReturnWeekLabel = (
  dateValue: string | Date,
  baseDate: Date = new Date()
): string => {
  const targetWeek = getReturnWeekStart(dateValue);
  const currentWeek = getReturnWeekStart(baseDate);
  const weekDiff = differenceInCalendarWeeks(targetWeek, currentWeek, {
    weekStartsOn: WEEK_STARTS_ON,
  });

  if (weekDiff === 0) return 'Nesta semana';
  if (weekDiff === 1) return 'Proxima semana';
  if (weekDiff === -1) return 'Semana passada';
  if (weekDiff < 0) return `Ha ${Math.abs(weekDiff)} semanas`;
  return `Em ${weekDiff} semanas`;
};

export const getReturnWindowDaysFromWeeks = (
  weekCount: number,
  baseDate: Date = new Date()
): number => {
  const today = parseReturnDate(baseDate);
  const currentWeek = getReturnWeekStart(baseDate);
  const windowEnd = endOfWeek(addWeeks(currentWeek, weekCount - 1), {
    weekStartsOn: WEEK_STARTS_ON,
  });

  return Math.max(0, differenceInCalendarDays(windowEnd, today));
};
