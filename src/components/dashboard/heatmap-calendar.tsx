
"use client";

import * as React from 'react';
import { format, getDay, startOfWeek, addDays, getMonth, getYear, parseISO, isValid, eachWeekOfInterval, endOfWeek, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarDays } from 'lucide-react';
import type { HeatmapDataPoint } from '@/types';
import { getHeatmapCellColor, DAYS_OF_WEEK, MONTH_NAMES, HEATMAP_LEGEND_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

// --- Component Constants ---
const MIN_CELL_DIMENSION = 16;
const MAX_CELL_DIMENSION = 28;
const DEFAULT_CELL_DIMENSION = 20;
const CELL_GAP = 2;
const DAY_LABEL_COL_WIDTH_PX = 28;
const MONTH_LABEL_HEIGHT_PX = 20;


interface CellProps {
  date: Date;
  count: number;
  color: string;
  onClick?: () => void;
  isActiveCell: boolean; // Is the cell within the user's selected activeRange?
  isActuallyVisible: boolean; // Is the cell within the gridDisplayRange?
  style: React.CSSProperties;
}

const Cell = React.memo(({ date, count, color, onClick, isActiveCell, isActuallyVisible, style }: CellProps) => {
  if (!isActuallyVisible) {
    return <div style={style} className="bg-transparent" />;
  }

  const isClickable = !!onClick && isActiveCell && count > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            `rounded-sm transition-all duration-150 ease-in-out`,
            color,
            isClickable && "cursor-pointer hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          )}
          onClick={isClickable ? onClick : undefined}
          onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
          tabIndex={isClickable ? 0 : -1}
          role={isClickable ? "button" : undefined}
          aria-label={isActiveCell ? `${format(date, 'MMM d, yyyy')}: ${count.toFixed(1)} hours${isClickable ? '. Click for details.' : ''}` : format(date, 'MMM d, yyyy')}
          style={style}
        />
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">
          {format(date, 'MMM d, yyyy')}
          {isActiveCell && <br />}
          {isActiveCell && `Hours: ${count.toFixed(1)}`}
        </p>
      </TooltipContent>
    </Tooltip>
  );
});
Cell.displayName = 'HeatmapCell';


interface HeatmapCalendarProps {
  data?: HeatmapDataPoint[];
  gridDisplayStartDate: Date;
  gridDisplayEndDate: Date;
  activeRangeStartDate: Date;
  activeRangeEndDate: Date;
  onDayClick?: (date: Date) => void;
}

export function HeatmapCalendar({
  data = [],
  gridDisplayStartDate,
  gridDisplayEndDate,
  activeRangeStartDate,
  activeRangeEndDate,
  onDayClick
}: HeatmapCalendarProps) {
  const scrollViewportRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [cellSize, setCellSize] = React.useState(DEFAULT_CELL_DIMENSION);
  const [effectiveGap, setEffectiveGap] = React.useState(CELL_GAP);
  const [isGridScrollable, setIsGridScrollable] = React.useState(false);

  const dataMap = React.useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(item => {
      const dateObj = item.date instanceof Date ? item.date : parseISO(item.date as unknown as string);
      if (isValid(dateObj)) {
        map.set(format(dateObj, 'yyyy-MM-dd'), item.count);
      }
    });
    return map;
  }, [data]);

  const weeks = React.useMemo(() => {
    if (!gridDisplayStartDate || !gridDisplayEndDate || !isValid(gridDisplayStartDate) || !isValid(gridDisplayEndDate) || gridDisplayStartDate > gridDisplayEndDate) {
      return [];
    }
    const actualGridStart = startOfWeek(gridDisplayStartDate, { weekStartsOn: 0 });
    const actualGridEnd = endOfWeek(gridDisplayEndDate, { weekStartsOn: 0 });

    if (!isValid(actualGridStart) || !isValid(actualGridEnd) || actualGridStart > actualGridEnd) return [];

    const weekStarts = eachWeekOfInterval(
      { start: actualGridStart, end: actualGridEnd },
      { weekStartsOn: 0 }
    );
    return weekStarts.map(weekStart => {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(addDays(weekStart, i));
      }
      return week;
    });
  }, [gridDisplayStartDate, gridDisplayEndDate]);

  React.useEffect(() => {
    const viewportElement = scrollViewportRef.current;
    if (viewportElement) {
      const resizeObserver = new ResizeObserver(entries => {
        if (entries[0]) {
          setContainerWidth(entries[0].contentRect.width);
        }
      });
      resizeObserver.observe(viewportElement);
      setContainerWidth(viewportElement.offsetWidth);
      return () => resizeObserver.disconnect();
    }
  }, []);

  React.useEffect(() => {
    if (containerWidth > 0 && weeks.length > 0) {
      const numWeeks = weeks.length;
      const availableWidthForGrid = containerWidth;
      const totalWidthWithDefaultCells = (numWeeks * DEFAULT_CELL_DIMENSION) + Math.max(0, (numWeeks - 1)) * CELL_GAP;

      let newSize = DEFAULT_CELL_DIMENSION;
      let newIsGridScrollable = false;

      if (totalWidthWithDefaultCells <= availableWidthForGrid) {
        let expandedCellSize = DEFAULT_CELL_DIMENSION;
        if (numWeeks > 0) {
           expandedCellSize = Math.floor((availableWidthForGrid - (Math.max(0, numWeeks - 1) * CELL_GAP)) / numWeeks);
        }
        newSize = Math.min(MAX_CELL_DIMENSION, Math.max(MIN_CELL_DIMENSION, expandedCellSize));
        newIsGridScrollable = false;
      } else {
        newSize = MIN_CELL_DIMENSION;
        newIsGridScrollable = true;
      }
      setCellSize(newSize);
      setEffectiveGap(CELL_GAP);
      setIsGridScrollable(newIsGridScrollable);
    } else if (weeks.length === 0) {
      setCellSize(DEFAULT_CELL_DIMENSION);
      setEffectiveGap(CELL_GAP);
      setIsGridScrollable(false);
    }
  }, [containerWidth, weeks]);

  const monthLabels = React.useMemo(() => {
    const labels: { name: string; weekIndex: number }[] = [];
    if (!weeks.length || !gridDisplayStartDate || !gridDisplayEndDate) {
      return labels;
    }
    let lastMonthKey: string | null = null;

    weeks.forEach((week, weekIndex) => {
      const firstVisibleDayInThisGridColumn = week.find(d =>
        isValid(d) && isWithinInterval(d, { start: gridDisplayStartDate, end: gridDisplayEndDate })
      );

      if (firstVisibleDayInThisGridColumn) {
        const month = getMonth(firstVisibleDayInThisGridColumn);
        const year = getYear(firstVisibleDayInThisGridColumn);
        const currentMonthKey = `${year}-${month}`;

        if (currentMonthKey !== lastMonthKey) {
          labels.push({ name: MONTH_NAMES[month], weekIndex });
          lastMonthKey = currentMonthKey;
        }
      }
    });
    return labels;
  }, [weeks, gridDisplayStartDate, gridDisplayEndDate]);


  if (!gridDisplayStartDate || !gridDisplayEndDate || !isValid(gridDisplayStartDate) || !isValid(gridDisplayEndDate) || gridDisplayStartDate > gridDisplayEndDate) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <CalendarDays className="mr-2 h-5 w-5 text-primary" />
            Work Activity Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please select a valid date range to view activity.</p>
        </CardContent>
      </Card>
    );
  }

  const cardDescription = `Displaying activity from ${format(activeRangeStartDate, 'MMM d, yyyy')} to ${format(activeRangeEndDate, 'MMM d, yyyy')}.`;
  const calculatedGridWidth = (cellSize * weeks.length) + (Math.max(0, weeks.length - 1) * effectiveGap);

  return (
    <Card className="shadow-lg overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <CalendarDays className="mr-2 h-5 w-5 text-primary" />
          Work Activity Heatmap
        </CardTitle>
        <p className="text-sm text-muted-foreground">{cardDescription}</p>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <TooltipProvider delayDuration={100}>
          <div className="flex">
            <div
              style={{
                width: `${DAY_LABEL_COL_WIDTH_PX}px`,
                marginRight: weeks.length > 0 ? `${effectiveGap}px` : '0px',
                paddingTop: `${MONTH_LABEL_HEIGHT_PX + effectiveGap}px`
              }}
              className="flex flex-col flex-shrink-0 text-xs text-muted-foreground"
            >
              {[...Array(7)].map((_, i) => (
                <div
                  key={`day-label-${i}`}
                  style={{
                    height: `${cellSize}px`,
                    marginBottom: i < 6 ? `${effectiveGap}px` : '0px'
                  }}
                  className="flex items-center justify-end pr-1"
                >
                  {(i === 1 || i === 3 || i === 5) ? DAYS_OF_WEEK[i].substring(0,1) : <>&nbsp;</>}
                </div>
              ))}
            </div>

            <div ref={scrollViewportRef} className="overflow-x-auto flex-grow pb-1">
              <div style={{ width: isGridScrollable ? `${calculatedGridWidth}px` : '100%' }}>
                <div
                  className="grid grid-flow-col mb-1"
                  style={{
                    gap: `${effectiveGap}px`,
                    height: `${MONTH_LABEL_HEIGHT_PX}px`
                  }}
                >
                  {weeks.map((_weekInGrid, weekIndexInGrid) => {
                    const matchingMonthLabel = monthLabels.find(m => m.weekIndex === weekIndexInGrid);
                    return (
                      <div
                        key={`month-slot-${weekIndexInGrid}`}
                        style={{
                          width: `${cellSize}px`,
                          minWidth: `${cellSize}px`, // Ensure it doesn't shrink below cellSize
                          height: `${MONTH_LABEL_HEIGHT_PX}px`,
                        }}
                        className="text-xs text-muted-foreground flex items-center justify-center"
                      >
                        {matchingMonthLabel ? matchingMonthLabel.name : <span>&nbsp;</span>}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-flow-col" style={{gap: `${effectiveGap}px`}}>
                  {weeks.map((week, weekIndex) => (
                    <div
                      key={`week-${weekIndex}`}
                      className="grid grid-rows-7"
                      style={{gap: `${effectiveGap}px`}}
                    >
                      {week.map((day) => {
                        const isCellActuallyVisible = isValid(day) && isWithinInterval(day, { start: gridDisplayStartDate, end: gridDisplayEndDate });
                        const isCellInActiveRange = isValid(day) && activeRangeStartDate && activeRangeEndDate && isWithinInterval(day, { start: activeRangeStartDate, end: activeRangeEndDate });

                        const dateStr = format(day, 'yyyy-MM-dd');
                        const count = isCellInActiveRange ? (dataMap.get(dateStr) || 0) : 0;
                        
                        let cellColorClass = 'bg-transparent';
                        if (isCellActuallyVisible) {
                           cellColorClass = isCellInActiveRange ? getHeatmapCellColor(count) : 'bg-muted';
                        }
                        
                        return (
                          <Cell
                            key={dateStr}
                            date={day}
                            count={count}
                            color={cellColorClass}
                            onClick={onDayClick && isCellInActiveRange ? () => onDayClick(day) : undefined}
                            isActiveCell={isCellInActiveRange}
                            isActuallyVisible={isCellActuallyVisible}
                            style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-end items-center gap-x-3 sm:gap-x-4 gap-y-1">
            <span className="text-xs text-muted-foreground mr-1">Less</span>
            {HEATMAP_LEGEND_ITEMS.map((item, index) => (
              <div key={index} className="flex items-center gap-1">
                <div
                  className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm", item.colorClass)}
                  title={item.label}
                />
              </div>
            ))}
            <span className="text-xs text-muted-foreground ml-1">More</span>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

