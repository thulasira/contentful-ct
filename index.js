const express = require('express');
const bodyParser = require('body-parser');
const { ClientBuilder } = require('@commercetools/sdk-client-v2');

const app = express();
app.use(bodyParser.json());

const projectKey = 'dxp-global';
const client = new ClientBuilder()
  .withClientCredentialsFlow({
    host: 'https://api.europe-west1.gcp.commercetools.com',
    projectKey,
    credentials: {
      clientId: 'fH9eWYnw8KmabjlNh-q35rEu',
      clientSecret: 'DwLBMJhGmbKpXK75H4oCcrlHUZtXycna',
    },
  })
  .withProjectKey(projectKey)
  .build();

// Middleware to handle incoming webhook from Contentful
app.post('/contentful-webhook', async (req, res) => {
  const { sys, fields } = req.body;
  
  if (sys.type === 'Entry' && sys.publishedVersion) {
    try {
      // Prepare product data for CommerceTools
      const productData = {
        name: { en: fields.name['en-US'] },
        slug: { en: fields.slug['en-US'] },
        productType: {
          typeId: 'product-type',
          id: '346f4d9f-2ac3-4d4f-8517-a90a3e238361', // Product type ID in CommerceTools
        },
        masterVariant: {
          sku: fields.sku1['en-US'],
          prices: [
            {
              value: {
                currencyCode: 'USD',
                centAmount: fields.price['en-US'] * 100,
              },
            },
          ],
        },
      };

      // Create a new product in CommerceTools
      const response = await client.execute({
        uri: `/products`,
        method: 'POST',
        body: productData,
      });

      console.log('Product created in CommerceTools:', response);
      res.status(200).send('Product created successfully');
    } catch (error) {
      console.error('Error creating product in CommerceTools:', error);
      res.status(500).send('Failed to create product');
    }
  } else {
    res.status(400).send('Unsupported webhook event');
  }
});

app.listen(3000, () => {
  console.log('Webhook receiver is running on port 3000');
});
