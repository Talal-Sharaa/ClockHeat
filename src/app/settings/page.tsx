
"use client";

import React from 'react';
import Link from 'next/link';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTheme, palettes } from '@/components/theme/theme-provider';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Palette, CheckCircle, LogOut, KeyRound, AlertTriangle, Save, Loader2, UserCircle, ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { setClockifyApiKey, getCurrentClockifyUser, getClockifyApiKey } from '@/lib/clockifyService';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

const apiKeyFormSchema = z.object({
  apiKey: z.string().min(1, { message: "API Key is required." }),
});
type ApiKeyFormData = z.infer<typeof apiKeyFormSchema>;

export default function SettingsPage() {
  const { selectedPalette, setPalette, mode } = useTheme();
  const router = useRouter();
  const { toast } = useToast();
  const [isKeyValidating, setIsKeyValidating] = React.useState(false);
  const [currentStoredApiKey, setCurrentStoredApiKey] = React.useState<string | null>(null);

  const apiKeyForm = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      apiKey: "",
    },
  });

  React.useEffect(() => {
    const storedKey = getClockifyApiKey();
    setCurrentStoredApiKey(storedKey);
    if (storedKey) {
      apiKeyForm.setValue("apiKey", storedKey);
    }
  }, [apiKeyForm]);


  const handlePaletteChange = (paletteName: string) => {
    setPalette(paletteName);
  };

  const handleResetToDefaultTheme = () => {
    setPalette('default');
  };

  const confirmClearApiKey = () => {
    setClockifyApiKey(null); // Clears from service and localStorage
    apiKeyForm.setValue("apiKey", ""); // Clear from form as well
    setCurrentStoredApiKey(null);
    toast({
        title: "API Key Cleared",
        description: "Your Clockify API key has been removed. You will be prompted on the dashboard.",
    });
    router.push('/'); 
  };

  const handleSaveAndValidateKey: SubmitHandler<ApiKeyFormData> = async (data) => {
    setIsKeyValidating(true);
    const newApiKey = data.apiKey;
    setClockifyApiKey(newApiKey); 

    try {
      const user = await getCurrentClockifyUser();
      setCurrentStoredApiKey(newApiKey); 
      toast({
        title: "API Key Validated & Saved!",
        description: `Successfully connected as ${user.name}.`,
        variant: "default",
      });
    } catch (error) {
      let errorMessage = "Invalid API Key or network issue. Please check and try again.";
      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("403")) {
          errorMessage = "Invalid API Key. Please check your key and try again.";
        } else if (error.message.toLowerCase().includes("api key is not set")) {
          errorMessage = "API Key was not set correctly. Please try again.";
        } else {
            errorMessage = error.message; 
        }
      }
      toast({
        title: "API Key Validation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsKeyValidating(false);
    }
  };


  const [currentYear, setCurrentYear] = React.useState<number | null>(null);
  React.useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-start p-6 md:p-8 lg:p-12">
        <div className="w-full max-w-2xl space-y-8">
          <div className="mb-6">
            <Link href="/" passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Palette className="mr-3 h-6 w-6 text-primary" />
                Theme Settings
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your ClockHeat dashboard. Changes are saved locally in your browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Color Palette</h3>
                <RadioGroup
                  value={selectedPalette}
                  onValueChange={handlePaletteChange}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {Object.entries(palettes).map(([key, palette]) => (
                    <Label
                      key={key}
                      htmlFor={`palette-${key}`}
                      className={`flex flex-col items-start space-y-2 rounded-lg border p-4 transition-all hover:shadow-md cursor-pointer
                                  ${selectedPalette === key ? 'ring-2 ring-primary border-primary shadow-lg' : 'border-border'}`}
                    >
                      <div className="flex w-full justify-between items-center">
                         <span className="font-medium">{palette.name}</span>
                         {selectedPalette === key && <CheckCircle className="h-5 w-5 text-primary" />}
                      </div>
                      <RadioGroupItem value={key} id={`palette-${key}`} className="sr-only" />
                      <div className="flex space-x-2 mt-2 w-full h-8">
                        <div
                          className="h-full w-1/3 rounded"
                          style={{ backgroundColor: `hsl(${palette.colors.primary})` }}
                          title={`Primary: ${palette.colors.primary}`}
                        />
                        <div
                          className="h-full w-1/3 rounded"
                          style={{ backgroundColor: `hsl(${palette.colors.accent})` }}
                          title={`Accent: ${palette.colors.accent}`}
                        />
                        <div
                          className="h-full w-1/3 rounded border"
                          style={{
                              backgroundColor: `hsl(${palette.colors.background})`,
                              borderColor: mode === 'dark' && palette.colors.background.endsWith('0%') ? 'hsl(var(--border))' : 'transparent'
                          }}
                          title={`Background: ${palette.colors.background}`}
                        />
                      </div>
                       <div className="text-xs text-muted-foreground mt-1">
                          Primary, Accent, Background
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="flex justify-start pt-4 border-t border-border">
                <Button variant="outline" onClick={handleResetToDefaultTheme}>
                  Reset to Default Theme
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <KeyRound className="mr-3 h-6 w-6 text-primary" />
                Clockify API Key
              </CardTitle>
              <CardDescription>
                Manage your Clockify API key. It is stored securely in your browser.
              </CardDescription>
            </CardHeader>
            <Form {...apiKeyForm}>
              <form onSubmit={apiKeyForm.handleSubmit(handleSaveAndValidateKey)}>
                <CardContent className="space-y-6">
                   {currentStoredApiKey && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-muted border border-border text-sm">
                      <UserCircle className="h-5 w-5 text-muted-foreground" />
                      <span className="text-muted-foreground">Current Key: ...{currentStoredApiKey.slice(-8)}</span>
                    </div>
                  )}
                  <FormField
                    control={apiKeyForm.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="apiKeyInput">Enter or Update API Key</FormLabel>
                        <FormControl>
                          <Input
                            id="apiKeyInput"
                            type="password"
                            placeholder="Enter your Clockify API Key"
                            {...field}
                            className="text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <p className="text-xs text-muted-foreground">
                    You can find your API key in your Clockify profile settings (bottom left of Clockify dashboard).
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t">
                  <Button type="submit" disabled={isKeyValidating} className="w-full sm:w-auto">
                    {isKeyValidating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save & Validate Key
                      </>
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full sm:w-auto" disabled={!currentStoredApiKey}>
                        <LogOut className="mr-2 h-4 w-4" /> Clear Stored API Key
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center">
                          <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                          Are you sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove your Clockify API key from this browser.
                          You will need to re-enter it to access your data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={confirmClearApiKey} 
                          className={cn(buttonVariants({ variant: "destructive" }))}
                        >
                          Yes, Clear API Key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </form>
            </Form>
          </Card>

        </div>
      </main>
       <footer className="py-6 px-4 md:px-8 text-center text-sm text-muted-foreground">
        {currentYear && <>© {currentYear} ClockHeat. All rights reserved.</>}
      </footer>
    </div>
  );
}
