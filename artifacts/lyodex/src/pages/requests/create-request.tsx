import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateRequest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { getListRequestsQueryKey } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";

export default function CreateRequest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createReq = useCreateRequest();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const cr = t.createRequest;
  const [selectedFormat, setSelectedFormat] = useState<string>("");

  const formSchema = z.object({
    format: z.string().min(1, cr.validationMaterial),
    format_other: z.string().optional(),
    quantity_kg: z.coerce.number().positive(cr.validationQuantity),
    deadline: z.string().min(1, cr.validationDeadline),
    budget_per_kg: z.coerce.number().positive().optional(),
    special_requirements: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      format: "",
      format_other: "",
      quantity_kg: 0,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      special_requirements: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const material_type =
      values.format === "other" ? (values.format_other || "Other") : values.format;
    createReq.mutate(
      {
        data: {
          material_type,
          quantity_kg: values.quantity_kg,
          deadline: values.deadline,
          budget_per_kg: values.budget_per_kg,
          special_requirements: values.special_requirements,
        },
      },
      {
        onSuccess: () => {
          toast({ title: cr.successTitle, description: cr.successDesc });
          queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
          setLocation(`/requests`);
        },
        onError: () => {
          toast({ title: cr.errorTitle, description: cr.errorDesc, variant: "destructive" });
        },
      }
    );
  };

  const formatOptions = [
    { value: "powder",  label: cr.formatPowder },
    { value: "granule", label: cr.formatGranule },
    { value: "whole",   label: cr.formatWhole },
    { value: "other",   label: cr.formatOther },
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{cr.title}</h1>
        <p className="text-muted-foreground">{cr.subtitle}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{cr.formatLabel}</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          setSelectedFormat(val);
                          field.onChange(val);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-format">
                            <SelectValue placeholder={cr.formatSelectPlaceholder} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {formatOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{cr.quantityKg}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="100" {...field} data-testid="input-quantity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {selectedFormat === "other" && (
                <FormField
                  control={form.control}
                  name="format_other"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{cr.formatOtherSpecify}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={cr.formatOtherPlaceholder}
                          {...field}
                          data-testid="input-format-other"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{cr.requiredBy}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-deadline" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="budget_per_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{cr.targetBudget}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="45.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="special_requirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{cr.certifications}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={cr.certificationsPlaceholder} className="h-24" {...field} />
                    </FormControl>
                    <FormDescription>{cr.certificationsHelp}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => history.back()}>
                  {cr.cancel}
                </Button>
                <Button type="submit" disabled={createReq.isPending} data-testid="btn-submit-request">
                  {createReq.isPending ? cr.submitting : cr.postRequest}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
