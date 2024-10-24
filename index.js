require('dotenv').config(); // Load environment variables from a .env file
const express = require('express');
const axios = require('axios');
const { Console } = require('console');

const app = express();
app.use(express.json());

// Function to get the access token
const getCommerceToolsAccessToken = async () => {
  try {
    const response = await axios.post(
      'https://auth.europe-west1.gcp.commercetools.com/oauth/token', // Replace with your region-specific URL
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: `manage_project:${process.env.COMMERCETOOLS_PROJECT_KEY}`, // Replace with your project key
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.COMMERCETOOLS_CLIENT_ID}:${process.env.COMMERCETOOLS_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    // Return the access token from the response
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching access token:', error.response ? error.response.data : error.message);
    throw new Error('Failed to get access token');
  }
};

// Webhook endpoint to create a product
app.post('/contentful-webhook', async (req, res) => {
  const { sys, fields } = req.body;

  // Validate request payload
  if (sys && sys.name) {
    console.log("as",fields.name['en-US']);
    try {
      // Fetch the access token
      const accessToken = await getCommerceToolsAccessToken();

      // Prepare product data for CommerceTools
      const productData = { 
        name: { en: fields.name['en-US'] },
        slug: { en: fields.slug['en-US'] },
        productType: {
          typeId: 'product-type',
          id: '346f4d9f-2ac3-4d4f-8517-a90a3e238361' // Example Product type ID in CommerceTools
        },
        name: { "en-US": fields.name['en-US']},
        slug: { "en-US": fields.slug['en-US']},
        masterVariant: {
          sku: fields.sku1['en-US'],
          prices: [
            {
              value: {
                currencyCode: "USD",
                centAmount: (fields.price['en-US'] * 100 ), // Default to 15 USD
              },
            },
          ],
        },
      };

      // Send product data to CommerceTools
      const response = await axios.post(
        `https://api.europe-west1.gcp.commercetools.com/${process.env.COMMERCETOOLS_PROJECT_KEY}/products`,
        productData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Respond with success message
      res.status(200).json({ message: 'Product created successfully', data: response.data });
    } catch (error) {
      // Handle errors
    
      console.error('Error creating product:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: 'Failed to create product' });
    }
  } else {
    res.status(400).json({ error: 'Invalid data: name is required' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
