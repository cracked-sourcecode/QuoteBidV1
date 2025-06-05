import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiFetch";
import { Settings, Zap, TrendingUp, Clock, Cpu } from "lucide-react";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function AdminPricing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // React Query hooks for data fetching
  const { data: variables, error: variablesError, refetch: refetchVariables } = useQuery({
    queryKey: ['/api/admin/variables'],
    queryFn: () => apiFetch('/api/admin/variables').then(res => res.json()),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: config, error: configError, refetch: refetchConfig } = useQuery({
    queryKey: ['/api/admin/config'],
    queryFn: () => apiFetch('/api/admin/config').then(res => res.json()),
    refetchInterval: 5000,
  });

  const { data: metrics, error: metricsError } = useQuery({
    queryKey: ['/api/admin/metrics'],
    queryFn: () => apiFetch('/api/admin/metrics').then(res => res.json()),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Local state for editing
  const [editingValues, setEditingValues] = useState<Record<string, { weight: number; nonlinear_fn: string }>>({});
  const [sliderValues, setSliderValues] = useState<{ priceStep: number; tickIntervalMs: number }>({
    priceStep: 5,
    tickIntervalMs: 60000,
  });

  // Update slider values when config loads
  useEffect(() => {
    if (config) {
      setSliderValues({
        priceStep: config.priceStep || 5,
        tickIntervalMs: config.tickIntervalMs || 60000,
      });
    }
  }, [config]);

  // Debounced values for auto-save
  const debouncedEditingValues = useDebounce(editingValues, 300);

  // Update variable mutation
  const updateVariableMutation = useMutation({
    mutationFn: async ({ name, data }: { name: string; data: { weight?: number; nonlinear_fn?: string } }) => {
      const response = await apiFetch(`/api/admin/variable/${name}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update variable');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Saved ✓", description: "Variable updated successfully" });
      refetchVariables(); // Revalidate variables data
    },
    onError: (error: any) => {
      toast({ 
        title: "Save failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: number }) => {
      const response = await apiFetch(`/api/admin/config/${key}`, {
        method: 'PATCH',
        body: JSON.stringify({ value }),
      });
      if (!response.ok) throw new Error('Failed to update config');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Saved ✓", description: "Configuration updated successfully" });
      refetchConfig(); // Revalidate config data
    },
    onError: (error: any) => {
      toast({ 
        title: "Save failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Auto-save effect for variables
  useEffect(() => {
    Object.entries(debouncedEditingValues).forEach(([varName, values]) => {
      updateVariableMutation.mutate({ name: varName, data: values });
    });
  }, [debouncedEditingValues]);

  // Handle weight change
  const handleWeightChange = (varName: string, weight: number) => {
    setEditingValues(prev => ({
      ...prev,
      [varName]: {
        ...prev[varName],
        weight,
      }
    }));
  };

  // Handle nonlinear function change
  const handleNonlinearFnChange = (varName: string, nonlinear_fn: string) => {
    setEditingValues(prev => ({
      ...prev,
      [varName]: {
        ...prev[varName],
        nonlinear_fn,
      }
    }));
  };

  // Handle slider changes (save immediately on release)
  const handleSliderChange = (key: 'priceStep' | 'tickIntervalMs', value: number[]) => {
    const newValue = value[0];
    setSliderValues(prev => ({ ...prev, [key]: newValue }));
    updateConfigMutation.mutate({ key, value: newValue });
  };

  // Prepare chart data
  const chartData = metrics ? metrics.labels.map((label: string, index: number) => ({
    time: label,
    latency: metrics.latencyMs[index],
    tokens: metrics.tokens[index],
  })) : [];

  if (variablesError || configError || metricsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Pricing Control</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">Error loading pricing data. Please check your admin permissions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Pricing Control</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Live Dashboard
          </Badge>
        </div>
      </div>

      {/* Variables Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pricing Variables
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!variables ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variable</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Curve</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variables.map((variable: any) => (
                  <TableRow key={variable.var_name}>
                    <TableCell className="font-medium">{variable.var_name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        min="-10"
                        max="10"
                        value={editingValues[variable.var_name]?.weight ?? (parseFloat(variable.weight) || 0)}
                        onChange={(e) => handleWeightChange(variable.var_name, parseFloat(e.target.value) || 0)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={editingValues[variable.var_name]?.nonlinear_fn ?? (variable.nonlinear_fn || 'none')}
                        onValueChange={(value) => handleNonlinearFnChange(variable.var_name, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">none</SelectItem>
                          <SelectItem value="decay24h">decay24h</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {variable.updated_at ? new Date(variable.updated_at).toLocaleString() : 'Never'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Configuration Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Price Step ($)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!config ? (
              <div className="flex items-center justify-center h-16">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">$1</span>
                  <span className="text-lg font-bold">${sliderValues.priceStep}</span>
                  <span className="text-sm text-gray-600">$20</span>
                </div>
                <Slider
                  value={[sliderValues.priceStep]}
                  onValueChange={(value) => handleSliderChange('priceStep', value)}
                  min={1}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tick Interval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!config ? (
              <div className="flex items-center justify-center h-16">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">30s</span>
                  <span className="text-lg font-bold">{Math.round(sliderValues.tickIntervalMs / 1000)}s</span>
                  <span className="text-sm text-gray-600">5m</span>
                </div>
                <Slider
                  value={[sliderValues.tickIntervalMs]}
                  onValueChange={(value) => handleSliderChange('tickIntervalMs', value)}
                  min={30000}
                  max={300000}
                  step={5000}
                  className="w-full"
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* GPT Metrics Sparkline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            GPT Performance (Last 60 Minutes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!metrics ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="w-full h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis hide />
                  <Line 
                    type="monotone" 
                    dataKey="latency" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 