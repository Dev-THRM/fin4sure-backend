export const verifyWebhook = (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    // Make sure to define WEBHOOK_VERIFY_TOKEN in your .env file
    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;

    if (mode && token) {
      if (mode === 'subscribe' && token === verifyToken) {
        console.log('WEBHOOK_VERIFIED');
        return res.status(200).send(challenge);
      } else {
        return res.status(403).json({ success: false, message: 'Verification failed' });
      }
    }
    
    // 2. Generic success if no specific verification token is required in the query
    return res.status(200).json({ success: true, message: 'Webhook endpoint is active and ready' });
  } catch (error) {
    console.error('Webhook verification error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const receiveWebhook = (req, res) => {
  try {
    const payload = req.body;
    
    // Log the payload to see what you're receiving
    console.log('Webhook payload received:', JSON.stringify(payload, null, 2));

    // TODO: Add your custom logic here to process the payload
    // e.g., update database, notify user, etc.

    // Acknowledge receipt of the webhook to the provider
    // Important: Always return 2xx quickly to prevent the provider from retrying
    return res.status(200).json({ success: true, message: 'Webhook received successfully' });
  } catch (error) {
    console.error('Webhook receive error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
