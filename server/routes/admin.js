// Add API usage endpoint for admin pricing dashboard
router.get('/api-usage', requireAdmin, async (req, res) => {
  try {
    // Calculate API usage based on pitch activity (2.5 API calls per pitch on average)
    const pitches = await prisma.pitch.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: {
        id: true,
        createdAt: true,
        status: true
      }
    });

    const totalPitches = pitches.length;
    const avgCallsPerPitch = 2.5; // GPT calls for analysis, review, and optimization
    const dailyCalls = Math.round(totalPitches * avgCallsPerPitch);
    
    // Realistic cost estimation (GPT-3.5: $0.002/1K tokens, GPT-4: $0.03/1K tokens)
    // Assume 70% GPT-3.5, 30% GPT-4, avg 800 tokens per call
    const avgTokensPerCall = 800;
    const totalTokens = dailyCalls * avgTokensPerCall;
    
    const gpt35Calls = Math.round(dailyCalls * 0.7);
    const gpt4Calls = Math.round(dailyCalls * 0.3);
    
    const gpt35Cost = (gpt35Calls * avgTokensPerCall * 0.002) / 1000;
    const gpt4Cost = (gpt4Calls * avgTokensPerCall * 0.03) / 1000;
    const dailyCost = gpt35Cost + gpt4Cost;
    
    // Calculate yesterday's data for comparison
    const yesterdayStart = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const yesterdayPitches = await prisma.pitch.findMany({
      where: {
        createdAt: {
          gte: yesterdayStart,
          lt: yesterdayEnd
        }
      }
    });
    
    const yesterdayCalls = Math.round(yesterdayPitches.length * avgCallsPerPitch);
    const callsChange = yesterdayCalls > 0 ? 
      Math.round(((dailyCalls - yesterdayCalls) / yesterdayCalls) * 100) : 0;
    
    // Mock error rate (would be calculated from actual API logs)
    const errorRate = Math.random() * 2; // 0-2% error rate
    
    const apiUsageData = {
      dailyCalls,
      dailyCost,
      avgTokensPerCall,
      totalTokens,
      callsChange,
      gpt4Calls,
      gpt4Cost,
      gpt35Calls,
      gpt35Cost,
      errorRate,
      lastUpdated: new Date().toISOString()
    };

    res.json(apiUsageData);
  } catch (error) {
    console.error('Error fetching API usage data:', error);
    res.status(500).json({ error: 'Failed to fetch API usage data' });
  }
}); 