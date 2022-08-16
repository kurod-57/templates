import { App, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

const PREFIX = 'kurod';


export class FrontStack extends Stack {
    public readonly distribution: cloudfront.CloudFrontWebDistribution;
    public readonly bucket: s3.Bucket;
    constructor(scope: Construct, id: string, projectName: string, stage: string, props?: StackProps) {
        super(scope, id, props);

        console.log("*****************S3Stack START*****************")

        // プロジェクト名をcontextから取得
        console.log('ProjectName：' + projectName);

        // バケット名を設定
        const bucketName= PREFIX + '-' + stage + '-' + projectName
        console.log('BucketName：' + bucketName);

        // バケットを生成
        this.bucket = new s3.Bucket(this, stage + '-pjBucket', {
            bucketName: bucketName,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        });

        // OAIを設定
        const oai = new cloudfront.OriginAccessIdentity(this, bucketName)

        // バケットポリシーを生成
        const bucketPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:GetObject"],
            principals: [
                new iam.CanonicalUserPrincipal(
                    oai.cloudFrontOriginAccessIdentityS3CanonicalUserId
                ),
            ],
            resources: [this.bucket.bucketArn + "/*"],
        })
        this.bucket.addToResourcePolicy(bucketPolicy)

        console.log('stage:' + stage);
        console.log('in dev,stg,prd:' + (['dev', 'stg', 'prd'].indexOf(stage)));

        // CloudFrontFunctionsの定義
        // Basic認証が不要な場合、basicAuthFunctionの指定をしない
        if (['dev', 'stg'].indexOf(stage) != -1) {
            const basicAuthFunction = new cloudfront.Function(
                this,
                stage + '-BasicAuthFunction',
                {
                    functionName: bucketName + '-BasicAuth',
                    code: cloudfront.FunctionCode.fromFile({
                        filePath: "lambda/BasicAuth/" + stage + "-auth.js",
                    }),
                }
            );
            this.distribution = this.createCloudFront(stage, this.bucket, oai, basicAuthFunction)
        } else if (stage == 'prd') { // 本番のみBasic認証しない
            this.distribution = this.createCloudFront(stage, this.bucket, oai)
        }

        console.log("s3Bucket.bucketArn：" + this.bucket.bucketArn)
        console.log("distribution.distributionId" + this.distribution.distributionId)

        console.log("*****************S3Stack END*****************")
    }

    //****************************************************/
    // CLoudFrontディストリビューションの作成
    //****************************************************/
    private createCloudFront(stage: string, s3Bucket: s3.Bucket, oai: cloudfront.OriginAccessIdentity, basicAuthFunction?: cloudfront.Function) {
        console.log("create CloudFront");
        console.log("basicAuthFunction:" + basicAuthFunction);
        if (basicAuthFunction) {
            return new cloudfront.CloudFrontWebDistribution(this, stage + '-Distribution', {
                viewerCertificate: {
                    aliases: [],
                    props: {
                        cloudFrontDefaultCertificate: true,
                    },
                },
                priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
                originConfigs: [
                    {
                        s3OriginSource: {
                            s3BucketSource: s3Bucket,
                            originAccessIdentity: oai,
                        },
                        behaviors: [
                            {
                                isDefaultBehavior: true,
                                functionAssociations: [
                                    {
                                        eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
                                        function: basicAuthFunction
                                    },
                                ],
                                minTtl: Duration.seconds(0),
                                maxTtl: Duration.days(365),
                                defaultTtl: Duration.days(1),
                                pathPattern: "*",
                            },
                        ],
                    },
                ],
                errorConfigurations: [
                    {
                        errorCode: 403,
                        responsePagePath: "/error_403.html",
                        responseCode: 200,
                        errorCachingMinTtl: 0,
                    },
                    {
                        errorCode: 404,
                        responsePagePath: "/error_404.html",
                        responseCode: 200,
                        errorCachingMinTtl: 0,
                    },
                ],
            });
        }else{
            return new cloudfront.CloudFrontWebDistribution(this, stage + '-Distribution', {
                viewerCertificate: {
                    aliases: [],
                    props: {
                        cloudFrontDefaultCertificate: true,
                    },
                },
                priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
                originConfigs: [
                    {
                        s3OriginSource: {
                            s3BucketSource: s3Bucket,
                            originAccessIdentity: oai,
                        },
                        behaviors: [
                            {
                                isDefaultBehavior: true,
                                minTtl: Duration.seconds(0),
                                maxTtl: Duration.days(365),
                                defaultTtl: Duration.days(1),
                                pathPattern: "*",
                            },
                        ],
                    },
                ],
                errorConfigurations: [
                    {
                        errorCode: 403,
                        responsePagePath: "/error_403.html",
                        responseCode: 200,
                        errorCachingMinTtl: 0,
                    },
                    {
                        errorCode: 404,
                        responsePagePath: "/error_404.html",
                        responseCode: 200,
                        errorCachingMinTtl: 0,
                    },
                ],
            });
        }
    }
}
