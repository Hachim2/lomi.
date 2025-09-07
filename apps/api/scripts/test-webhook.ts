import axios, { AxiosError } from 'axios';
import 'dotenv/config';
import * as crypto from 'crypto';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const API_KEY = process.env.INTERNAL_API_KEY || '';
const TEST_API_KEY = process.env.TEST_API_KEY || '';
const LIVE_API_KEY = process.env.LIVE_API_KEY || '';

// Function to verify webhook signatures
function verifySignature(payload: any, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  hmac.update(payloadString);
  const digest = hmac.digest('hex');
  return digest === signature;
}

// Create API client with API key authentication
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
  }
});

async function testWebhooks() {
  try {
    console.log('Testing Webhook API...');

    // 1. List webhooks
    console.log('\n1. Listing webhooks...');
    const listResponse = await api.get('/v1/webhooks');
    console.log(`Found ${listResponse.data.data.length} webhooks`);

    // 2. Create a webhook
    console.log('\n2. Creating a new webhook...');
    const createResponse = await api.post('/v1/webhooks', {
      url: `https://webhook.site/${Date.now()}`,
      description: 'Test webhook',
      authorized_events: [
        'PAYMENT_SUCCEEDED',
        'PAYMENT_FAILED'
      ]
    });
    
    const webhook = createResponse.data.data;
    console.log(`Created webhook with ID: ${webhook.id}`);
    console.log(`Webhook secret: ${webhook.secret}`);

    // 3. Get the webhook
    console.log(`\n3. Getting webhook ${webhook.id}...`);
    const getResponse = await api.get(`/v1/webhooks/${webhook.id}`);
    console.log(`Retrieved webhook: ${getResponse.data.data.url}`);

    // 4. Update the webhook
    console.log(`\n4. Updating webhook ${webhook.id}...`);
    const updateResponse = await api.patch(`/v1/webhooks/${webhook.id}`, {
      description: 'Updated test webhook',
      authorized_events: [
        'PAYMENT_SUCCEEDED',
        'PAYMENT_FAILED',
        'REFUND_COMPLETED'
      ]
    });
    console.log(`Updated webhook events: ${updateResponse.data.data.events.join(', ')}`);

    // 5. Test the webhook
    console.log(`\n5. Testing webhook ${webhook.id}...`);
    const testResponse = await api.post(`/v1/webhooks/${webhook.id}/test`);
    console.log(`Test webhook response: ${JSON.stringify(testResponse.data)}`);

    // 6. Simulate a webhook delivery with signature verification
    console.log(`\n6. Simulating webhook delivery with signature verification...`);
    
    // Sample payload that would be sent to a webhook endpoint
    const webhookPayload = {
      event_type: 'PAYMENT_SUCCEEDED',
      created_at: new Date().toISOString(),
      data: {
        id: `pmt_${Date.now()}`,
        amount: 5000,
        currency: 'XOF',
        status: 'succeeded'
      }
    };
    
    // Generate a signature using the webhook secret
    const signature = crypto.createHmac('sha256', webhook.secret)
      .update(JSON.stringify(webhookPayload))
      .digest('hex');
    
    console.log(`Generated signature: ${signature}`);
    
    // Verify the signature (simulating what the receiving server would do)
    const isValid = verifySignature(webhookPayload, signature, webhook.secret);
    console.log(`Signature verification result: ${isValid ? 'Valid' : 'Invalid'}`);
    
    // 7. Test environment-specific API keys
    if (TEST_API_KEY && LIVE_API_KEY) {
      console.log('\n7. Testing environment-specific API keys...');
      
      // Create API clients with test and live API keys
      const testApi = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': TEST_API_KEY
        }
      });
      
      const liveApi = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': LIVE_API_KEY
        }
      });
      
      // Test the test API key
      console.log('Testing with TEST API key...');
      try {
        const testKeyResponse = await testApi.get('/v1/webhooks');
        console.log(`Test environment flag: ${testKeyResponse.data.data.environment === 'test' ? 'Present' : 'Missing'}`);
        console.log(`Test flag: ${testKeyResponse.data.data.test === true ? 'Present' : 'Missing'}`);
      } catch (error) {
        console.error('Error testing TEST API key:', (error as AxiosError).response?.data || (error as Error).message);
      }
      
      // Test the live API key
      console.log('Testing with LIVE API key...');
      try {
        const liveKeyResponse = await liveApi.get('/v1/webhooks');
        console.log(`Live environment flag: ${liveKeyResponse.data.data.environment === 'live' ? 'Present' : 'Missing'}`);
        console.log(`Live test flag: ${liveKeyResponse.data.data.test === undefined ? 'Correctly absent' : 'Incorrectly present'}`);
      } catch (error) {
        console.error('Error testing LIVE API key:', (error as AxiosError).response?.data || (error as Error).message);
      }
    } else {
      console.log('\n7. Skipping environment-specific API key tests (keys not provided)');
    }

    // 8. Delete the webhook
    console.log(`\n8. Deleting webhook ${webhook.id}...`);
    const deleteResponse = await api.delete(`/v1/webhooks/${webhook.id}`);
    console.log(`Webhook deleted with status: ${deleteResponse.status}`);

    console.log('\nWebhook API test completed successfully!');
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.error('Error testing webhooks:', axiosError.response?.data || axiosError.message);
    } else {
      console.error('Error testing webhooks:', (error as Error).message);
    }
  }
}

// Run the test
testWebhooks().catch((error: unknown) => {
  console.error('Error running test:', (error as Error).message);
  process.exit(1);
}); 