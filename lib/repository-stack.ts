import * as path from'path';
import { App, Stack, StackProps,
         aws_codecommit as codecommit } from 'aws-cdk-lib';
import { Construct } from 'constructs';


/**
 * Repositoryスタックの作成
 * アーティファクト用のバケットを作成し、マネージドの鍵を設定する。
 * CodeBuildで各リポジトリのbuildspecを実行するよう設定。（デフォルトこうなる？）
 */
export class RepositoryStack extends Stack {
    public readonly repository: codecommit.Repository
    constructor(scope: Construct, id: string, projectName: string, props?: StackProps) {
        super(scope, id, props);

        console.log("*****************RdpositoryStack START*****************")

        // プロジェクト名をcontextから取得
//        const projectName = this.node.tryGetContext('projectName');
        console.log('ProjectName：' + projectName);

        // タグを作成
        const tag: string = projectName;

        // PJ名でリポジトリを作成する
        const repoName = projectName;
        this.repository = new codecommit.Repository(this, 'pjRepo', {
            repositoryName: repoName,
            description: 'repository',
            code: codecommit.Code.fromDirectory(path.join(__dirname, 'assets'))
        });
        console.log("*****************RepositoryStack END*****************")
    }
}
