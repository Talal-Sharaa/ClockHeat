
"use client";

import * as React from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Keep if used directly, FormLabel is preferred within Form
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Target, Save, CalendarIcon, XCircle, PlusCircle, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Goal, GoalType } from "@/types";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const GOALS_STORAGE_KEY = "timeflow_goals_list";

const goalFormSchema = z.object({
  name: z.string().min(1, "Goal name is required.").max(100, "Goal name is too long."),
  type: z.enum(["weekly", "monthly"], {
    required_error: "You need to select a goal type.",
  }),
  hours: z.coerce.number().min(1, "Goal hours must be at least 1.").max(5000, "Goal hours seem too high (max 5000)."),
  customStartDate: z.date().optional().nullable(),
  customEndDate: z.date().optional().nullable(),
}).refine(data => {
  const { customStartDate, customEndDate } = data;
  if (customStartDate && !customEndDate) return false;
  if (!customStartDate && customEndDate) return false;
  if (customStartDate && customEndDate && customEndDate < customStartDate) return false;
  return true;
}, {
  message: "If using a custom period, both start and end dates are required, and end date must be on or after start date.",
  path: ["customEndDate"],
});

type GoalFormData = z.infer<typeof goalFormSchema>;

interface GoalSettingsCardProps {
  onGoalUpdated: () => void;
}

export function GoalSettingsCard({ onGoalUpdated }: GoalSettingsCardProps) {
  const { toast } = useToast();
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<Goal | null>(null);

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: "",
      type: "weekly",
      hours: 40,
      customStartDate: null,
      customEndDate: null,
    },
  });

  React.useEffect(() => {
    try {
      const storedGoalsString = localStorage.getItem(GOALS_STORAGE_KEY);
      if (storedGoalsString) {
        const storedGoals: Goal[] = JSON.parse(storedGoalsString);
        setGoals(storedGoals);
      }
    } catch (error) {
      console.error("Error loading goals from localStorage:", error);
      toast({ title: "Error", description: "Could not load saved goals.", variant: "destructive" });
    }
  }, [toast]);

  const saveGoalsToLocalStorage = (updatedGoals: Goal[]) => {
    try {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(updatedGoals));
      setGoals(updatedGoals);
      onGoalUpdated(); 
    } catch (error) {
      console.error("Error saving goals to localStorage:", error);
      toast({ title: "Error Saving Goals", description: "Could not save your goals.", variant: "destructive" });
    }
  };

  const handleFormSubmit: SubmitHandler<GoalFormData> = (data) => {
    let updatedGoals;
    if (editingGoal) {
      // Editing existing goal
      updatedGoals = goals.map(g => 
        g.id === editingGoal.id 
        ? { 
            ...g, 
            name: data.name,
            type: data.type as GoalType,
            hours: data.hours,
            customPeriodStart: data.customStartDate ? data.customStartDate.toISOString() : null,
            customPeriodEnd: data.customEndDate ? data.customEndDate.toISOString() : null,
          } 
        : g
      );
      toast({
        title: "Goal Updated!",
        description: `Goal "${data.name}" has been updated.`,
      });
    } else {
      // Adding new goal
      const newGoal: Goal = {
        id: Date.now().toString(), 
        name: data.name,
        type: data.type as GoalType,
        hours: data.hours,
        customPeriodStart: data.customStartDate ? data.customStartDate.toISOString() : null,
        customPeriodEnd: data.customEndDate ? data.customEndDate.toISOString() : null,
      };
      updatedGoals = [...goals, newGoal];
      toast({
        title: "Goal Added!",
        description: `Goal "${newGoal.name}" has been saved.`,
      });
    }
    saveGoalsToLocalStorage(updatedGoals);
    handleDialogClose();
  };

  const handleDeleteGoal = (goalId: string) => {
    const goalToDelete = goals.find(g => g.id === goalId);
    if (!goalToDelete) return;

    const updatedGoals = goals.filter(goal => goal.id !== goalId);
    saveGoalsToLocalStorage(updatedGoals);
    toast({
      title: "Goal Deleted",
      description: `Goal "${goalToDelete.name}" has been removed.`,
    });
  };
  
  const handleClearCustomDates = () => {
    form.setValue("customStartDate", null);
    form.setValue("customEndDate", null);
    toast({ title: "Custom Dates Cleared", description: "Custom date range has been cleared from the form." });
  };

  const openAddGoalDialog = () => {
    setEditingGoal(null);
    form.reset({ // Reset to defaults for adding
      name: "",
      type: "weekly",
      hours: 40,
      customStartDate: null,
      customEndDate: null,
    });
    setIsGoalDialogOpen(true);
  };

  const openEditGoalDialog = (goal: Goal) => {
    setEditingGoal(goal);
    form.reset({
      name: goal.name,
      type: goal.type,
      hours: goal.hours,
      customStartDate: goal.customPeriodStart ? parseISO(goal.customPeriodStart) : null,
      customEndDate: goal.customPeriodEnd ? parseISO(goal.customPeriodEnd) : null,
    });
    setIsGoalDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsGoalDialogOpen(false);
    setEditingGoal(null);
    form.reset(); // Reset form to default for next time
  };


  return (
    <Card className="shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg">
            <Target className="mr-2 h-5 w-5 text-primary" />
            Your Work Goals
          </CardTitle>
          <Button variant="outline" size="sm" onClick={openAddGoalDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Goal
          </Button>
        </div>
         <CardDescription>
          Manage your work goals. Add, edit, or delete goals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No goals set yet. Click "Add New Goal" to get started!</p>
        ) : (
          <ScrollArea className="h-[200px] pr-3">
            <ul className="space-y-3">
              {goals.map((goal) => (
                <li key={goal.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                  <div>
                    <p className="font-semibold text-sm">{goal.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Target: {goal.hours} hrs ({goal.customPeriodStart && goal.customPeriodEnd && isValid(parseISO(goal.customPeriodStart)) && isValid(parseISO(goal.customPeriodEnd)) ? `Custom: ${format(parseISO(goal.customPeriodStart), 'MMM d')} - ${format(parseISO(goal.customPeriodEnd), 'MMM d, yyyy')}` : goal.type})
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditGoalDialog(goal)} aria-label={`Edit goal ${goal.name}`}>
                      <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteGoal(goal.id)} aria-label={`Delete goal ${goal.name}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
      {goals.length > 0 && (
         <CardFooter className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Your goals are saved in your browser.
            </p>
         </CardFooter>
      )}

      <Dialog open={isGoalDialogOpen} onOpenChange={(open) => {
        if (!open) handleDialogClose(); else setIsGoalDialogOpen(true);
      }}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{editingGoal ? `Edit Goal: ${editingGoal.name}` : "Add New Work Goal"}</DialogTitle>
            <DialogDescription>
              {editingGoal ? "Update the details of your existing goal." : "Define a new goal. It will be saved locally in your browser."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="goalName">Goal Name</FormLabel>
                    <FormControl>
                      <Input id="goalName" placeholder="e.g., Project Alpha Sprint" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Goal Type (for default period)</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value} // Ensure value is controlled
                        className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="weekly" id="weeklyGoalForm" /></FormControl>
                          <FormLabel htmlFor="weeklyGoalForm" className="font-normal">Weekly</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="monthly" id="monthlyGoalForm" /></FormControl>
                          <FormLabel htmlFor="monthlyGoalForm" className="font-normal">Monthly</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>If no custom period, tracks against current week/month.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="goalHours">Target Hours</FormLabel>
                    <FormControl>
                      <Input
                        id="goalHours" type="number" placeholder="e.g., 40"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === '' ? undefined : parseFloat(value));
                        }}
                        value={field.value === undefined || isNaN(field.value) ? '' : field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2 pt-2 border-t">
                <FormLabel>Custom Goal Period (Optional)</FormLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <FormField control={form.control} name="customStartDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Start Date</FormLabel>
                      <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "LLL dd, y") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange}
                            disabled={(date) => (form.getValues("customEndDate") ? date > form.getValues("customEndDate")! : false) || date < new Date("1900-01-01")}
                            initialFocus />
                        </PopoverContent></Popover><FormMessage />
                    </FormItem>)}
                  />
                  <FormField control={form.control} name="customEndDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>End Date</FormLabel>
                      <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "LLL dd, y") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange}
                            disabled={(date) => (form.getValues("customStartDate") ? date < form.getValues("customStartDate")! : false)}
                            initialFocus />
                        </PopoverContent></Popover><FormMessage />
                    </FormItem>)}
                  />
                </div>
                {(form.watch("customStartDate") || form.watch("customEndDate")) && (
                  <Button type="button" variant="link" size="sm" onClick={handleClearCustomDates} className="p-0 h-auto text-muted-foreground hover:text-destructive">
                    <XCircle className="mr-1 h-3.5 w-3.5" /> Clear custom dates
                  </Button>
                )}
                <FormDescription>If set, progress uses this period. Else, uses weekly/monthly type.</FormDescription>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose}>Cancel</Button>
                <Button type="submit"><Save className="mr-2 h-4 w-4" />{editingGoal ? "Save Changes" : "Add Goal"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

