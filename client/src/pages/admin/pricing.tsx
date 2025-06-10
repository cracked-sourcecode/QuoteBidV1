import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiFetch";
import { Settings, Zap, TrendingUp, Clock, Cpu, Activity, CheckCircle, AlertCircle, Save } from "lucide-react";

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

  // Local state for editing (unsaved changes)
  const [pendingVariableChanges, setPendingVariableChanges] = useState<Record<string, { weight: number; nonlinear_fn: string }>>({});
  const [pendingConfigChanges, setPendingConfigChanges] = useState<{ 
    priceStep?: number; 
    tickIntervalMs?: number;
    conversionPenalty?: number;
    pitchVelocityBoost?: number;
    outletLoadPenalty?: number;
  }>({});
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [isSaving, setIsSaving] = useState(false);

  // Check if there are any unsaved changes
  const hasUnsavedChanges = Object.keys(pendingVariableChanges).length > 0 || Object.keys(pendingConfigChanges).length > 0;

  // Get current value for display (pending changes take priority over saved values)
  const getCurrentVariableValue = (varName: string, field: 'weight' | 'nonlinear_fn') => {
    if (pendingVariableChanges[varName]?.[field] !== undefined) {
      return pendingVariableChanges[varName][field];
    }
    
    const variable = variables?.find((v: any) => v.var_name === varName);
    if (!variable) return field === 'weight' ? 0 : 'none';
    
    if (field === 'weight') {
      const weight = variable.weight;
      if (typeof weight === 'number') return weight;
      if (typeof weight === 'string') return parseFloat(weight) || 0;
      if (typeof weight === 'object' && weight?.dollars) return weight.dollars;
      return 0;
    } else {
      return variable.nonlinear_fn || 'none';
    }
  };

  const getCurrentConfigValue = (key: 'priceStep' | 'tickIntervalMs') => {
    if (pendingConfigChanges[key] !== undefined) {
      return pendingConfigChanges[key];
    }
    
    if (!config) return key === 'priceStep' ? 5 : 60000;
    
    const extractValue = (value: any, defaultVal: number) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'object' && value?.dollars) return value.dollars;
      if (typeof value === 'string') return parseFloat(value) || defaultVal;
      return defaultVal;
    };
    
    return extractValue(config[key], key === 'priceStep' ? 5 : 60000);
  };

  // Auto-sync to pricing engine after changes
  const syncToPricingEngine = async () => {
    try {
      setSyncStatus('syncing');
      const response = await apiFetch('/api/admin/reload-pricing-engine', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to sync pricing engine');
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  // Save all changes
  const saveAllChanges = async () => {
    if (!hasUnsavedChanges) return;
    
    setIsSaving(true);
    try {
      // Save variable changes
      for (const [varName, changes] of Object.entries(pendingVariableChanges)) {
        const response = await apiFetch(`/api/admin/variable/${varName}`, {
          method: 'PATCH',
          body: JSON.stringify(changes),
        });
        if (!response.ok) throw new Error(`Failed to update variable ${varName}`);
      }

      // Save config changes
      for (const [key, value] of Object.entries(pendingConfigChanges)) {
        if (value !== undefined) {
          const response = await apiFetch(`/api/admin/config/${key}`, {
            method: 'PATCH',
            body: JSON.stringify({ value }),
          });
          if (!response.ok) throw new Error(`Failed to update config ${key}`);
        }
      }

      // Clear pending changes
      setPendingVariableChanges({});
      setPendingConfigChanges({});

      // Refresh data
      await Promise.all([refetchVariables(), refetchConfig()]);

      toast({ 
        title: "Changes Saved", 
        description: "All changes saved successfully. Syncing to pricing engine...",
        className: "bg-green-50 border-green-200 text-green-800"
      });

      // Sync to pricing engine
      await syncToPricingEngine();

    } catch (error: any) {
      toast({ 
        title: "Save Failed", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle weight change (local only, not saved)
  const handleWeightChange = (varName: string, weight: number) => {
    setPendingVariableChanges(prev => ({
      ...prev,
      [varName]: {
        ...prev[varName],
        weight,
        nonlinear_fn: prev[varName]?.nonlinear_fn ?? getCurrentVariableValue(varName, 'nonlinear_fn')
      }
    }));
  };

  // Handle nonlinear function change (local only, not saved)
  const handleNonlinearFnChange = (varName: string, nonlinear_fn: string) => {
    setPendingVariableChanges(prev => ({
      ...prev,
      [varName]: {
        ...prev[varName],
        weight: prev[varName]?.weight ?? getCurrentVariableValue(varName, 'weight'),
        nonlinear_fn
      }
    }));
  };

  // Handle config changes (local only, not saved)
  const handleConfigChange = (key: 'priceStep' | 'tickIntervalMs', value: number) => {
    setPendingConfigChanges(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // V2 Weight Keys Configuration
  const V2_WEIGHT_KEYS = [
    {
      key: 'conversionPenalty',
      label: 'Vanity-click penalty', 
      description: 'Penalty applied for saves without engagement',
      min: -1,
      max: 0,
      step: 0.1,
      default: -0.4
    },
    {
      key: 'pitchVelocityBoost',
      label: 'Velocity boost',
      description: 'Boost applied for rapid pitch submissions', 
      min: 0,
      max: 1,
      step: 0.1,
      default: 0.2
    },
    {
      key: 'outletLoadPenalty', 
      label: 'Outlet-overload penalty',
      description: 'Penalty when outlet has too many opportunities',
      min: -1,
      max: 0,
      step: 0.1, 
      default: -0.2
    }
  ];

  // Get current v2 weight value
  const getCurrentV2WeightValue = (key: string) => {
    if ((pendingConfigChanges as any)[key] !== undefined) {
      return (pendingConfigChanges as any)[key];
    }
    
    if (!config) {
      const weightConfig = V2_WEIGHT_KEYS.find(w => w.key === key);
      return weightConfig?.default || 0;
    }
    
    const value = config[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    
    const weightConfig = V2_WEIGHT_KEYS.find(w => w.key === key);
    return weightConfig?.default || 0;
  };

  // Handle v2 weight changes
  const handleV2WeightChange = (key: string, value: number) => {
    setPendingConfigChanges(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Check if there are any v2 weight changes
  const hasV2WeightChanges = V2_WEIGHT_KEYS.some(weight => 
    (pendingConfigChanges as any)[weight.key] !== undefined
  );

  // Prepare chart data
  const chartData = metrics ? metrics.labels.map((label: string, index: number) => ({
    time: label,
    latency: metrics.latencyMs[index],
    tokens: metrics.tokens[index],
  })) : [];

  // Sync status indicator
  const SyncStatusIndicator = () => {
    switch (syncStatus) {
      case 'syncing':
        return (
          <div className="flex items-center gap-2 text-blue-600">
            <Activity className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Syncing to engine...</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Engine updated</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Sync failed</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-gray-500">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">Live Engine Control</span>
          </div>
        );
    }
  };

  if (variablesError || configError || metricsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Settings className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Pricing Control</h1>
          </div>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-red-600 font-medium">Error loading pricing data:</p>
                {variablesError && <p className="text-sm text-gray-600">Variables: {variablesError.message}</p>}
                {configError && <p className="text-sm text-gray-600">Config: {configError.message}</p>}
                {metricsError && <p className="text-sm text-gray-600">Metrics: {metricsError.message}</p>}
                <p className="text-sm text-gray-500 mt-4">
                  This could be due to missing API endpoints or insufficient admin permissions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pricing Control</h1>
              <p className="text-gray-600">Real-time pricing engine configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <SyncStatusIndicator />
            <Button 
              onClick={saveAllChanges}
              disabled={!hasUnsavedChanges || isSaving}
              className={hasUnsavedChanges ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "No Changes"}
            </Button>
          </div>
        </div>

        {/* Unsaved Changes Alert */}
        {hasUnsavedChanges && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  You have unsaved changes. Click "Save Changes" to apply them to the pricing engine.
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price Step */}
          <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 bg-green-100 rounded-md">
                  <Settings className="h-4 w-4 text-green-600" />
                </div>
                Price Step
                {pendingConfigChanges.priceStep !== undefined && (
                  <Badge variant="outline" className="ml-2 text-xs bg-orange-50 text-orange-700 border-orange-200">
                    Modified
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!config ? (
                <div className="flex items-center justify-center h-20">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Dollar amount per price step</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg font-semibold">$</span>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        step="1"
                        value={getCurrentConfigValue('priceStep')}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 5;
                          if (value >= 1 && value <= 20) {
                            handleConfigChange('priceStep', value);
                          }
                        }}
                        className="pl-8 text-center text-xl font-bold border-2 border-gray-200 focus:border-green-500 focus:ring-green-500"
                        placeholder="5"
                      />
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      Range: $1 - $20 per step
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tick Interval */}
          <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 bg-orange-100 rounded-md">
                  <Clock className="h-4 w-4 text-orange-600" />
                </div>
                Tick Interval
                {pendingConfigChanges.tickIntervalMs !== undefined && (
                  <Badge variant="outline" className="ml-2 text-xs bg-orange-50 text-orange-700 border-orange-200">
                    Modified
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!config ? (
                <div className="flex items-center justify-center h-20">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Engine processing frequency</label>
                    <Select
                      value={getCurrentConfigValue('tickIntervalMs').toString()}
                      onValueChange={(value) => {
                        const numValue = parseInt(value);
                        handleConfigChange('tickIntervalMs', numValue);
                      }}
                    >
                      <SelectTrigger className="text-center text-xl font-bold border-2 border-gray-200 focus:border-orange-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30000">30 seconds</SelectItem>
                        <SelectItem value="60000">1 minute</SelectItem>
                        <SelectItem value="90000">1.5 minutes</SelectItem>
                        <SelectItem value="120000">2 minutes</SelectItem>
                        <SelectItem value="180000">3 minutes</SelectItem>
                        <SelectItem value="300000">5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-gray-500 text-center">
                      How often the engine evaluates price changes
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* V2 Weight Keys Configuration */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="h-5 w-5 text-purple-600" />
              </div>
              V2 Weight Keys Configuration
              {hasV2WeightChanges && (
                <Badge variant="outline" className="ml-2 text-xs bg-orange-50 text-orange-700 border-orange-200">
                  {V2_WEIGHT_KEYS.filter(weight => (pendingConfigChanges as any)[weight.key] !== undefined).length} Modified
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!config ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="font-semibold text-gray-700">Key</TableHead>
                      <TableHead className="font-semibold text-gray-700">Value</TableHead>
                      <TableHead className="font-semibold text-gray-700">Description</TableHead>
                      <TableHead className="font-semibold text-gray-700">Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {V2_WEIGHT_KEYS.map((weight) => {
                                             const hasChanges = (pendingConfigChanges as any)[weight.key] !== undefined;
                      
                      return (
                        <TableRow key={weight.key} className={`hover:bg-blue-50/30 transition-colors ${hasChanges ? 'bg-orange-50/30' : ''}`}>
                                                     <TableCell className="font-medium text-gray-900">
                             <div className="flex items-center gap-2">
                               {weight.label}
                               {hasChanges && (
                                 <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                   Modified
                                 </Badge>
                               )}
                             </div>
                           </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={weight.min}
                              max={weight.max}
                              step={weight.step}
                              value={getCurrentV2WeightValue(weight.key)}
                              onChange={(e) => handleV2WeightChange(weight.key, parseFloat(e.target.value) || 0)}
                              className="w-24 text-center border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                            />
                          </TableCell>
                          <TableCell>
                            {weight.description}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {config?.updated_at ? new Date(config.updated_at).toLocaleString() : 'Never'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Variables Table */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              Pricing Variables
              {Object.keys(pendingVariableChanges).length > 0 && (
                <Badge variant="outline" className="ml-2 text-xs bg-orange-50 text-orange-700 border-orange-200">
                  {Object.keys(pendingVariableChanges).length} Modified
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!variables ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="font-semibold text-gray-700">Variable</TableHead>
                      <TableHead className="font-semibold text-gray-700">Weight</TableHead>
                      <TableHead className="font-semibold text-gray-700">Curve</TableHead>
                      <TableHead className="font-semibold text-gray-700">Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(variables) ? variables.map((variable: any) => {
                      const hasChanges = pendingVariableChanges[variable.var_name];
                      
                      return (
                        <TableRow key={variable.var_name || `var-${Math.random()}`} className={`hover:bg-blue-50/30 transition-colors ${hasChanges ? 'bg-orange-50/30' : ''}`}>
                          <TableCell className="font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {variable.var_name || 'Unknown'}
                              {hasChanges && (
                                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                  Modified
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.1"
                              min="-10"
                              max="10"
                              value={getCurrentVariableValue(variable.var_name, 'weight')}
                              onChange={(e) => handleWeightChange(variable.var_name, parseFloat(e.target.value) || 0)}
                              className="w-24 text-center border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={getCurrentVariableValue(variable.var_name, 'nonlinear_fn')}
                              onValueChange={(value) => handleNonlinearFnChange(variable.var_name, value)}
                            >
                              <SelectTrigger className="w-32 border-gray-200 focus:border-blue-400">
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
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                          No variables data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* GPT Performance Metrics */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Cpu className="h-5 w-5 text-indigo-600" />
              </div>
              GPT Performance Monitor
              <Badge variant="outline" className="ml-auto text-xs bg-green-50 text-green-700 border-green-200">
                Live data
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!metrics ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="w-full h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="latency" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 4, fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 