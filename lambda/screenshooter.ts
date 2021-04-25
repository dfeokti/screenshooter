import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda';
const chromium = require('chrome-aws-lambda');
import { S3 } from 'aws-sdk';

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
) => {
  console.log(event);
  const s3 = new S3();
  const bucket = process.env.BUCKET_NAME as string;
  const distUrl = process.env.DIST_URL as string;
  const url = event.queryStringParameters?.url as string;
  const timeout = event.queryStringParameters?.timeout as string;
  const parsedUrl = new URL(url);

  const fileName = `${parsedUrl.hostname}_${new Date().toISOString()}.png`;

  let browser = null;
  let fileUrl = '';
  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();
    await page.goto(url);
    if (timeout) {
      await page.waitForTimeout(parseInt(timeout));
    }
    const screenshot = await page.screenshot();
    const res = await s3
      .upload({
        Bucket: bucket,
        Key: fileName,
        Body: Buffer.from(screenshot as string, 'base64'),
        ContentType: 'image/png',
      })
      .promise();
    console.log(res);
    fileUrl = `https://${distUrl}/${fileName}`;
  } catch (err) {
    console.log(err);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
  return {
    statusCode: 200,
    body: JSON.stringify(fileUrl),
  };
};
