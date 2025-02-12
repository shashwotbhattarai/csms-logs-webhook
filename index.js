const express = require('express');
const app = express();
const port = 3000;

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    white: '\x1b[37m'
};

// Middleware to parse JSON bodies
app.use(express.json());

// Utility function to format OCPP message
function formatOcppMessage(messageStr) {
    try {
        const message = JSON.parse(messageStr);
        const [messageTypeId, messageId, action, payload] = message;
        
        const messageTypes = {
            2: 'REQUEST',
            3: 'RESPONSE',
            4: 'ERROR'
        };

        return {
            type: messageTypes[messageTypeId] || 'UNKNOWN',
            messageId,
            action,
            payload: payload || message[2]
        };
    } catch (e) {
        return null;
    }
}

// Get block color based on message type
function getBlockColor(formattedMessage) {
    if (!formattedMessage) return colors.white;
    
    if (formattedMessage.type === 'REQUEST') return colors.blue;
    if (formattedMessage.type === 'RESPONSE') {
        if (formattedMessage.payload?.status === 'Accepted') return colors.green;
        return colors.red;
    }
    if (formattedMessage.type === 'ERROR') return colors.red;
    
    return colors.white;
}

// Format the entire webhook payload
function formatWebhookLog(body) {
    const timestamp = new Date().toISOString();
    const lines = [''];
    
    // Determine block color
    let blockColor = colors.white;
    let formattedMessage = null;
    
    if (body.event === 'message') {
        formattedMessage = formatOcppMessage(body.message);
        blockColor = getBlockColor(formattedMessage);
    }
    
    // Add separator
    lines.push(blockColor + '╔════════════════════════════════════════════════════════════');
    lines.push(`║ TIME: ${timestamp}`);
    lines.push(`║ STATION: ${body.stationId}`);
    lines.push(`║ EVENT: ${body.event.toUpperCase()}`);
    
    // Format based on event type
    if (body.event === 'connected' || body.event === 'disconnected') {
        lines.push('║ ');
        lines.push(`║ Connection Status: ${body.event.toUpperCase()}`);
    }
    else if (body.event === 'message') {
        lines.push(`║ ORIGIN: ${body.origin.toUpperCase()}`);
        lines.push('║ ');
        
        if (formattedMessage) {
            lines.push(`║ Message Type: ${formattedMessage.type}`);
            lines.push(`║ Message ID: ${formattedMessage.messageId}`);
            if (formattedMessage.action) {
                lines.push(`║ Action: ${formattedMessage.action}`);
            }
            lines.push('║ Payload:');
            lines.push(`║ ${JSON.stringify(formattedMessage.payload, null, 2)}`
                .split('\n')
                .map(line => `║   ${line}`)
                .join('\n'));
        } else {
            lines.push(`║ Raw Message: ${body.message}`);
        }
    }
    
    // Add closing separator
    lines.push('╚════════════════════════════════════════════════════════════' + colors.reset);
    lines.push('');
    
    return lines.join('\n');
}

// Webhook endpoint
app.post('/webhook', (req, res) => {
    const formattedLog = formatWebhookLog(req.body);
    console.log(formattedLog);
    res.status(200).send('OK');
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Start server
app.listen(port, () => {
    console.log('\n╔════════════════════════════════════════════════════════════');
    console.log('║ WEBHOOK SERVER');
    console.log(`║ Listening at http://localhost:${port}`);
    console.log(`║ Webhook endpoint: http://localhost:${port}/webhook`);
    console.log('╚════════════════════════════════════════════════════════════\n');
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});