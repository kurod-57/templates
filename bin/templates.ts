#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { CiCdFrontStack } from '../lib/cicd-front-stack';
import { RepositoryStack } from '../lib/repository-stack';
import { FrontStack } from '../lib/front-stack';

const app = new App();

const projectName = app.node.tryGetContext('projectName');
const stages = app.node.tryGetContext('stage').split(',')
console.log('stages:' + stages)

/**
  * 各スタック名は以下の通り
  * リポジトリ: {projectName} + '-Repository'
  * s3: {projectName} + '-' + {stage} + "-s3Stack"
  * cicd: {projectName} + '-' + {stage} + "-CiCdStack"
  */
const repositoryStack = new RepositoryStack(app, projectName + "-Repository", projectName);
for (const stage of stages) {
    new CiCdFrontStack(app,
                  projectName + '-' + stage + '-CiCdStack',
                  projectName,
                  stage,
                  repositoryStack.repository.repositoryName,
                  new FrontStack(app, projectName + '-' + stage + "-s3Stack",
                  projectName,
                  stage
    ))
}
app.synth();
