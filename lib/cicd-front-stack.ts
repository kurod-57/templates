import * as path from'path';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codePipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild';
import { FrontStack } from './front-stack';
import { RepositoryStack } from './repository-stack';

const PREFIX = 'kurod';


/**
 * CI/CDスタックの作成
 * アーティファクト用のバケットを作成し、マネージドの鍵を設定する。
 * CodeBuildで各リポジトリのbuildspecを実行するよう設定。（デフォルトこうなる？）
 */
export class CiCdFrontStack extends Stack {
    constructor(scope: Construct, id: string, projectName: string, stage: string, repositoryName: string, s3Stack: FrontStack, props?: StackProps) {
        super(scope, id, props);
        console.log("*****************CI/CDStack START*****************")

        console.log('ProjectName：' + projectName);

        // タグを作成
        const tag: string = projectName;

        const targetBucket = s3Stack.bucket;
        console.log("targetBucket：" + targetBucket);
        const repoName = projectName;

        // プロジェクトを作成
        const project = this.createProject(stage, tag, s3Stack)

        // アーティファクトを作成
        const sourceOutput = new codepipeline.Artifact();
        const buildOutput = new codepipeline.Artifact();

        // 対象ブランチ（prd：main, dev：develop, stg：staging）
        let branch;
        if (stage == 'dev') {
            branch = 'develop';
        } else if (stage == 'stg') {
            branch = 'staging';
        } else {
            branch = 'main'
        }

        new codepipeline.Pipeline(this, this.createId('Pipline', stage, tag), {
            pipelineName: this.createName(stage, tag),
            artifactBucket: this.createArtifactBucket(stage, tag),
            stages: [{
                stageName: 'Source',
                actions: [
                    this.createSourceAction(repositoryName, branch, sourceOutput)
                ],
            },
            {
                stageName: 'Build',
                actions: [
                    this.createBuildAction(project, sourceOutput, buildOutput)
                ]
            },
            {
                stageName: 'Deploy',
                actions: [
                    this.createDeployAction(targetBucket, buildOutput)
                ]
            }]
        })
        console.log("*****************CI/CDStack END*****************")
    }

    //**************************************************** */
    // idの生成（tag + name + stage)
    //**************************************************** */
    private createId(name: string, stage: string, tag: string): string {
        return tag + '-' + name + '-' + stage;
    }

    //**************************************************** */
    // 名前の生成（stage + tag)
    //**************************************************** */
    private createName(stage: string, tag: string): string {
        return stage + '-' + tag
    }

    //**************************************************** */
    // アーティファクトバケットの生成（stage + tag)
    //**************************************************** */
    private createArtifactBucket(stage: string, tag: string): s3.IBucket {
        const bucketName = PREFIX + '-' + tag + '-cicdstack-' + stage + '-' + 'artifact'
        const bucket = new s3.Bucket(this, stage + '-pjBucket', {
            bucketName: bucketName,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.KMS,
            encryptionKey: kms.Alias.fromAliasName(this, stage + 'ArtifactKey', 'alias/aws/s3'),
            bucketKeyEnabled: false
        });
        return bucket;
    }

    //**************************************************** */
    // プロジェクトの生成
    // デフォルトロールで作成 : デフォルトで問題でたら検討
    //**************************************************** */
    private createProject(stage: string, tag: string, s3Stack: FrontStack): codebuild.PipelineProject {
        const accountId = Stack.of(this).account;
        const project = new codebuild.PipelineProject(this, this.createId('Project', stage, tag), {
            projectName: this.createName(stage, tag),
            environment: {
                buildImage: LinuxBuildImage.AMAZON_LINUX_2_3,
                computeType: codebuild.ComputeType.SMALL,
            },
            environmentVariables: {
                STAGE: { value: stage },
                PROJECT_NAME: {value: tag},
                CLOUDFRONT_DISTRIBUTION_ID: { value: s3Stack.distribution.distributionId },
                S3_BUCKET_NAME: { value: s3Stack.bucket.bucketName },
            },
        });
        project.role?.addToPrincipalPolicy(
            new iam.PolicyStatement({
                actions: [
                    "s3:*"
                ],
                resources: [s3Stack.bucket.bucketArn]
            })
        )
        project.role?.addToPrincipalPolicy(
            new iam.PolicyStatement({
                actions: [
                    "cloudfront:CreateInvalidation"
                ],
                resources: ["arn:aws:cloudfront::" + accountId + ":distribution/" + s3Stack.distribution.distributionId]
            })
        )
        return project
    }

    //**************************************************** */
    // CodePipelineのソースアクション（CodeCommit）の生成
    //**************************************************** */
    private createSourceAction(repositoryName: string, branch: string, output: codepipeline.Artifact): codePipeline_actions.CodeCommitSourceAction {
        return new codePipeline_actions.CodeCommitSourceAction({
            actionName: 'Source',
            repository: codecommit.Repository.fromRepositoryName(this, 'repository', repositoryName),
            branch: branch,
            output: output
        });
    }
    //**************************************************** */
    // CodePipelineのビルドアクション（CodeBuild）の生成
    //**************************************************** */
    private createBuildAction(project: codebuild.IProject, input: codepipeline.Artifact, output: codepipeline.Artifact) {
        return new codePipeline_actions.CodeBuildAction({
            actionName: 'Build',
            project: project,
            input: input,
            outputs: [output],
        });
    }

    //**************************************************** */
    // CodePipelineのデプロイアクションの生成
    //**************************************************** */
    private createDeployAction(targetBucket: IBucket, input: codepipeline.Artifact) {
        return new codePipeline_actions.S3DeployAction({
            actionName: 'Deploy',
            bucket: targetBucket,
            input: input
        });
    }
}
