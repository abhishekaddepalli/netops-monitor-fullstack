/**
 * NetOps Monitor - Remote Node Agent
 * 
 * Usage:
 *   node netops-agent.js --url=https://your-monitor.com --key=YOUR_NODE_KEY
 * 
 * Requirements:
 *   - Node.js v14 or higher
 *   - No NPM dependencies required (uses built-in http/https/child_process modules)
 */

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const { URL } = require('url');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, value] = arg.split('=');
    if (key.startsWith('--')) acc[key.slice(2)] = value;
    return acc;
}, {});

const BASE_URL = args.url;
const NODE_KEY = args.key;

if (!BASE_URL || !NODE_KEY) {
    console.error('Error: Missing required arguments.');
    console.error('Usage: node netops-agent.js --url=http://your-monitor.com --key=NODE_KEY');
    process.exit(1);
}

const JOBS_ENDPOINT = `${BASE_URL.replace(/\/$/, '')}/api/v1/agent/jobs?key=${NODE_KEY}`;
const RESULTS_ENDPOINT = `${BASE_URL.replace(/\/$/, '')}/api/v1/agent/results?key=${NODE_KEY}`;

let monitors = [];
let resultsQueue = [];
let runningIntervals = {};

console.log(`[NetOps Agent] Starting up...`);
console.log(`[NetOps Agent] Target URL: ${BASE_URL}`);

// Utility to make HTTP requests
function request(urlStr, options = {}, postData = null) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(urlStr);
        const lib = parsedUrl.protocol === 'https:' ? https : http;
        
        const req = lib.request(urlStr, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);

        if (postData) {
            req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
        }
        req.end();
    });
}

// Fetch assigned monitors from the central server
async function syncJobs() {
    try {
        const data = await request(JOBS_ENDPOINT);
        if (data && data.jobs) {
            monitors = data.jobs;
            scheduleChecks();
        }
    } catch (err) {
        console.error(`[Error] Failed to sync jobs: ${err.message}`);
    }
}

// Perform HTTP check
async function checkHttp(monitor) {
    const start = Date.now();
    try {
        await request(monitor.target, { method: 'GET', timeout: (monitor.timeout_seconds || 30) * 1000 });
        const time = Date.now() - start;
        return { result: 'up', response_time_ms: time };
    } catch (err) {
        const time = Date.now() - start;
        return { result: 'down', response_time_ms: time, error_message: err.message };
    }
}

// Perform Ping check
function checkPing(monitor) {
    return new Promise((resolve) => {
        const start = Date.now();
        const host = new URL(monitor.target).hostname || monitor.target;
        const isWin = process.platform === 'win32';
        const cmd = isWin ? `ping -n 1 -w ${(monitor.timeout_seconds || 30) * 1000} ${host}` : `ping -c 1 -W ${monitor.timeout_seconds || 30} ${host}`;
        
        exec(cmd, (err) => {
            const time = Date.now() - start;
            if (err) {
                resolve({ result: 'down', response_time_ms: time, error_message: 'Ping failed' });
            } else {
                resolve({ result: 'up', response_time_ms: time });
            }
        });
    });
}

// Perform TCP Port check
function checkPort(monitor) {
    return new Promise((resolve) => {
        const start = Date.now();
        const net = require('net');
        const host = monitor.target.replace(/^https?:\/\//, '').split('/')[0];
        
        const socket = new net.Socket();
        socket.setTimeout((monitor.timeout_seconds || 30) * 1000);
        
        socket.on('connect', () => {
            socket.destroy();
            resolve({ result: 'up', response_time_ms: Date.now() - start });
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ result: 'down', response_time_ms: Date.now() - start, error_message: 'Connection timed out' });
        });
        
        socket.on('error', (err) => {
            resolve({ result: 'down', response_time_ms: Date.now() - start, error_message: err.message });
        });
        
        socket.connect(monitor.port, host);
    });
}

// Execute a single check and queue the result
async function executeCheck(monitor) {
    let resultData;
    
    if (monitor.type === 'http' || monitor.type === 'keyword') {
        resultData = await checkHttp(monitor);
    } else if (monitor.type === 'ping') {
        resultData = await checkPing(monitor);
    } else if (monitor.type === 'port') {
        resultData = await checkPort(monitor);
    } else {
        return; // heartbeat monitors are pushed by clients
    }

    resultsQueue.push({
        monitor_id: monitor.id,
        ...resultData
    });
    
    console.log(`[Checked] Monitor #${monitor.id} (${monitor.target}) -> ${resultData.result} (${resultData.response_time_ms}ms)`);
}

// Schedule intervals for all assigned monitors
function scheduleChecks() {
    // Clear old intervals
    Object.values(runningIntervals).forEach(clearInterval);
    runningIntervals = {};
    
    console.log(`[NetOps Agent] Scheduling ${monitors.length} active monitors...`);
    
    monitors.forEach(monitor => {
        if (monitor.type === 'heartbeat') return; // Cannot pull heartbeats
        const intervalMs = (monitor.check_interval_seconds || 60) * 1000;
        
        // Run immediately
        executeCheck(monitor);
        
        // Then loop
        runningIntervals[monitor.id] = setInterval(() => {
            executeCheck(monitor);
        }, intervalMs);
    });
}

// Push results to central server
async function submitResults() {
    if (resultsQueue.length === 0) return;
    
    const payload = [...resultsQueue];
    resultsQueue = []; // Clear queue
    
    try {
        await request(RESULTS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { results: payload });
    } catch (err) {
        console.error(`[Error] Failed to submit results: ${err.message}`);
        // Push back to queue on failure
        resultsQueue = [...resultsQueue, ...payload];
    }
}

// Startup
syncJobs();
setInterval(syncJobs, 60000); // Sync new monitors every 60s
setInterval(submitResults, 5000); // Push results every 5s

console.log(`[NetOps Agent] Agent running. Waiting for jobs...`);
