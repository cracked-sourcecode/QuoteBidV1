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
import { Settings, Zap, TrendingUp, Clock, Cpu, Activity, CheckCircle, AlertCircle, Save, Info, Target, AlertTriangle, BarChart3, DollarSign } from "lucide-react";

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

// Step 8: Weight Tuning Guidance Configuration
const WEIGHT_TUNING_GUIDE = [
  {
    symptom: "Prices still overshoot fast on small bursts",
    weight: "pitchVelocityBoost",
    direction: "Decrease",
    example: "0.2 → 0.1",
    description: "Reduces price sensitivity to rapid pitch activity",
    currentKey: "pitchVelocityBoost"
  },
  {
    symptom: "Too many vanity clicks inflate price",
    weight: "conversionPenalty", 
    direction: "More negative",
    example: "-0.4 → -0.6",
    description: "Stronger penalty for clicks without saves",
    currentKey: "conversionPenalty"
  },
  {
    symptom: "Outlet fatigue not strong enough",
    weight: "outletLoadPenalty",
    direction: "More negative", 
    example: "-0.2 → -0.4",
    description: "Increases penalty for overloaded outlets",
    currentKey: "outletLoadPenalty"
  },
  {
    symptom: "Dead opps decay too slowly",
    weight: "hoursRemaining weight",
    direction: "More negative",
    example: "-0.6 → -0.8",
    description: "Accelerates price decay over time",
    currentKey: "hoursRemaining"
  },
  {
    symptom: "Drift feels too chatty",
    weight: "ambient.triggerMins",
    direction: "Increase",
    example: "7 → 10 minutes",
    description: "Reduces frequency of ambient adjustments",
    currentKey: "ambient.triggerMins"
  },
  {
    symptom: "Email engagement not boosting prices enough",
    weight: "emailClickBoost",
    direction: "Increase",
    example: "0.05 → 0.1",
    description: "Stronger boost for pricing email clicks",
    currentKey: "emailClickBoost"
  },
  {
    symptom: "Email clicks causing price volatility",
    weight: "emailClickBoost",
    direction: "Decrease",
    example: "0.05 → 0.02",
    description: "Gentler boost for pricing email engagement",
    currentKey: "emailClickBoost"
  }
];



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

  // New state for Step 8 monitoring
  const [monitoringView, setMonitoringView] = useState<'weights' | 'tuning'>('weights');

  // Fetch real API usage data
  const { data: apiUsageData } = useQuery({
    queryKey: ['/api/admin/api-usage'],
    queryFn: () => apiFetch('/api/admin/api-usage').then(res => res.json()),
    refetchInterval: 60000, // Refresh every minute
  });

  // Local state for editing (unsaved changes)
  const [pendingVariableChanges, setPendingVariableChanges] = useState<Record<string, { weight: number; nonlinear_fn: string }>>({});
  const [pendingConfigChanges, setPendingConfigChanges] = useState<{ 
    priceStep?: number; 
    tickIntervalMs?: number;
    conversionPenalty?: number;
    pitchVelocityBoost?: number;
    outletLoadPenalty?: number;
    emailClickBoost?: number;
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
    },
    {
      key: 'emailClickBoost',
      label: 'Email-click boost',
      description: 'Boost applied when users click pricing emails',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.05
    },
    {
      key: 'ambient.cooldownMins',
      label: 'Pricing cooldown',
      description: 'Minutes between price updates for same opportunity',
      min: 1,
      max: 30,
      step: 1,
      default: 5
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
          <div className="flex items-center gap-2 text-blue-400">
            <Activity className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Syncing to engine...</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Engine updated</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Sync failed</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-slate-300">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">Live Engine Control</span>
          </div>
        );
    }
  };



  // Get tuning suggestion for current weight values
  const getTuningSuggestion = (guide: typeof WEIGHT_TUNING_GUIDE[0]) => {
    const currentValue = getCurrentV2WeightValue(guide.currentKey);
    return {
      ...guide,
      currentValue,
      needsAttention: false // You could add logic here based on health metrics
    };
  };

  if (variablesError || configError || metricsError) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Settings className="h-6 w-6 text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Pricing Control</h1>
          </div>
          <Card className="border-red-500/30 bg-slate-800/50 backdrop-blur-lg border border-white/20">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-red-400 font-medium">Error loading pricing data:</p>
                {variablesError && <p className="text-sm text-slate-300">Variables: {variablesError.message}</p>}
                {configError && <p className="text-sm text-slate-300">Config: {configError.message}</p>}
                {metricsError && <p className="text-sm text-slate-300">Metrics: {metricsError.message}</p>}
                <p className="text-sm text-slate-400 mt-4">
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
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header with Step 8 Navigation */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-white">Pricing Control v2</h1>
                <p className="text-slate-300 text-lg">Post-Deploy Monitoring & Tuning</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <SyncStatusIndicator />
            <Button 
              onClick={saveAllChanges}
              disabled={!hasUnsavedChanges || isSaving}
                className={hasUnsavedChanges ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white" : "bg-slate-600 text-slate-300"}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "No Changes"}
            </Button>
            </div>
          </div>
        </div>

        {/* Step 8: Navigation Tabs */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-6 mb-8">
          <div className="flex space-x-1">
              {[
                { key: 'weights', label: 'Weight Configuration', icon: Settings },
                { key: 'tuning', label: 'Tuning Guide', icon: Target }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setMonitoringView(key as any)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
                    monitoringView === key
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
        </div>

        {/* Unsaved Changes Alert */}
        {hasUnsavedChanges && (
          <div className="p-4 bg-orange-500/20 border border-orange-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-orange-300">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  You have unsaved changes. Click "Save Changes" to apply them to the pricing engine.
                </span>
              </div>
                </div>
              )}
              


        {/* Step 8-B: Weight Tuning Guide */}
        {monitoringView === 'tuning' && (
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
            <Card className="border-0 bg-transparent">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-xl text-white">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Target className="h-5 w-5 text-purple-400" />
                </div>
                Weight-Tuning Cheat Sheet
                <Badge variant="outline" className="ml-auto text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
                  Live Guidance
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {WEIGHT_TUNING_GUIDE.map((guide, index) => {
                  const suggestion = getTuningSuggestion(guide);
                  
                  return (
                    <Card key={index} className="bg-slate-700/20 border border-white/10 hover:border-orange-500/30 transition-colors">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="h-4 w-4 text-orange-400" />
                              <h4 className="font-semibold text-white">{guide.symptom}</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-slate-400">Adjust Weight:</p>
                                <p className="font-medium text-blue-400">{guide.weight}</p>
                              </div>
                              <div>
                                <p className="text-slate-400">Direction:</p>
                                <p className="font-medium text-white">{guide.direction}</p>
                              </div>
                              <div>
                                <p className="text-slate-400">Example:</p>
                                <p className="font-mono text-sm bg-slate-600/50 px-2 py-1 rounded text-white">{guide.example}</p>
                              </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">{guide.description}</p>
                          </div>
                          <div className="ml-4 text-right">
                            <p className="text-xs text-slate-400">Current Value</p>
                            <p className="font-mono text-sm font-semibold text-white">
                              {suggestion.currentValue}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              <div className="mt-6 p-4 bg-green-500/20 rounded-lg border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-green-400" />
                  <h4 className="font-semibold text-green-300">Quick Tuning Tips</h4>
                </div>
                <ul className="text-sm text-green-200 space-y-1">
                  <li>• Edit weights in the "Weight Configuration" tab</li>
                  <li>• Worker picks up changes automatically next cycle</li>
                  <li>• Monitor impact in "24h Health Monitor" tab</li>
                  <li>• Set Grafana alerts at ±25% outside healthy bands</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Existing Configuration Sections - show when weights tab is active */}
        {monitoringView === 'weights' && (
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 space-y-8">
            {/* Configuration Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Price Step */}
              <Card className="border-0 bg-transparent">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <div className="p-1.5 bg-green-500/20 rounded-md">
                      <Settings className="h-4 w-4 text-green-400" />
                    </div>
                    Price Step
                    {pendingConfigChanges.priceStep !== undefined && (
                      <Badge variant="outline" className="ml-2 text-xs bg-orange-500/20 text-orange-300 border-orange-500/30">
                        Modified
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!config ? (
                    <div className="flex items-center justify-center h-20">
                      <div className="animate-spin w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-300">Dollar amount per price step</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-lg font-semibold">$</span>
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
                            className="pl-8 text-center text-xl font-bold bg-slate-700/50 border-slate-600 text-white focus:border-green-500 focus:ring-green-500"
                            placeholder="5"
                          />
                        </div>
                        <div className="text-xs text-slate-400 text-center">
                          Range: $1 - $20 per step
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Tick Interval */}
              <Card className="border-0 bg-transparent">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <div className="p-1.5 bg-orange-500/20 rounded-md">
                      <Clock className="h-4 w-4 text-orange-400" />
                    </div>
                    Tick Interval
                    {pendingConfigChanges.tickIntervalMs !== undefined && (
                      <Badge variant="outline" className="ml-2 text-xs bg-orange-500/20 text-orange-300 border-orange-500/30">
                        Modified
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!config ? (
                    <div className="flex items-center justify-center h-20">
                      <div className="animate-spin w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-300">Engine processing frequency</label>
                        <Select
                          value={getCurrentConfigValue('tickIntervalMs').toString()}
                          onValueChange={(value) => {
                            const numValue = parseInt(value);
                            handleConfigChange('tickIntervalMs', numValue);
                          }}
                        >
                          <SelectTrigger className="text-center text-xl font-bold bg-slate-700/50 border-slate-600 text-white focus:border-orange-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            <SelectItem value="30000" className="text-white hover:bg-slate-700">30 seconds</SelectItem>
                            <SelectItem value="60000" className="text-white hover:bg-slate-700">1 minute</SelectItem>
                            <SelectItem value="90000" className="text-white hover:bg-slate-700">1.5 minutes</SelectItem>
                            <SelectItem value="120000" className="text-white hover:bg-slate-700">2 minutes</SelectItem>
                            <SelectItem value="180000" className="text-white hover:bg-slate-700">3 minutes</SelectItem>
                            <SelectItem value="300000" className="text-white hover:bg-slate-700">5 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-slate-400 text-center">
                          How often the engine evaluates price changes
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* V2 Weight Keys Configuration */}
            <Card className="border-0 bg-transparent">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-2 text-xl text-white">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Settings className="h-5 w-5 text-purple-400" />
                  </div>
                  V2 Weight Keys Configuration
                  {hasV2WeightChanges && (
                    <Badge variant="outline" className="ml-2 text-xs bg-orange-500/20 text-orange-300 border-orange-500/30">
                      {V2_WEIGHT_KEYS.filter(weight => (pendingConfigChanges as any)[weight.key] !== undefined).length} Modified
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!config ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                        {V2_WEIGHT_KEYS.map((weight) => {
                          const hasChanges = (pendingConfigChanges as any)[weight.key] !== undefined;
                          
                          return (
                        <div key={weight.key} className={`bg-slate-700/20 rounded-lg p-4 border border-white/10 hover:border-purple-500/30 transition-colors ${hasChanges ? 'border-orange-500/30 bg-orange-500/10' : ''}`}>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div className="font-medium text-white">
                                <div className="flex items-center gap-2">
                                  {weight.label}
                                  {hasChanges && (
                                  <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-300 border-orange-500/30">
                                      Modified
                                    </Badge>
                                  )}
                                </div>
                            </div>
                            <div>
                                <Input
                                  type="number"
                                  min={weight.min}
                                  max={weight.max}
                                  step={weight.step}
                                  value={getCurrentV2WeightValue(weight.key)}
                                  onChange={(e) => handleV2WeightChange(weight.key, parseFloat(e.target.value) || 0)}
                                className="w-24 text-center bg-slate-600/50 border-slate-500 text-white focus:border-purple-400 focus:ring-purple-400"
                                />
                            </div>
                            <div className="text-slate-300 text-sm">
                                {weight.description}
                            </div>
                            <div className="text-sm text-slate-400">
                                {config?.updated_at ? new Date(config.updated_at).toLocaleString() : 'Never'}
                            </div>
                          </div>
                        </div>
                          );
                        })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Variables Table */}
            <Card className="border-0 bg-transparent">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-2 text-xl text-white">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                  </div>
                  Pricing Variables
                  {Object.keys(pendingVariableChanges).length > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs bg-orange-500/20 text-orange-300 border-orange-500/30">
                      {Object.keys(pendingVariableChanges).length} Modified
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!variables ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                        {Array.isArray(variables) ? variables.map((variable: any) => {
                          const hasChanges = pendingVariableChanges[variable.var_name];
                          
                          return (
                        <div key={variable.var_name || `var-${Math.random()}`} className={`bg-slate-700/20 rounded-lg p-4 border border-white/10 hover:border-purple-500/30 transition-colors ${hasChanges ? 'border-orange-500/30 bg-orange-500/10' : ''}`}>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div className="font-medium text-white">
                                <div className="flex items-center gap-2">
                                  {variable.var_name || 'Unknown'}
                                  {hasChanges && (
                                  <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-300 border-orange-500/30">
                                      Modified
                                    </Badge>
                                  )}
                                </div>
                            </div>
                            <div>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="-10"
                                  max="10"
                                  value={getCurrentVariableValue(variable.var_name, 'weight')}
                                  onChange={(e) => handleWeightChange(variable.var_name, parseFloat(e.target.value) || 0)}
                                className="w-24 text-center bg-slate-600/50 border-slate-500 text-white focus:border-purple-400 focus:ring-purple-400"
                                />
                            </div>
                            <div>
                                <Select
                                  value={getCurrentVariableValue(variable.var_name, 'nonlinear_fn')}
                                  onValueChange={(value) => handleNonlinearFnChange(variable.var_name, value)}
                                >
                                <SelectTrigger className="w-32 bg-slate-600/50 border-slate-500 text-white focus:border-purple-400">
                                    <SelectValue />
                                  </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600">
                                  <SelectItem value="none" className="text-white hover:bg-slate-700">none</SelectItem>
                                  <SelectItem value="decay24h" className="text-white hover:bg-slate-700">decay24h</SelectItem>
                                  </SelectContent>
                                </Select>
                            </div>
                            <div className="text-sm text-slate-400">
                                {variable.updated_at ? new Date(variable.updated_at).toLocaleString() : 'Never'}
                            </div>
                          </div>
                        </div>
                          );
                        }) : (
                      <div className="text-center text-slate-400 py-8">
                              No variables data available
                      </div>
                        )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API Usage & Cost Monitor */}
            <Card className="border-0 bg-transparent">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-2 text-xl text-white">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <Cpu className="h-5 w-5 text-indigo-400" />
                  </div>
                  API Usage & Cost Monitor
                  <Badge variant="outline" className="ml-auto text-xs bg-green-500/20 text-green-300 border-green-500/30">
                    Live data
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!metrics ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-700/20 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm text-slate-400">Daily API Calls</p>
                          <p className="text-2xl font-bold text-white">{apiUsageData?.dailyCalls?.toLocaleString() || '0'}</p>
                        </div>
                        <Activity className="h-8 w-8 text-blue-400" />
                      </div>
                      <p className="text-xs text-slate-400">
                        {apiUsageData?.callsChange ? 
                          `${apiUsageData.callsChange > 0 ? '+' : ''}${apiUsageData.callsChange}% from yesterday` : 
                          'Loading...'
                        }
                      </p>
                    </div>
                    
                    <div className="bg-slate-700/20 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm text-slate-400">Daily Cost</p>
                          <p className="text-2xl font-bold text-green-400">${apiUsageData?.dailyCost?.toFixed(2) || '0.00'}</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-400" />
                      </div>
                      <p className="text-xs text-slate-400">OpenAI API usage (last 24h)</p>
                    </div>
                    
                    <div className="bg-slate-700/20 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm text-slate-400">Avg Tokens/Call</p>
                          <p className="text-2xl font-bold text-purple-400">{apiUsageData?.avgTokensPerCall?.toLocaleString() || '0'}</p>
                        </div>
                        <Zap className="h-8 w-8 text-purple-400" />
                      </div>
                      <p className="text-xs text-slate-400">Input + Output combined</p>
                    </div>
                    
                    <div className="bg-slate-700/20 rounded-lg p-4 border border-white/10 md:col-span-3">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-white">API Breakdown (Last 24h)</h4>
                        <TrendingUp className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">GPT-4 Calls</p>
                          <p className="font-semibold text-white">
                            {apiUsageData?.gpt4Calls?.toLocaleString() || '0'} 
                            (${apiUsageData?.gpt4Cost?.toFixed(2) || '0.00'})
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">GPT-3.5 Calls</p>
                          <p className="font-semibold text-white">
                            {apiUsageData?.gpt35Calls?.toLocaleString() || '0'} 
                            (${apiUsageData?.gpt35Cost?.toFixed(2) || '0.00'})
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Total Tokens</p>
                          <p className="font-semibold text-white">{apiUsageData?.totalTokens?.toLocaleString() || '0'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Error Rate</p>
                          <p className="font-semibold text-white">{apiUsageData?.errorRate?.toFixed(1) || '0.0'}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 