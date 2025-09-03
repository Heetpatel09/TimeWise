
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Dot } from "lucide-react"
import { DayPicker, DropdownProps } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { ScrollArea } from "./scroll-area"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-2xl font-bold",
        caption_dropdowns: "flex justify-center gap-1",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-full font-semibold text-base",
        row: "flex w-full mt-2",
        cell: "h-14 w-full text-center text-lg p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-14 w-full p-0 font-normal text-lg aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
        Dropdown: (props: DropdownProps) => {
          const { fromYear, fromMonth, fromDate, toYear, toMonth, toDate } = props;
          const {
            name,
            onChange,
            value
          } = props.value ? props : {
            name: '',
            onChange: () => {},
            value: 0
          };

          const options = [];
          if (name === "months") {
            for (let i = fromMonth!.getMonth(); i <= toMonth!.getMonth(); i++) {
              options.push({
                label: `${new Date(2024, i).toLocaleString("default", { month: "long" })}`,
                value: i.toString()
              });
            }
          } else if (name === "years") {
            const earliest = fromYear || new Date().getFullYear() - 100;
            const latest = toYear || new Date().getFullYear() + 1;
            for (let i = earliest; i <= latest; i++) {
              options.push({ label: `${i}`, value: i.toString() });
            }
          }

          return (
            <Select
              onValueChange={(newValue) => {
                const e: React.ChangeEvent<HTMLSelectElement> = {
                  target: { value: newValue },
                } as React.ChangeEvent<HTMLSelectElement>;
                onChange?.(e);
              }}
              value={value?.toString()}
            >
              <SelectTrigger>{value}</SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-72">
                {options.map((option) => (
                  <SelectItem key={option.label} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          );
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
