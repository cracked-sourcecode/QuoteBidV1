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
import { Settings, Zap, TrendingUp, Clock, Cpu, Activity, CheckCircle, AlertCircle, Save, Info, Target, AlertTriangle, BarChart3 } from "lucide-react";

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

// Health status indicators for monitoring
const HEALTH_BANDS = {
  driftCount: { min: 0, max: 6, unit: '/hr', label: 'Drift Count' },
  priceDelita: { min: 1, max: 15, unit: '$', label: 'Avg Price Delta' },
  conversionRate: { min: 10, max: 100, unit: '%', label: 'Pitch-to-Click' },
  timeToFloor: { min: 0, max: 24, unit: 'hrs', label: 'Time to Floor' },
  ceilingHits: { min: 0, max: 2, unit: '%', label: 'Ceiling Hits' }
};

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
  const [monitoringView, setMonitoringView] = useState<'weights' | 'health' | 'tuning'>('weights');
  const [healthMetrics, setHealthMetrics] = useState<any>(null);

  // Fetch health metrics
  const { data: healthData } = useQuery({
    queryKey: ['/api/admin/health-metrics'],
    queryFn: () => apiFetch('/api/admin/health-metrics').then(res => res.json()),
    refetchInterval: 30000, // Refresh every 30 seconds
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

  // Health status checker
  const getHealthStatus = (metric: string, value: number) => {
    const band = HEALTH_BANDS[metric as keyof typeof HEALTH_BANDS];
    if (!band) return 'unknown';
    
    if (value >= band.min && value <= band.max) return 'healthy';
    if (value > band.max * 1.25 || value < band.min * 0.75) return 'critical';
    return 'warning';
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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
        {/* Header with Step 8 Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pricing Control v2</h1>
              <p className="text-gray-600">Post-Deploy Monitoring & Tuning</p>
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

        {/* Step 8: Navigation Tabs */}
        <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex space-x-1 mb-6">
              {[
                { key: 'weights', label: 'Weight Configuration', icon: Settings },
                { key: 'health', label: '24h Health Monitor', icon: Activity },
                { key: 'tuning', label: 'Tuning Guide', icon: Target }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setMonitoringView(key as any)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
                    monitoringView === key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

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

        {/* Step 8-A: 24-Hour Health Monitor */}
        {monitoringView === 'health' && (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                24-Hour Post-Deploy Health Monitor
                <Badge variant="outline" className="ml-auto text-xs bg-blue-50 text-blue-700 border-blue-200">
                  Live KPIs
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!healthData ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(HEALTH_BANDS).map(([key, band]) => {
                    const value = healthData[key] || 0;
                    const status = getHealthStatus(key, value);
                    
                    return (
                      <Card key={key} className={`border-2 ${getHealthColor(status)}`}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{band.label}</p>
                              <p className="text-2xl font-bold">
                                {value.toFixed(1)}{band.unit}
                              </p>
                              <p className="text-xs text-gray-500">
                                Target: {band.min}-{band.max}{band.unit}
                              </p>
                            </div>
                            <div className="text-right">
                              {status === 'healthy' && <CheckCircle className="h-5 w-5 text-green-600" />}
                              {status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                              {status === 'critical' && <AlertCircle className="h-5 w-5 text-red-600" />}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📊 Exit Criteria for Canary → Prod</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✅ All KPIs in healthy band for 24+ hours</li>
                  <li>✅ No error spikes in worker logs</li>
                  <li>✅ PM sign-off on price curves & Admin UX</li>
                  <li>🚀 Ready for production deployment</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 8-B: Weight Tuning Guide */}
        {monitoringView === 'tuning' && (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                Weight-Tuning Cheat Sheet
                <Badge variant="outline" className="ml-auto text-xs bg-purple-50 text-purple-700 border-purple-200">
                  Live Guidance
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {WEIGHT_TUNING_GUIDE.map((guide, index) => {
                  const suggestion = getTuningSuggestion(guide);
                  
                  return (
                    <Card key={index} className="border border-gray-200 hover:border-blue-300 transition-colors">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                              <h4 className="font-semibold text-gray-900">{guide.symptom}</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Adjust Weight:</p>
                                <p className="font-medium text-blue-600">{guide.weight}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Direction:</p>
                                <p className="font-medium">{guide.direction}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Example:</p>
                                <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{guide.example}</p>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">{guide.description}</p>
                          </div>
                          <div className="ml-4 text-right">
                            <p className="text-xs text-gray-500">Current Value</p>
                            <p className="font-mono text-sm font-semibold">
                              {suggestion.currentValue}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-green-600" />
                  <h4 className="font-semibold text-green-900">Quick Tuning Tips</h4>
                </div>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Edit weights in the "Weight Configuration" tab</li>
                  <li>• Worker picks up changes automatically next cycle</li>
                  <li>• Monitor impact in "24h Health Monitor" tab</li>
                  <li>• Set Grafana alerts at ±25% outside healthy bands</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Configuration Sections - show when weights tab is active */}
        {monitoringView === 'weights' && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
} 