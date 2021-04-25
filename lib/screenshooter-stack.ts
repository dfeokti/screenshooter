import * as cdk from '@aws-cdk/core';
import * as apigwv2 from '@aws-cdk/aws-apigatewayv2';
import * as lambdaNode from '@aws-cdk/aws-lambda-nodejs';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigwv2int from '@aws-cdk/aws-apigatewayv2-integrations';
import * as s3 from '@aws-cdk/aws-s3';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';

export class ScreenshooterStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //https://github.com/alixaxel/chrome-aws-lambda#aws-lambda-layer
    const layer = new lambda.LayerVersion(this, 'screenshooterLayer', {
      code: lambda.Code.fromAsset('./chrome-aws-lambda/chrome-aws-lambda.zip'),
    });

    const httpApi = new apigwv2.HttpApi(this, 'screenshooterApi', {
      corsPreflight: {
        allowHeaders: ['*'],
        allowMethods: [apigwv2.CorsHttpMethod.GET],
        allowOrigins: ['*'],
      },
    });

    const bucket = new s3.Bucket(this, 'screenshooterBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const distribution = new cloudfront.Distribution(
      this,
      'schreenshooterDist',
      {
        defaultBehavior: {
          origin: new origins.S3Origin(bucket),
        },
      }
    );

    const screenshooter = new lambdaNode.NodejsFunction(
      this,
      'screenshooterHandler',
      {
        runtime: lambda.Runtime.NODEJS_12_X,
        entry: `${__dirname}/../lambda/screenshooter.ts`,
        handler: 'handler',
        memorySize: 2048,
        timeout: cdk.Duration.minutes(1),
        bundling: {
          externalModules: ['aws-sdk', 'chrome-aws-lambda'],
        },
        layers: [layer],
        environment: {
          BUCKET_NAME: bucket.bucketName,
          DIST_URL: distribution.domainName,
        },
      }
    );

    const integration = new apigwv2int.LambdaProxyIntegration({
      handler: screenshooter,
    });

    httpApi.addRoutes({
      path: '/screenshot',
      methods: [apigwv2.HttpMethod.GET],
      integration: integration,
    });

    bucket.grantWrite(screenshooter);
  }
}
