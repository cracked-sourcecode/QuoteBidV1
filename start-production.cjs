#!/usr/bin/env node

// Simple production starter that runs all services with better logging
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting QuoteBid Production Services...');

// Define services to start
const services = [
  {
    name: 'API',
    command: 'node',
    args: ['dist/index.js'],
    color: '\x1b[32m', // Green
  },
  {
    name: 'WebSocket',
    command: 'node', 
    args: ['dist/wsServer.js'],
    color: '\x1b[34m', // Blue
  },
  {
    name: 'Worker',
    command: 'node',
    args: ['dist/pricingWorker.js'], 
    color: '\x1b[33m', // Yellow
  }
];

const reset = '\x1b[0m';
const processes = [];

function startService(service) {
  console.log(`${service.color}[${service.name}]${reset} Starting...`);
  
  const proc = spawn(service.command, service.args, {
    stdio: 'pipe',
    env: { ...process.env }
  });
  
  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.log(`${service.color}[${service.name}]${reset} ${line}`);
    });
  });
  
  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.log(`${service.color}[${service.name}] ERROR${reset} ${line}`);
    });
  });
  
  proc.on('close', (code) => {
    console.log(`${service.color}[${service.name}]${reset} Exited with code ${code}`);
    if (code !== 0) {
      console.log(`❌ ${service.name} service failed, shutting down all services`);
      processes.forEach(p => {
        if (p && !p.killed) {
          p.kill();
        }
      });
      process.exit(1);
    }
  });
  
  proc.on('error', (error) => {
    console.log(`${service.color}[${service.name}] STARTUP ERROR${reset} ${error.message}`);
  });
  
  return proc;
}

// Start all services
services.forEach(service => {
  const proc = startService(service);
  processes.push(proc);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down all services...');
  processes.forEach(proc => {
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
  });
  setTimeout(() => {
    process.exit(0);
  }, 5000);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  processes.forEach(proc => {
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
  });
  setTimeout(() => {
    process.exit(0);
  }, 5000);
});

console.log('✅ All services started. Press Ctrl+C to stop.'); 