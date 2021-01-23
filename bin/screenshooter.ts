#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { ScreenshooterStack } from '../lib/screenshooter-stack';

const app = new cdk.App();
new ScreenshooterStack(app, 'ScreenshooterStack');
