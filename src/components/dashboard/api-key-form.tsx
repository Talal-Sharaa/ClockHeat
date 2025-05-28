
"use client";

import * as React from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { AlertCircle, KeyRound } from "lucide-react";
import { Alert, AlertDescription as UiAlertDescription } from "@/components/ui/alert"; // Renamed to avoid conflict

const apiKeySchema = z.object({
  apiKey: z.string().min(1, { message: "API Key is required." }),
});

type ApiKeyFormData = z.infer<typeof apiKeySchema>;

interface ApiKeyFormProps {
  onApiKeySubmit: (apiKey: string) => void;
  currentApiKey?: string | null;
  error?: string | null;
  onInputChange?: () => void;
}

export function ApiKeyForm({ onApiKeySubmit, currentApiKey, error, onInputChange }: ApiKeyFormProps) {
  const form = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      apiKey: currentApiKey || "",
    },
  });

  React.useEffect(() => {
    form.reset({ apiKey: currentApiKey || "" });
  }, [currentApiKey, form]);

  const onSubmit: SubmitHandler<ApiKeyFormData> = (data) => {
    onApiKeySubmit(data.apiKey);
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
            <KeyRound className="mr-2 h-5 w-5 text-primary" />
            Enter Your Clockify API Key
        </CardTitle>
        <CardDescription>
          Your API key is stored locally in your browser and used to fetch your Clockify data.
          You can find your API key in your Clockify profile settings.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <UiAlertDescription>{error}</UiAlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="apiKey">Clockify API Key</Label>
                  <FormControl>
                    <Input
                        id="apiKey"
                        type="password"
                        placeholder="Enter your Clockify API Key"
                        {...field}
                        onChange={(e) => {
                            field.onChange(e); 
                            if (onInputChange) onInputChange(); 
                        }}
                        className="text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">Save and Load Data</Button>
          </CardFooter>
        </form>
      </Form>
      {/* The redundant paragraph that was here has been removed. */}
    </Card>
  );
}

