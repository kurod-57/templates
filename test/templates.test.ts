import { Template } from 'aws-cdk-lib/assertions';
import { App } from 'aws-cdk-lib';
import * as CiCdFrontStack from '../lib/cicd-front-stack';
import * as FrontStack from '../lib/front-stack'
import * as RepositoryStack from '../lib/repository-stack'

test('Empty Stack', () => {
    const app = new App();
    // WHEN
    const stack = new CiCdFrontStack.CiCdFrontStack(app, 'TEST-CiCdStack', 'TEST', 'dev',
      'TEST',
      new FrontStack.FrontStack(app, 'TEST-s3Stack', 'TEST', 'dev'));
    const template = Template.fromStack(stack);
    // THEN
    template.templateMatches({
        "Resources": {}
    })
});
