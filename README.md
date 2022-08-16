# templates
CDKのテンプレート集
組み合わせで色々な環境を作れるようにテンプレートを増やしていく予定

bin/tempates.ts
に必要なスタックの組み合わせを実装することで欲しい環境を作成する。

例)
以下コードでcodecommitのリポジトリ、デプロイ先のS3 + CloudFront環境（Basic認証付き）、CI/CDパイプラインを作成する。
```
const repositoryStack = new RepositoryStack(app, projectName + "-Repository", projectName);
for (const stage of stages) {
    new CiCdStack(app,
                  projectName + '-' + stage + '-CiCdStack',
                  projectName,
                  stage,
                  repositoryStack.repository.repositoryName,
                  new s3Stack(app, projectName + '-' + stage + "-s3Stack",
                  projectName,
                  stage
    ))
}
```


# 各テンプレートについて

## repository-stack.ts

CodeCommitリポジトリを生成するためのテンプレートです。

## cicd-stack.ts

CI/CD を構築するためのテンプレートです。
現状、front-stack.tsで構築したフロント向けの構成であり、バックエンド向け等、パターンを増やしていく予定。

## s3-stack.ts

S3 + CloudFrontでホスティングするための構成です。  
S3はパブリックアクセスをブロックし、CloudFront経由でのアクセスのみとしています。  
また、stg,dev環境はBasic認証が適用されます。  
Basic認証はCloudFrontFunctionを用いており、```lambda/BasicAuth/{stage}-auth.js```の内容が適用されます。  
そのため、関数内の```authString```には都度違った文字列を直接設定して運用する必要があります。（ここはそのうち改善したい）

## 実行コマンド

- `yarn build` TypeScript を JavaScript へビルド
- `yarn deploy {PJ_Name} {STAGES} {PROFILE}` TypeScript からビルドしたスタックを profile で指定した AWS 環境へデプロイ（ビルドも含め実行）

{PJ_Name}はデプロイ先のAWS環境で一意とする事。  
{STAGES}は、'dev','stg','prd'を必要なステージだけカンマ区切りで指定する。  
{PROFILE}はAWSのcredentialsに登録済みの、デプロイ対象のAWSのprofileを指定。
